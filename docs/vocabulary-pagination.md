# Phase 2B: Vocabulary pagination

Independent of Materials. No schema, grading, cache, deployment, dependency,
vocabulary record or learning-progress reset. No production writes during QA.

## Files

- src/lib/vocabulary-page.ts
- src/app/api/vocabulary/entries/route.ts
- src/app/(main)/vocabulary/topics/[collection]/page.tsx
- src/app/(main)/vocabulary/collocations/page.tsx
- src/app/(main)/vocabulary/notebook/page.tsx
- src/components/vocabulary/VocabularyFlashcards.tsx
- src/components/vocabulary/VocabularyNotebookBoard.tsx
- tests/vocabulary-page.test.ts
- tests/vocabulary-browser.test.ts
- docs/vocabulary-pagination.md

## Query boundaries

Collection: entryCode ASC, id ASC; collection/topic and term/meaning search on server.
Collocations: term ASC, entryCode ASC, id ASC; preserves example search and kind.
Notebook: saved entries first, then personal entries, each updatedAt DESC/id DESC,
matching the previous two-list concatenation. Two bounded queries read at most 31
rows each, merge in source order, return 30 total. It does not sort both sources
into a new mixed chronological list. All private predicates include live userId.

Each source reads at most 31 projected rows (30 + lookahead). Only display/audio/
progress/order fields are selected, not notes, source spreadsheets or private
tags. Full notebook counts include personal words, use grouped counts scoped to
the user, and are not page lengths. Header counts refresh on navigation/reload;
notebook tab counts refresh after marking/removing. Counts and rows are live reads,
not an atomic snapshot. There is no persistent/public response cache.

Cursor scope hashes include user, mode, collection, topic, query and status. Values
are size/type checked, predicates are built from fixed field names; neither the
cursor nor an anchor ID grants access. The API ignores supplied userId and always
uses getCurrentUser. Responses are private, no-store. A malformed/foreign-scope
cursor starts from the authorized first page. Deleted anchors do not break normal
keyset queries. Live updatedAt changes may move unseen notebook rows to the front;
refresh/reopen the list to see moved records. No snapshot infrastructure added.

## Flashcards

The existing flashcard component loads the next 30 when within three cards of the
loaded boundary, or via Load More. It coalesces overlapping requests, deduplicates
IDs, aborts requests when scope unmounts and keeps current content on load failure.
Failures pause autoplay and offer retry through navigation/Load More.

Resume stores ID, cursor and flip state under a user + learning-scope key, rather
than the title/count-based index alone. An authenticated bounded anchor lookup
resolves the current order of the saved ID, so marking an updated notebook word
does not resume at a different word. Removed/out-of-filter anchors fall back to
the next eligible page or current initial page. Previous pages are fetched on
demand after resume. Previous at the collection start can read the final batch;
next at the true end loops to the start, preserving the existing circular study
behavior. No persisted session-completion flag existed and none is fabricated.
The progress bar is indeterminate while the full deck is not loaded; the counter
labels the loaded subset rather than claiming the entire session is complete.

Flip, audio, marking endpoints, keyboard controls and reduced-motion behavior are
retained. Notebook removal keeps the next surviving card selected; status changes
remove words excluded by the active status filter. Notebook search is now server
side with 250ms debounce/cancellation; changing search or mode remounts the scoped
session. Collection/collocation GET forms retain their existing submission behavior.

The old localStorage key was title-based and not account-specific. It is left
untouched, not imported across users. The first paginated session starts fresh if
there is no new scoped resume record. Server learning progress remains unchanged.

## Tests

```powershell
npx vitest run tests/vocabulary-page.test.ts
$env:VOCABULARY_BROWSER_QA = '1'
npx vitest run tests/vocabulary-browser.test.ts
```

Browser QA requires installed Playwright Chromium and a prior local production
build for CSS. It runs actual React components via the already-installed Vite,
with intercepted API fixtures; Next Image is stubbed. No login, database or paid AI
calls. Tests cover 603 tied-order entries, all modes, private scoping, foreign
cursors, resume anchor, notebook source boundaries and full counts. Interactive
QA covers word 29->30, flip, correct audio URL, reload/resume, marking, autoplay,
user-scope change, current-word removal, previous/next, rapid search cancellation,
390/1440px no-overflow checks and screenshots in ignored .qa/.

This is not a production Next.js hydration/auth test or PostgreSQL integration
test. Actual audible output and Blob audio availability are not verified: the
browser audio API is mocked to assert the selected URL. Real server collation,
concurrent editors, auth switching and slow-network behavior need staging QA.
Long study sessions accumulate words actually visited/loaded in memory; they do
not download the entire deck upfront. Windowing the DOM is out of this phase.

## Evidence

Collection/collocation initial limit: 500 -> 31 selected rows, 30 sent to client.
Notebook: two 100-row reads -> two reads bounded at 31, 30 sent to client, plus
small grouped counts. These are return bounds, not DB scan counts or latency.
Local First Load JS is about 130 kB for collections/collocations (was 129 kB),
133 kB for notebook (was 131 kB). No measured production speed claim.

Run TypeScript, lint, tests and npm run build. The local build uses process-local
dummy DATABASE_URL/DIRECT_URL to avoid production access; the expected vocabulary
connection warning does not certify live DB access. Never run the Vercel deployment
command here: it includes migration/audio-import side effects. Phase 3 and deployment
require separate approval. Reversing only this document's file list leaves Materials
and Phase 0/1 work intact.
