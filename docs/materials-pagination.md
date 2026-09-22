# Phase 2A: Materials pagination

Independent of vocabulary changes. No migration, dependency, deployment or stored
document changes. Existing upload/complete/edit/delete/download handlers remain.

## Files

- src/lib/materials-page.ts
- src/app/api/manage/materials/list/route.ts
- src/app/(main)/materials/page.tsx
- src/app/(main)/manage/materials/page.tsx
- src/components/manage/LearningMaterialUploadForm.tsx
- tests/materials-page.test.ts
- docs/materials-pagination.md

## Behavior

Read 21 metadata rows and display 20; createdAt DESC + id DESC with strict cursor
boundary follows the existing feed pattern. A deleted cursor row is not needed.
Students retain the login gate and published VSTEP filter. Admins retain all
programmes and publication states. The new admin list API validates the current
live account on every request and returns private, no-store responses.

Public-facing list uses URL links for next/latest and native browser history.
Admin list uses Load More, 250ms server-side search debounce, AbortController and
request version checks, following LearningContentManager. Search covers title or
filename and skill across all pages, not just loaded rows. Changing filters resets
the cursor. Duplicate IDs are not appended. Existing CRUD callbacks refresh the
filtered list from the first page and refresh server header counts. Upload form
state is not discarded by pagination. Retry controls retain a recoverable UI.

Totals and skill/published counts come from a separate grouped count with the same
base predicate, not the current page length. Group count and page read are not a
transactional snapshot: concurrent edits may briefly make them disagree. Count
queries add DB work; measure with Phase 0 before proposing caching/indexes.

## Verification

`npx vitest run tests/materials-page.test.ts tests/manage-materials.test.ts`

Mocked tests exercise 0/8/20/21 rows, 125 tied-timestamp rows, full counts,
filter-bound cursors, search predicate reuse, deletion/publication refresh,
guest/learner denial, admin access, and existing mutation validation.
No test uploads/deletes a real file or changes production records.
Real Blob upload, PostgreSQL collation/query plans, live admin editing and
authenticated Next.js browser navigation require an approved staging environment;
these were not exercised by the mocked tests.

Confirmed query return limit: 100 full metadata rows -> 21, with 20 rendered.
No measured production TTFB/p95 or DB speed claim. Materials First Load JS remains
111 kB in the local Next production build. Existing public download authorization
remains unchanged. Roll back only the files above to reverse Phase 2A; Phase 2B
does not depend on them. Do not revert Phase 0/1 files.
