# Phase 0: performance baseline

Scope: measurement only. No pagination, caching, schema, scoring, deployment,
or concurrency changes. No new dependency or telemetry endpoint.

## Safety and activation

Instrumentation is disabled by default. Set `PERF_BASELINE_SAMPLE_RATE` on an
explicitly approved measurement environment, then restart its web/worker process:

```powershell
$env:PERF_BASELINE_SAMPLE_RATE = '1'
npm run start
```

Use `1` for a short isolated staging session; `0.1` samples approximately 10%
of events in a longer observation window. Missing, zero or invalid values disable
logging. Restart after changing the setting (Prisma listeners are set at startup).
Do not edit deployment config or production environment as part of Phase 0.
For production, use existing Vercel/Neon/Railway observations until activation
is separately approved. Do not run a worker locally against production to measure it.

New logs have exactly `event`, an allowlisted `metric`, and `durationMs`.
They contain no SQL, parameters, URLs, IDs, credentials, answers or audio.
Sampling still incurs Prisma query-event overhead when enabled; compare a short
enabled/disabled staging run. Existing application logs are not sanitized by this
feature: do not export or share raw logs, HARs, traces or grading checkpoints.
Restrict log access and retention. Logger failures do not fail application work.

## Measurements already available

| Source | Collect | Interpretation |
| --- | --- | --- |
| Vercel logs/Observability | invocation duration, errors, region, cold/warm where available | Backend evidence; not browser TTFB or user interaction latency |
| Browser DevTools Network/Performance | TTFB, LCP, CLS, INP when available, long tasks, JS transfer/decoded bytes, request counts | Use a production build, same device/network and real interactions |
| React Profiler, if available | commits and expensive renders during countdown, typing, tab switching, results | Profiling/dev overhead is not production latency; corroborate with Performance traces |
| Neon monitoring/query diagnostics | active connections, query latency/frequency, rows, query plan where available | Use restricted console; never publish query text or parameter values |
| Existing v2 checkpoint telemetry | requestCount, token usage, durationMs by stage | Inspect only in an authorized environment; do not export whole checkpoint |
| Railway worker logs | queue processing, retries, failures, restart/health | Existing logs do not provide a complete end-to-end latency distribution |

Use existing features only if enabled/available on the account. Do not enable paid
monitoring, install an extension, or run EXPLAIN ANALYZE on production automatically.
Do not identify N+1 from Prisma `include` alone: use actual query counts in an
isolated staging request or the database diagnostics.

## New opt-in measurements

| Metric | Source | Boundary / limitation |
| --- | --- | --- |
| db.query | Existing Prisma query event duration | Prisma-reported query duration, not page duration; includes all query types. No route/model attribution or parameters |
| grading.examiner | Existing v2 telemetryDuration | Elapsed requestJson invocation, including semaphore waiting and retry delays |
| grading.reviewer | Same | Only emitted when this stage runs; do not count absent samples as zero |
| grading.repair | Same | JSON repair is separate from the conditional reviewer |
| grading.transcription | Same | Request invocation, not audio download/FFmpeg time |

Stage duration is emitted on success and failure, not only successful grading.
Examiner/reviewer distributions currently mix Speaking and Writing; use separate
controlled staging windows to compare them. There are deliberately no identifying
dimensions. Cached checkpoint stages do not execute again and produce no new sample.
The instrumentation does not change the checkpoint, retries, model or score.
Keep sample rate identical in comparisons. Sample counts are NOT request-per-page
counts or total traffic counts, especially when sampling is below 1.

## Collect a repeatable browser baseline

Use an existing staging account and representative staging data. Dashboard visits
can record activity, so even GET navigation is not guaranteed read-only. Do not
automate production navigation or create production attempts for this baseline.

Measure separately: Dashboard, History, Materials, Vocabulary topics/collocations/
notebook, Leaderboard, mixed practice, and an existing exam/result screen.
Record the following outside Git in `.qa/` (already ignored):

| Field | Required context |
| --- | --- |
| build | commit, Next/Node versions; production build, not dev server |
| route label | fixed label such as history, never a URL with user IDs/query values |
| cohort | guest/learner/admin; do not mix authorization gates with actual content |
| data scale | approximate record/deck counts; no actual content |
| environment | region, device, browser, network throttle, sample rate |
| cache state | cold vs warm browser cache; server cold start separately if known |
| navigation | hard load vs client-side navigation; redirects recorded separately |
| metrics | sample count, TTFB, LCP/INP/CLS, transferred JS, response bytes, errors |

In Network, measure the document for hard loads and the actual RSC requests for
client navigation. Record transfer size separately from decoded resource size;
cached resources may transfer zero bytes. Use realistic typing/tab/flashcard/result
interactions for INP; a page load alone is not an INP measurement. Do not disable
security, autosave, or authentication for the measurement.

Take repeated samples with identical conditions; keep cold and warm results
separate. Fewer than 100 samples is exploratory for tail latency, not proof of p95
improvement. Even 100 samples is not a confidence guarantee. Prefer naturally
accumulated observations over artificial load, especially for paid AI requests.

## Compare sanitized server logs

Extract only the JSON message objects whose `event` is `performance_baseline` from
the authorized log viewer/export. Platform wrappers/prefixes are not parsed by the
tool. Save the sanitized JSONL in `.qa/before.jsonl`, not a full log export.

```powershell
Get-Content -LiteralPath .qa/before.jsonl | npx tsx scripts/performance-baseline-report.ts
Get-Content -LiteralPath .qa/after.jsonl | npx tsx scripts/performance-baseline-report.ts
```

The offline report makes no network/DB calls. It outputs only allowlisted metrics,
sample count, nearest-rank p50/p95/max and a small-sample flag. Unknown/malformed
lines are counted and never echoed. No recognized samples means exit code 1;
check ignoredLines rather than interpreting an empty report as fast performance.
Use bounded observation windows: the small script holds durations in memory to
calculate exact quantiles; split very large exports rather than adding infrastructure.

Compare identical cohort/window/model/audio-duration buckets, error rates and
sample rates. Do not average percentiles or sum stage p95s to get end-to-end p95.
No speed improvement is claimed during Phase 0.

## Grading and DB follow-up measurements

Reuse existing authorized checkpoint metadata and worker status to establish queue
wait and overall grading duration, where timestamps are sufficient. For UI delay,
observe status requests and the moment the result renders in staging. Do not alter
polling or submit/retry a real user's attempt. Reuse existing grading fixtures with
mock AI for instrumentation tests; real model timing requires separately budgeted
staging calls and cannot establish grading accuracy on its own.

Missing independent spans: audio fetch, FFmpeg, semaphore wait, retry sleep,
checkpoint DB time and per-request query attribution. Current stage totals include
some of these but do not isolate them. First inspect the baseline; add a targeted
span only if needed to distinguish the dominant cost. Do not rewrite the pipeline.

## Validation and release boundary

Run unit tests, lint, TypeScript, Prisma validation and `npm run build`.
Never use the Vercel deployment build command for this local baseline: it includes
migrations and an audio import. To isolate build checks from production DB, use
process-local dummy DATABASE_URL/DIRECT_URL values, leaving .env files untouched.
The local build can verify compilation/static generation, not live database access.

Stop after Phase 0. Production activation, load/AI tests and Phase 1 require approval.

## Initial local build observation (2026-09-21)

Base commit `dfb021d` plus Phase 0 instrumentation; Node v24.14.0, Next 15.5.25.
The isolated `npm run build` completed (exit 0), compiled in 19.2 seconds and
generated 58 static pages. It logged an expected vocabulary DB connection failure
against the deliberately unreachable local endpoint; this is NOT a live-data test.

| Route | Next build First Load JS |
| --- | --- |
| dashboard | 124 kB |
| history / materials | 111 kB |
| vocabulary topics collection / collocations | 129 kB |
| vocabulary notebook | 131 kB |
| leaderboard | 108 kB |
| review | 123 kB |
| exam/[level]/[slug] | 169 kB |

Shared First Load JS: 103 kB. These are Next build estimates, not measured browser
transfer sizes, LCP or route latency. No production p50/p95, DB latency or real AI
latency was collected. Use the procedure above to establish those baselines.
