# Phase 5: connection pooling and response compression

Date: 2026-09-22. Scope: repository inspection, bounded anonymous HTTP probes,
one targeted cache-policy hardening, and regression tests. No production writes,
environment modifications, migration, import, deployment, push or Phase 6 work.
All uncommitted Phase 0-4 work is preserved.

## Outcome

Existing Prisma reuse and platform compression do not justify replacement.
Vercel compression is verified on public responses. Production Neon pooling,
capacity and deployment regions remain unverified; no pool/region tuning was
performed. Do not interpret completion of this code phase as production sign-off.

The sole application change adds the existing `private, no-store` policy to
explicit 401/404 responses from both GET and POST of the grading-status route.
Success, 429 and handled 503 paths already had private/no-store policies. The
live anonymous 401 previously had `public, max-age=0, must-revalidate`, not an
explicit private policy. This is defensive isolation of authorization decisions,
not evidence that another user's grading data was exposed. Response bodies,
status codes, ownership checks, retry behavior and scoring are unchanged.

## 1. Verified repository architecture

| Area | Evidence | Assessment |
| --- | --- | --- |
| Datasource | `prisma/schema.prisma` uses PostgreSQL, `url = env("DATABASE_URL")`, `directUrl = env("DIRECT_URL")` | Runtime and Prisma CLI administration have separate URL roles |
| Client | `src/lib/prisma.ts` exports one client per loaded production module; development caches it on globalThis | No new client per HTTP request; separate serverless instances still have separate pools |
| Telemetry | Same client reports only query duration to Phase 0 when enabled | Keep existing utility; this is not a connection-count or acquisition-time metric |
| Authentication | `src/auth.ts` uses the shared client | No auth client or query changes |
| Worker | `scripts/process-grading-jobs.ts` imports the same client, reuses it across batches, disconnects in final cleanup | No client per job and no per-job disconnect |
| Administrative scripts | Cleanup, regrade and audio import have process-scoped clients with final disconnect | Separate script processes are legitimate; do not force a global cross-process singleton |
| Lifecycle limit | Worker finally cleanup covers normal return/errors; no new signal/shutdown handling introduced | No claim that SIGKILL or every container shutdown executes finally |
| Versions | Installed Prisma Client 6.19.3, Next 15.5.25, Node 24.14.0 locally; worker Docker image Node 20 | No package or image changes |

Prisma CLI migration commands use `DIRECT_URL` through `directUrl`; ordinary
Prisma Client scripts, including the audio importer, still use `DATABASE_URL`.
The fact that a script is administrative does not automatically make it use
the direct URL.

`vercel.json` runs migration, build, then the audio importer. That command was
NOT executed. Only `npm run build` (plain Next build) ran with process-local
dummy loopback DB URLs. `railway.json` selects `Dockerfile.grading-worker`,
ON_FAILURE restart with 10 retries; it does not run an HTTP server. There is
no Railway HTTP API to which compression middleware should be added.

## 2. Pooling and capacity: verified versus missing

The deployment guide already recommends Neon pooled runtime `DATABASE_URL`
and direct `DIRECT_URL` for migrations. No runtime URL override, pool manager
or explicit `connection_limit`/`pool_timeout` is set in application code.

A redacted inspection of local files found a non-Neon DATABASE_URL and DIRECT_URL
in `.env`, with no explicit connection_limit, pool_timeout or connect_timeout;
`.env.local` contains neither database variable. This describes only local
files, NOT Vercel/Railway effective environment or production pooling. No
connection strings, credentials or host identifiers were printed.

No authenticated provider connector or Vercel/Railway CLI was available. Browser
inventory failed because its authentication token was unavailable. Thus live
dashboard configuration/metrics could not be inspected. Public HTTP access
does not prove DB connectivity or which DB endpoint a deployment uses.

Pending verification, independently for Vercel and Railway:

- Runtime endpoint is the intended Neon pooled endpoint and database/branch.
- CLI direct endpoint points at that same database/branch, with required TLS.
- Effective pool size, queue timeout, connect timeout and prepared-statement
  compatibility match the actual Prisma/Neon deployment. Do not add a PgBouncer
  compatibility flag or change URLs merely from a generic example.
- Peak Vercel instance count, Railway replicas and Neon compute/client/backend
  limits, including preview deployments or administrative jobs sharing compute.
- Active/idle connections, pool wait, DB errors and cold-start/warm latency.

Capacity model, not measured capacity:

`peak runtime client connections <= Vercel instances * web pool limit + worker replicas * worker pool limit + script/admin clients`

Neon pooler client connections and PostgreSQL backend connections are different
budgets. Multiplexing does not remove active transaction or server capacity
limits. No actual numeric capacity can be calculated from the repository alone.
Prisma engine defaults apply where URLs do not override them; local CPU-based
defaults must not be assumed to equal serverless/container effective limits.

Worker facts: default 2 concurrent jobs, configurable 1-8; batch claims are
sequential and claimed jobs are processed concurrently. Worker/lease heartbeats
are 15 seconds, lease 90 seconds, worker-stale threshold 60 seconds. Heartbeats
and checkpoint transactions share the process pool. A pool that queues too long
can endanger lease renewal; a larger pool can exhaust backend capacity. Neither
raising nor lowering limits is justified without measurements.

`src/lib/grading-service.ts` fences checkpoint writes in transactions; AI work
is outside those transactions. `src/lib/gamification.ts` uses a repeatable-read
leaderboard transaction. These semantics and job acquisition/lease/checkpoint
behavior are retained. Mocks verify regressions, not live PgBouncer transaction
compatibility.

## 3. Regions

No Vercel function region, Railway service region or Neon compute region is
declared in the inspected repository configuration. No live region was verified.
An edge response location is not proof of function or DB location. Historical
screenshots are not used as current infrastructure evidence.

Approval-gated recommendation: inspect actual function, worker and Neon regions
and compare DB round trips before considering co-location. Do not migrate a DB
or change runtime regions automatically. No cross-region latency claim is made.

## 4. Live compression observations

Eighteen anonymous GETs against `https://we-win-vstep.vercel.app`, one request
per path/encoding, sequential fresh connections, no cookies, no auth, no
redirect following. The script retained response bytes only in memory and
printed allowlisted headers/counts/timings, never bodies or Set-Cookie.

| Live path | Status | Identity body bytes | Gzip body bytes | Brotli body bytes |
| --- | ---: | ---: | ---: | ---: |
| `/legal/privacy` | 200 | 43,431 | 8,360 | 8,630 |
| `/api/auth/providers` (public provider metadata) | 200 | 230 | 134 | 110 |
| `/history` (anonymous response only) | 200 | 35,651 | 6,446 | 6,828 |
| `/api/vocabulary/entries?mode=notebook` | 404 HTML | 7,797 | 2,293 | 2,424 |
| `/api/manage/materials/list` | 405 | 0 | 0 | 0 |
| `/api/exams/attempts/phase5-probe/grade` | 401 | 76 | 76 | 76 |

Decoded sizes for gzip/br match the respective identity body sizes. Large HTML
already compresses effectively. These are encoded response-body byte counts,
not complete HTTP/TLS transfer size or browser ResourceTiming transferSize.
Do not compare local and live sizes as a before/after optimization: revisions,
hostnames and serving layers differ. Brotli need not beat gzip in every sample.

HTML responses above had `private, no-cache, no-store, max-age=0, must-revalidate`.
Providers and the grading 401 had `public, max-age=0, must-revalidate`, Vercel MISS.
The missing vocabulary route returned a public revalidated 404 with Vercel HIT;
it is not a successful notebook response or proof of notebook-data caching.
Most Content-Length headers were absent (streamed response); script counts bytes
instead. Content-Type distinguished JSON, HTML errors and empty 405 responses.

Live Vary retained Next RSC/router fields but did not advertise Accept-Encoding
in these samples. The tested Vercel origin nevertheless negotiated distinct
valid representations. No header overwrite was introduced. Before adding a
third-party shared proxy, verify that its encoding cache key/variant handling
is correct. Public-response testing does not certify all intermediaries.

Live vocabulary 404/materials 405 differ from the new local handlers' 401 JSON:
production does not expose these routes like the current worktree. No release
commit or precise deployment mismatch cause was inferred from HTTP alone.
Authenticated pagination/payload measurement must wait for an approved staging
deployment of this revision.

Only one sample per variant: HTML privacy TTFB was 1,591 ms identity versus
486/466 ms gzip/br. Cold/warm/server/network differences prevent attributing
this timing difference to compression. There is no meaningful p50/p95 or
before/after latency improvement claim.

## 5. Local production build and payload/security assessment

Built and started Next locally with an unreachable dummy DB, localhost binding,
no real session. The same 18 probes observed:

- Privacy HTML: 42,669 bytes identity, 11,026 gzip; br-only remained identity.
  Next added Accept-Encoding to Vary for compressed HTML. This is consistent
  with existing Next gzip, not evidence of missing Vercel Brotli.
- Small public providers JSON (210 bytes) remained uncompressed locally.
- Vocabulary and materials anonymous 401 JSON already use private/no-store.
- Grading anonymous 401 now uses private/no-store, body remains 76 bytes.
  GET/POST 404 and invalid/missing-auth paths are also covered by handler tests.

Local/remote anonymous `/history` returned streamed HTML status 200. A Next
redirect can be expressed in streamed HTML; this was not authenticated history
data, and the status alone is not evidence of an authorization bypass.

`next.config.ts` does not disable compression; installed Next defaults set
`compress: true`. Live responses demonstrate Vercel's gzip/br layer. Adding
custom compression would duplicate platform behavior. No media compression,
global Cache-Control/Vary changes or new shared cache was added. Compression
does not replace authorization; enabling compression on new secret/reflected
payloads needs separate side-channel review. This phase does not broaden it.

Previous-phase payload bounds remain:

| Module | Existing bound/selection | Decision |
| --- | --- | --- |
| `src/lib/exam-history.ts` | 21 selected metadata rows -> 20 displayed; user-filtered | No new history JSON API; measure authenticated HTML/RSC on staging |
| `src/lib/materials-page.ts` | 21 rows -> 20 items, selected metadata plus grouped counts | No file bytes/Blob URLs in list; preserve fields used by admin UI |
| `src/lib/vocabulary-page.ts` | 31-row lookahead, at most 30 returned; scoped counts/cursors | Notebook user isolation retained; count-only refresh retained |
| `src/lib/gamification.ts` | Top 10, optional current user, selected id/name/xp | No duplicate leaderboard optimization |
| `src/lib/practice.ts` | Bounded 20 papers, selected objective part data | No measured response waste justifies contract changes |
| Grading status route + `src/lib/grading-jobs.ts` | Owned attempt, public grading projection/progress | No field removals; final/partial reports are consumed by UI |

No authenticated successful API payload sizes, cross-account live isolation or
real grading transactions were measured. Anonymous denials and mock ownership
tests are explicitly narrower evidence. Server-generated unhandled-error
responses and all other routes were not globally hardened in this phase.

## 6. Verification and reproduction

Executed:

- TypeScript passed (`npx tsc --noEmit`).
- ESLint passed (`npm run lint`).
- Full tests with all four browser flags: 168 passed in 24 files.
- `npm run build` passed with dummy local DB URLs; `npx prisma validate` passed.
- Local production HTTP probe: 18 responses. Live anonymous probe: 18 responses.
- New probe mock test confirms gzip/br byte accounting and no credential/body
  output. New Prisma mock test confirms dev reload and production module reuse.
- Existing pagination, submission, grading ownership/lease/checkpoint tests ran;
  no real worker was started against production.

First full test run overlapped the build and two browser tests failed because
Next temporarily removed `.next/static/css`. After build completion, all 168
passed. Run build BEFORE browser tests that consume built CSS, not concurrently.
Expected dummy-DB build warning and existing Prisma/Vite deprecation warnings
remain. No unrelated test harness/config refactoring was added.

Reproduce from `D:\hanbee`:

```powershell
# Complete a safe isolated build first, following Phase 4's procedure.
$env:EXAM_BROWSER_QA='1'
$env:VOCABULARY_BROWSER_QA='1'
$env:MATERIALS_BROWSER_QA='1'
$env:HISTORY_BROWSER_QA='1'
npm run test:unit
npx tsc --noEmit
npm run lint
node scripts/phase-5-http.mjs https://we-win-vstep.vercel.app
# For an already-running isolated local production build:
node scripts/phase-5-http.mjs http://127.0.0.1:3105
```

The probe makes fixed anonymous GETs, enforces 15-second per-request deadlines,
caps encoded bodies at 2 MiB and decoded bodies at 8 MiB, and does not forward
cookies or follow redirects. It is a diagnostic, not a load test. Do not add
cookies/tokens to command-line arguments or export HAR/body data. The local
server started for verification was stopped afterwards.

## 7. Approval-gated completion of production verification

1. Open authenticated Neon/Vercel/Railway dashboards. Record only pooled/direct
   classification, same-branch check, safe numeric limits and region names.
   Do not copy connection strings into tickets or logs.
2. Collect existing Neon connection/compute metrics, errors and queue waits;
   Vercel instance/duration metrics; Railway replicas and worker health.
   Separate client-pool capacity from database backend capacity.
3. Reuse `PERF_BASELINE_SAMPLE_RATE` and
   `scripts/performance-baseline-report.ts` on approved staging. At least 100
   comparable samples are needed before treating its p95 as useful evidence.
   Phase 0 query duration does not isolate connection acquisition latency.
4. On an approved staging deployment, test two accounts, paginated private
   responses, submissions and job persistence. Record headers/byte counts,
   not answers, audio, transcripts, SQL parameters or raw traces.
5. Propose a specific pool/region change only if measurements show exhaustion,
   waits or avoidable cross-region latency. Apply only with explicit approval,
   then compare equivalent traffic/compute/cache conditions and validate leases.

No infrastructure change was implemented, so there is no before/after pooling
or latency improvement to report. The observed compression savings already
existed. The cache-policy change is tested locally and is NOT deployed.

## Files changed in Phase 5

1. `src/app/api/exams/attempts/[attemptId]/grade/route.ts` - four explicit error headers.
2. `tests/grading-status-route.test.ts` - GET/POST error-policy regressions.
3. `tests/phase-5-infrastructure.test.ts` - client lifecycle and safe probe tests.
4. `scripts/phase-5-http.mjs` - bounded anonymous header/size diagnostic.
5. `docs/phase-5-infrastructure.md` - this report.

Intentionally unchanged: Prisma/schema, Next/Vercel/Railway configuration,
pool sizes, regions, worker concurrency, grading models/prompts and API schemas.
Ponytail Full: retain working platform capabilities; no Redis, dependency,
custom pool manager, extra proxy or compression middleware.
