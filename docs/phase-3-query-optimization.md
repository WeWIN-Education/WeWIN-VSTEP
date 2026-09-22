# Phase 3: bounded query results and safe caching assessment

## Scope and evidence

Only `src/lib/practice.ts`, `src/lib/gamification.ts`,
`tests/phase-3-queries.test.ts` and this report change in Phase 3. All existing
Phase 0/1/2 changes are preserved. No deployment, production data access, schema
migration, dependency, UI, authentication or grading change is included.

Before editing the two functions, the fixture tests ran against their original
implementation from HEAD `dfb021d`. They confirmed unbounded ORM result sizes.
This establishes a result-size/scaling problem on controlled data, NOT a measured
production latency incident. Docker Desktop's database engine was unavailable;
no live PostgreSQL query plan, actual production dataset size, or staging timing
was available. No unsafe load tests or production EXPLAIN ANALYZE ran.

## Before / after measurements

These are executed mock-backed ORM measurements on identical generated data.
Bytes mean UTF-8 JSON serialization of the returned fixture values, not PostgreSQL
wire bytes, browser payload size, or process heap usage. Read counts mean Prisma
method invocations and exclude transaction control and relation-query SQL.

| Controlled case | Original | Phase 3 |
| --- | ---: | ---: |
| Leaderboard: 1,000 active learners, current user outside top ten; user rows returned | 1,000 | 11 |
| Leaderboard: serialized result bytes, including count result after change | 42,593 | 462 |
| Leaderboard: read method calls | 1 | 3 |
| Mixed practice: 200 papers, 80 valid questions per paper; peak paper rows in one result | 200 | 20 |
| Mixed practice: peak serialized batch bytes | 6,927,271 | 692,761 |
| Mixed practice: total serialized batch bytes | 6,927,271 | 6,927,282 |
| Mixed practice: read method calls | 1 | 11 |

Verified: much smaller leaderboard result size and smaller individual practice
batches. Expected: less application retention/allocation pressure at large bank
sizes. NOT established: faster SQL, faster APIs, lower p50/p95, reduced total
mixed-practice transfer, or exact peak process memory. Extra round trips can
increase latency, especially against a remote database.

## Mixed practice semantics

The old implementation expands published VSTEP paper JSON and part JSON into
valid Listening/Reading candidates. It reserves one uniformly shuffled question
per available skill when the requested size is at least two, then uniformly
selects the remainder and shuffles the final session. There is no difficulty
filter, progress weighting, fixed 50/50 quota, or learner-specific selection.

The replacement reads at most 20 papers per batch, ordered by unique ID with a
keyset boundary. It retains a size-K uniform reservoir of all candidates and
independent size-one reservoirs for each skill. Removing the skill anchors from
the global sample and uniformly taking K minus anchor-count entries preserves
the original distribution:

- Each anchor is uniform within its skill.
- Conditional on the anchors, the independent global sample is exchangeable
  over all remaining candidates. Removing at most two entries from a size-K
  sample leaves enough candidates; uniform downsampling is therefore a uniform
  remainder from the whole non-anchor population.
- Final order remains uniformly shuffled. Random number consumption differs;
  exact seed-to-session output is not claimed to match the old algorithm.
- For K=1, only the global reservoir is used. Empty/single-skill banks and
  sessions larger than the bank retain the previous behavior for valid limits.

Part precedence, legacy JSON fallback, answer-key precedence, invalid-answer,
empty-prompt and option-count filters are unchanged. IDs still include paper,
slug, skill and original question ID. As before, valid imported question IDs
must be unique within a paper/skill. No new deduplication that would reweight
malformed source content is introduced.

The authenticated `/review` gate is unchanged. The selected practice answers
still reach the existing client-side PracticePlayer for immediate feedback;
this was already true, and is not a secure server-graded exam mechanism. The
whole bank is not sent to that client. No progress or exam score is written.

A RepeatableRead transaction keeps the batch population consistent during a
session build. The read transaction has a 30-second bound; failure does not
return a partial or statistically biased session. Retention is proportional to
one batch, the largest paper's expanded candidates, and K+2 sampled references,
not all candidates. JSON bank scanning and total transfer remain O(bank size).

Trade-off: holding a connection for a scan and performing sequential batches can
worsen latency/pool occupancy. Representative staging measurement is required
before production rollout. A huge individual JSON paper is still huge. Do not
normalize the schema or implement custom SQL JSON sampling without evidence.

## Leaderboard semantics

Read only the top ten active LEARNER users ordered by XP descending, createdAt
ascending, ID ascending. Reuse the existing competition-ranking function for
those ten. When the requested user is not there, read that active learner alone
and calculate rank as 1 plus the number of eligible users with strictly greater
XP. Equal XP shares rank; createdAt/ID only determine display order.

Append the current learner only when outside the top ten. Inactive, missing,
teacher/admin accounts never get a rank. All reads share a RepeatableRead
snapshot so concurrent XP changes cannot mismatch the top list and rank count.
No persistent caching is applied. `getGamificationSummary`, daily visits,
streak writes and XP award logic remain untouched.

## Index review: deliberately no migration

| Area | Existing support | Decision |
| --- | --- | --- |
| ExamPaper filtering | programme/status index, unique programme/slug, primary ID | Keep. A programme/status/ID composite might help keyset scans but requires staging plans and actual cardinalities. |
| ExamPaperPart lookup | unique examPaperId/catalog | Keep; use existing bounded related-part reads. |
| Leaderboard | primary ID supports current-user lookup; no ranking composite | Do not add blindly. Investigate role/isActive/XP/createdAt/ID ordering and greater-XP count with real plans first. |
| Published learning content | kind/published/skill/createdAt composite, primary ID; catalog already takes 21 metadata rows | No measured justification for another index. Optional skill and ID sorting may need different plans at scale. |
| Vocabulary | unique collection/entryCode, collection/topic/level, term; scoped progress indexes | Preserve Phase 2 paging and indexes; no live evidence of index failure. |

New indexes incur storage/write/maintenance cost. No index or migration is
added, no seed/import is executed, and schema validation alone is not a query
plan measurement.

## Cache and invalidation decision

No persistent cache is introduced in this phase. This is deliberate under the
measurement gate, not a claim that React cache provides cross-request caching.
Existing React cache in access.ts and getGamificationSummary deduplicates a
server render only. Next.js 15's persistent data cache is available, but there
is no measured recurring metadata-query cost/hit rate to justify its lifecycle.

Candidates inspected:

- LearningContentCatalog: already selects only five metadata fields, at most 21
  rows, after authentication. Do not cache authorization or the complete page.
- Vocabulary collection/topic metadata: potentially shareable, but repeat-read
  frequency/cost is not measured. No entries/progress/notebook cache is added.
- Learning categories: static constants already need no database cache.
- Leaderboard and gamification: fresh personal data and visit side effects make
  whole-function persistent caching inappropriate.

Mutation paths reviewed for a possible future cache:

- Learning-content POST create/import, PUT edit/publish/unpublish, DELETE;
  optimistic conflicts and failed imports do not commit modifications.
- Learning audio PUT/DELETE and the deployment audio-bundle importer; the latter
  uses a standalone Prisma transaction, outside a Next request cache context.
- Vocabulary collection edit/delete and workbook import; imports can commit
  collection/topic changes before later work fails, so success-only invalidation
  of the entire import would be insufficient.
- Exam create/update/import/delete and visibility hide/restore. Mixed question
  content and private answer keys must not become a public cache payload.

With no new cache, no tag/TTL/invalidation hook is needed. Fresh query tests
verify publication changes, edits, deletions, XP/activity changes and account
switching are seen on subsequent calls. A concurrent unpublish cannot revoke an
already-running snapshot; subsequent sessions read the new publication state.
Existing revalidatePath calls are left intact. No authentication, notebook,
attempt, progress, audio, transcript, writing or AI result is cached publicly.

## Verification and reproduction

The focused suite adds 24 cases covering ranking sizes 0/1/7/10/11/100/1000,
ties, inactive/admin/missing users, outside-top-ten rank, fresh user state,
question limits/uniqueness, uneven and single-skill banks, legacy fallback,
publication changes, and a 12,000-session seeded distribution comparison against
the original shuffle algorithm and theoretical per-question probabilities.

```powershell
npx vitest run tests/phase-3-queries.test.ts --silent=false --reporter=verbose
npx tsc --noEmit
npm run lint
$env:HISTORY_BROWSER_QA = '1'
$env:MATERIALS_BROWSER_QA = '1'
$env:VOCABULARY_BROWSER_QA = '1'
npm run test:unit
```

Production build uses `npm run build` only, with process-local DATABASE_URL and
DIRECT_URL pointing to an unreachable loopback test port. The existing catalogue
fallback logs an expected DB-unavailable message; it does not prove connectivity.
Prisma validate uses the same safe override. Environment files and vercel.json
are unchanged. Never run the Vercel buildCommand for QA: it includes a production
migration and audio import.

The tests use mocked Prisma and browser APIs. They do not prove actual PostgreSQL
snapshot isolation, EXPLAIN plans, remote latency or Neon pool behavior. Existing
Phase 1/2 tests, content-management authorization/import tests and visit/streak
tests must remain green alongside the new suite.

Executed results on 2026-09-22: all 163 tests in 22 files passed with all three
optional browser suites enabled; no skipped tests. TypeScript, ESLint,
git diff --check, Next production build and Prisma validation passed. The build
had the expected isolated-database warning described above. Tooling also reports
existing Vite config-loader and Prisma package-configuration deprecation warnings.

## Staging measurement gate

Reuse Phase 0 `db.query` events via the existing Prisma client. In an explicitly
approved isolated staging window, set PERF_BASELINE_SAMPLE_RATE=1 on the process,
use the same database/data/network and compare one route at a time. Include
transaction control and related-table SQL in real query counts. Separate cold
and warm runs. Do not exercise dashboard GETs against production just to measure:
they can record visits.

Use the existing sanitized-log report:

```powershell
Get-Content .qa/before.jsonl | npx tsx scripts/performance-baseline-report.ts
Get-Content .qa/after.jsonl | npx tsx scripts/performance-baseline-report.ts
```

This reports query-duration distributions, not route p50/p95. Use existing
Vercel/Neon observations for route duration, plans, connection occupancy and real
row/wire sizes; measure process heap separately. At least 100 comparable samples
are needed before interpreting tails, and even then assess variance. There is
no claim of production p50/p95 improvement here. Add persistent caching or an
index only after those measurements support it.

No push/deploy occurred. Phase 4 is not started.
