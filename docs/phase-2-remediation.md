# Phase 2 post-review remediation

## Scope

Fix the four confirmed review findings only. No dependency, schema, deployment
configuration, authentication policy, production data, or visual redesign changes.
The existing uncommitted Phase 0/1/2 work is preserved. Nothing is deployed or
pushed, and Phase 3 is not started.

## Findings and fixes

| Finding | Root cause | Remediation |
| --- | --- | --- |
| Flashcard refresh skips a page / changes the active word | New props replaced rows without resetting cursors or reconciling the index | Reconcile rows, cursors and active stable ID together before rendering children. Abort obsolete page requests on source/scope change. Ignore obsolete mutation completions and navigation continuations. |
| Empty flashcard session leaves scrolling locked | Removal clamped the index to zero even with no rows; modal rendering and scroll-lock state disagreed | Use a real current card to determine modal state, close empty sessions, and restore scrolling and focus in cleanup. Fall back to the surviving list region if the opener was removed. |
| Notebook count refresh reloads rows | The board fetched the regular entries response and discarded the entries | Add a counts-only option to the existing authenticated, private/no-store endpoint. Cancel superseded requests and ignore older count responses. |
| Materials mutation refreshes the router twice | Both the material callback and RecordActions called router.refresh | Let RecordActions own router refresh for edits/deletes/publication. Upload owns its single router refresh. The parent refreshes the filtered list separately because the server-rendered summary and client-filtered list have distinct responsibilities. |

On source refresh, an active ID still present in the incoming page stays active,
including its flipped state. If it is absent, close instead of showing an
unrelated word at the old index. Preserve the saved ID/cursor in the same scope
so Học tiếp can use the existing authorized resume endpoint. A changed account
or collection scope resets the in-memory resume state.

Materials refresh replays only the previously visible number of pages, starting
with a fresh cursor and the current filters. It does not collapse an expanded
list after a mutation. Changing filters still starts at the first page. Each
page remains bounded by the existing 20-row API; no new list endpoint is added.

## Files changed in this remediation

- `src/components/vocabulary/VocabularyFlashcards.tsx`
- `src/components/vocabulary/VocabularyNotebookBoard.tsx`
- `src/app/api/vocabulary/entries/route.ts`
- `src/components/manage/LearningMaterialUploadForm.tsx`
- `tests/vocabulary-page.test.ts`
- `tests/vocabulary-browser.test.ts`
- `tests/materials-browser.test.ts` (new)
- `docs/phase-2-remediation.md` (new)

RecordActions and the materials mutation endpoints were inspected and exercised
but did not need code changes. Other dirty files predate this remediation.

## Verification

Run browser fixtures after a local build; vocabulary fixtures reuse built CSS.
Use PowerShell in the repository:

```powershell
$env:VOCABULARY_BROWSER_QA = '1'
$env:MATERIALS_BROWSER_QA = '1'
npm run test:unit
npx tsc --noEmit
npm run lint
```

The executed suite passed 138 tests across 21 files, with one unrelated optional
Phase 1 history-browser test skipped. Materials and vocabulary browser fixtures
both ran. They use real React components in Chromium with mocked APIs, not live
accounts, storage or database writes. Their Vite caches are separate so parallel
fixture servers do not interfere with each other's dependency optimization.

Regression coverage includes:

- Load 60 words, refresh, load again, and verify all 60 IDs without duplicates.
- Preserve the active ID across reordering; resume an ID absent from the initial
  refreshed page; prevent delayed pre-refresh pages from corrupting the list.
- Close during a pending boundary request without reopening the dialog; isolate
  a changed user scope; preserve reverse navigation and circular endpoints.
- Remove the current/final card and exclude the final card through a status
  filter; restore scroll and focus; close via Escape/button; clean up on unmount.
- Update notebook counts after progress/removal without fetching a full page.
- Reject guest counts requests, ignore a supplied foreign userId, retain private
  cache headers, and verify exactly two count calls and zero row-list calls.
- Create/edit/delete/publish/unpublish materials, keep search/skill filters and
  40 visible items, refresh the router once, continue to the remaining page,
  preserve rows on errors, and retry a failed list request.

TypeScript, ESLint, and the production build were executed successfully. Prisma
schema validation passed. The build and validation use temporary process-local
DATABASE_URL and DIRECT_URL values pointing to an unreachable local test port,
not production credentials. No environment files are edited. Build output has an
expected database-unavailable message from the vocabulary catalogue fallback.
This verifies compilation/build behavior, not real database connectivity.

Do not run the Vercel buildCommand for this verification: it includes a migration
and an audio import. Only `npm run build` (next build) and `npx prisma validate`
are needed, with the safe local connection override described above.

## Measured bounds and limitations

- Notebook count refresh: two business-data count reads, zero list reads,
  versus the former two count reads plus two list reads. Authentication reads
  are unchanged. This is a verified call-count reduction, not a measured
  production latency improvement.
- Materials: one router refresh per successful mutation instead of two for
  edit/delete/publication. A list with two visible pages makes two distinct
  bounded page requests in its single refresh cycle; these are not duplicate
  requests. Server summary refresh remains necessary.
- Browser tests mock Next router.refresh; they count invocations but do not
  constitute end-to-end Next RSC, Neon, Blob or Vercel deployment tests.
- Counts and pages are live reads, not a cross-request snapshot. Concurrent
  changes in another tab/user session may require a refresh, as before. If a
  count request fails, saved progress remains valid and counts refresh on the
  next successful count/list request.
- No production p50/p95 timing, query plan, or network-payload benchmark is
  claimed. No migration, seed, production mutation, push or deployment ran.
