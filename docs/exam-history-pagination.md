# Phase 1: exam history pagination

The authenticated history list reads at most 21 projected rows and renders 20.
It uses the feed's date/id keyset pattern, with updatedAt descending then id
descending. The extra row detects another page without a count query. Hero stats
explicitly describe the current page; result scores remain on the unchanged
attempt detail page. No answers, recordings, grading JSON or unused slug are read
for the list. No schema/index/migration/dependency or deployment changes.

Older links use a strict (updatedAt, id) boundary. Newer links query ascending and
reverse the resulting 20 rows for display. URL links support native browser history.
The GET form contains only filters; submission resets pagination. A filter digest
in the cursor also resets a copied cursor when normalized filters change. Cursor
data is untrusted, size/type/date checked and never grants access: every query is
scoped to the live authenticated user. Guests still redirect before the query.

Invalid dates/ranges show an alert and make no history query. Start and end inputs
are full UTC days, using gte start and lt next midnight in one updatedAt condition.
This preserves UTC production ordering/date interpretation, fixes the overwritten
start bound and includes the last 999ms previously excluded by 23:59:59. The old
end bound depended on the host timezone; the new bound and displayed list timestamp
are explicitly UTC on every host. UI explains UTC. Switching to Vietnamese local
calendar days is a separate product decision, not done here.

This is live pagination, not a historical snapshot. Ordinary ascending updatedAt
changes move records toward the latest page, not repeatedly into later pages.
An unseen row updated across the current boundary may be skipped until the user
chooses "Moi nhat". Cursor anchors need not still exist. Empty stale pages retain
a latest-page link. Back/forward restores filters and boundaries, not frozen data.
Manual backdating or arbitrary concurrent reordering cannot guarantee snapshot
completeness without extra state. No such snapshot machinery was introduced.

## Validation

```powershell
npm run test:unit
npx tsc --noEmit
npm run lint
```

After a local production build, opt into the installed Playwright Chromium fixture
check (no network/database access; requests intercepted and fulfilled in memory):

```powershell
$env:HISTORY_BROWSER_QA = '1'
npx vitest run tests/exam-history.test.ts
```

It renders the real page with mocked authentication/Prisma and built CSS, checks
390px and 1440px, list size, filter reset, native back/forward and horizontal
overflow. Screenshots go to ignored `.qa/`. It is not a hydrated Next.js session or
an integration test against PostgreSQL, and does not include AppShell, fonts or
remote hero assets. Unit checks cover 0/7/20/21/125 attempts, timestamp ties,
combined filters, date boundaries, invalid inputs, foreign-user cursors, guest
redirects, updated/deleted anchors and latest-page recovery.

The production build must use `npm run build`, not the Vercel build command with
its migration/audio-import side effects. Override DATABASE_URL and DIRECT_URL only
in that process with a dummy localhost endpoint to isolate production data. A
handled vocabulary connection warning is expected, not a real DB verification.

## Evidence and remaining validation

Verified query bound: 100 full attempts before vs at most 21 projected rows now,
with 20 visible. This does not imply 79% less database work: filters/sorting may
still scan more rows. More than 100 records are accessible via successive pages.
No production TTFB/p95, query plan, payload or speed improvement has been measured.
Do not infer improvement from warm build duration. Use Phase 0 measurements on
an approved staging dataset; add an index only if a query plan warrants it.

Before production rollout, verify authenticated hydrated navigation and query
semantics on staging PostgreSQL, using existing accounts and representative data.
No data was deleted or modified by this phase. Phase 0 work remains untouched;
Phase 2 and deployment require separate approval.
