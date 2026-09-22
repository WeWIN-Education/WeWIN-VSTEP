# Phase 4: JavaScript loading and React rendering

## Scope and environment

Implemented on 2026-09-22, preserving the uncommitted Phase 0-3 and Phase 2
remediation work. No dependency, database, environment-file, deployment,
authentication, authorization, grading-pipeline or API changes. No push/deploy.
Phase 5 and Phase 6 have not started.

Ponytail Full: two small production changes in `src/components/exam/ExamTake.tsx`.
Existing state, autosave, recording recovery and submission guards are reused.
No blanket memoization, new state library or new infrastructure.

Environment: Windows x64, Node 24.14.0, Next 15.5.25, React 19.1.1,
Playwright 1.63 Chromium headless. Browser fixtures use the real components
through Vite, React development Profiler, synthetic API responses and mocked
media. They do NOT measure Next server rendering or hydration. There is no
production database/API/AI call in these tests.

## Confirmed issues and changes

### Countdown

Before: ExamTake updated its own seconds state every second, re-running
`renderExamPart`, the Writing word count and unrelated header/footer rendering.
The countdown decremented a counter, so suspended timers could lag behind the
server's `expiresAt`.

After: the inline `ExamCountdown` component owns presentation updates. ExamTake
stores only the deadline, restored from the same server response as before.
Remaining seconds are calculated from the deadline and wall clock, not from
the number of ticks. A visibility event updates the display immediately.
The initial expiration check runs after parent effects have restored answer
and stage refs, including reloads of already-expired attempts. It invokes the
existing `submitExam` once per mounted countdown; that function's synchronous
guard still arbitrates manual submission versus timeout and flushes answers
and audio before submitting. A failed submit retains the existing manual retry
path, without a new automatic retry loop.

The UI/classes are unchanged. Ceiling rounding avoids submitting before the
deadline; interval scheduling can still be up to approximately one second
late while active. An entirely suspended browser cannot execute submission
until it resumes. The server remains authoritative. Invalid/missing expiry
uses the existing configured exam duration as a fallback; client wall-clock
skew has not been solved in this phase.

### Upload SDK

Before: a static `@vercel/blob/client` import made its chunk an initial exam
route dependency, even for Writing-only sessions or server-side upload mode.

After: native `import()` loads the existing SDK inside the direct-upload branch,
after recording and capability detection. Next's own bundler splits it; no
custom loader or prefetch infrastructure. Permission requests and MediaRecorder
initialization stay synchronous with the existing user-interaction chain.
The existing saving UI, catch/retry path and retained local audio cover upload
or chunk-loading errors. The first direct upload now has an additional chunk
fetch; this trades initial-page bytes for work at upload time, not elimination
of the SDK from total session bytes.

## Measurements

Same local worktree/dependencies/build command before and after; the baseline
production build was rebuilt before changing ExamTake. Source files changed
by prior phases were present in both builds.

| Measurement | Before | After | Interpretation |
| --- | ---: | ---: | --- |
| Exam route manifest JS, raw bytes | 582,134 | 462,519 | 119,615 bytes removed from initial route list |
| Exam route manifest JS, gzip bytes | 168,933 | 135,452 | 33,481 bytes / 19.8% smaller |
| Vocabulary collection route manifest JS, gzip bytes | 130,466 | 130,496 | +30 bytes in shared webpack runtime; no flashcard change |
| Exam content renders, 3.2 seconds idle | 3 | 0 | Countdown-only commits no longer render exam content |
| React commits, same idle window | 3 | 3 | Clock still updates; whole-tree commit count is not a speed metric |
| Idle Profiler actualDuration sum, development sample | 5.0 ms | 1.0-1.7 ms | Directional local samples, not a production latency claim |
| Writing content renders, 39 typed characters plus save wait | 44 | 42 | Removes clock-triggered work, not per-character state updates |
| Writing Profiler actualDuration sum, development samples | 63.3 ms | 57.1-72.7 ms | No demonstrated typing-speed improvement; noisy small samples |

The JS script sums `.next/app-build-manifest.json` page dependencies, including
shared chunks, and gzip-compresses each file with Node zlib. These are build
artifact sizes, NOT observed network transfer. Ancestor layout dependencies,
RSC/HTML payloads, cache warmth, browser decompression, network latency and
hydration time are not measured by this script. Route-specific and shared
filenames are printed to make the comparison auditable.

The browser fixture uses an actual React Profiler and a test-only counter in
`renderExamPart`. Profiler `actualDuration` measures rendering, not DOM commit
phase duration or end-to-end INP. The counter and profiler are not shipped in
the production application. Subsequent samples are written to ignored `.qa`
JSON files; sample timing varies with host load and concurrent tests.

## Investigated but deliberately unchanged

- Writing: one active textarea; simple whitespace word count. Continuous
  typing, debounce, both tasks, reload restoration and submitted answer payloads
  pass. No measured typing-speed benefit justifies moving answer state or
  introducing memoization and risking persistence.
- SpeakingSession: already owns its deadline-based preparation/recording timer.
  It remains eagerly available so starting microphone capture is not deferred.
- PersonalVocabularyModal: small existing component, no demonstrated large
  loading cost. No separate loading boundary added.
- Flashcards: pagination already bounds initial entries; later batches accumulate.
  Profiling a flip with 60 loaded synthetic entries recorded two development
  renders at 19.0 and 17.5 ms in one run. This is a staging-profiling candidate,
  not proof of a production bottleneck or benefit from memoization. Keep the
  Phase 2 ID/cursor/resume/account-scope/focus protections intact. No grid
  rewrite or pagination change.
- Result polling: keep visible 3-second / hidden 15-second scheduling, in-flight
  protection, abort/run guards, error recovery and terminal-state stopping.
  The fixture sees processing, a temporary 500, recovery and completion with
  no concurrent grading requests. Its tiny synthetic successful payloads are
  71/67 bytes, NOT production result sizes. No polling frequency or payload
  change; actual large result payload/render cost needs staging measurement.
- Next config/page boundaries: route code splitting/minification and existing
  loading boundaries are retained. No duplicate bundling or caching system.

## Verification

- `npm run test:unit` with all four browser flags: 164 tests in 23 files passed.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed.
- `npm run build`: passed before and after, using process-local dummy DB URLs.
- `npx prisma validate`: passed.
- `git diff --check`: passed (Windows LF/CRLF notices only).

Exam browser checks: start a Writing session and FULL preflight; continuous input
and debounce; switch tasks and Reading/Writing sections without answer loss;
reload both answers; manual submission with exact latest payload;
hidden-tab polling backoff; failed poll recovery and terminal stop; synchronous
microphone permission activation; start/stop mocked recording; playback hook;
direct upload failure retains audio; retry succeeds without re-recording;
wall-clock jump with no replayed interval ticks; one timeout submission;
already-expired reload flushes and submits restored answers.

Existing flashcard browser checks still exercise initial/incremental loading,
cross-page next/previous, refresh/resume by stable ID, stale fetch and scope
changes, flip, audio association, autoplay, progress marking, notebook removal,
final-card removal/filter exclusion, Escape/UI close, focus and scroll cleanup.
Materials/history/auth-related unit regressions run unchanged in the full suite.

Expected build warning: unreachable `127.0.0.1:1` for a static vocabulary read;
the existing fallback allows build completion. This intentional isolation
does not validate live Neon availability. Existing Vite config-loader and
Prisma package-config deprecation warnings remain; no unrelated config migration.

## Reproduce / compare

From `D:\hanbee` in PowerShell:

```powershell
$env:EXAM_BROWSER_QA='1'
$env:VOCABULARY_BROWSER_QA='1'
$env:MATERIALS_BROWSER_QA='1'
$env:HISTORY_BROWSER_QA='1'
npm run test:unit
npx tsc --noEmit
npm run lint
```

Outputs: `.qa/phase4-exam-after.json` and `.qa/phase4-flashcard.json`.
The optional `PHASE4_BASELINE=1` flag only skips new countdown assertions when
testing the pre-change source and labels that run `before`; it does NOT revert
the code. Do not use that flag when validating the optimized implementation.

In a separate shell, isolate the build from production:

```powershell
$env:DATABASE_URL='postgresql://phase4:phase4@127.0.0.1:1/phase4?connect_timeout=1'
$env:DIRECT_URL=$env:DATABASE_URL
npm run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
npx prisma validate
node scripts/phase-4-bundle.mjs
```

Do not run Vercel's migration/import build wrapper. Do not edit `.env`.
Use the same device, browser version, fixture, loaded-card count, cache policy
and CPU/network settings on both revisions. Run multiple samples sequentially;
compare medians before making an interaction-latency claim.

## Remaining production verification

Production hydration, actual transferred bytes, DOM commit cost, INP/CLS,
low-end mobile behavior, real microphone/codec playback, real Blob chunk/network
failure and large grading payloads have NOT been measured. Capture these on an
approved staging account with a production build and anonymized metrics before
further changes. The fixture does not replace a styled visual/layout audit or
real OS-level tab suspension. No promise of faster Writing typing is made.

## Files changed in this phase

1. `src/components/exam/ExamTake.tsx` - isolated countdown and deferred upload SDK.
2. `tests/exam-browser.test.ts` - new synthetic browser regression/profiler fixture.
3. `tests/vocabulary-browser.test.ts` - added test-only flip profiling; all earlier tests retained.
4. `scripts/phase-4-bundle.mjs` - build artifact comparison, Node built-ins only.
5. `docs/phase-4-client-performance.md` - this report and reproduction procedure.

Other dirty files belong to earlier phases and were not edited in Phase 4.
