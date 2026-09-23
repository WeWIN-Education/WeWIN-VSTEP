# Quick Battle B1

## Implemented

- `/game`: public introduction; active accounts can queue, resume, see rank and paginated history.
- `/battle/[matchId]`: focused responsive arena, 30 alternating scheduled turns, countdown, answers, effects, result/review.
- `/manage/battle`: admin-only paginated/searchable bank, draft/publish, add/edit/delete, idempotent 150-question starter import.
- `POST /api/battle`: state, join, cancel, answer, leave. Heartbeat is sent every 5 seconds with polling, not a separate extra request. State polling is every second only during queue/active match.
- `GET /api/battle?page=1`: private history, 10 rows/page, current total XP.
- `GET/POST /api/manage/battle`: admin content operations.

The question pack is original WEWIN B1 practice oriented toward VSTEP, not an official exam bank. It has 50 questions of each type and Vietnamese explanations. Importing again does not overwrite questions with an existing source key; deliberately deleted starter questions return if an admin explicitly imports the starter again.

## Integrity and simplifications

PostgreSQL is authoritative. One `BattleSession` per user plus a transaction advisory lock serializes game operations across tabs and Vercel instances. This intentionally simple lock targets the approved ceiling of 20 concurrent players. No Redis, sockets, background timer, dependency, worker or deployment-service changes.

Each match snapshots its 30 questions and bot decisions. Bot choices are independent 80% Bernoulli trials and response delays are 2–6 seconds, sampled with Node crypto. The server resolves overdue events lazily; late requests cannot backdate answers. After the 3-second countdown, each turn allows up to 15 seconds to answer. An answer immediately reveals the result; the next turn starts 2 seconds after the persisted answer timestamp (or timeout). Both scoring and deadlines use this derived schedule, including reloads and delayed polling; no schema change is needed. Bot display names are sampled once per match from the supplied 100 Vietnamese names. The lobby and arena use the six supplied WEWIN rank badges and omit the manual animation toggle; system reduced-motion preferences still apply.

Adjacent difficulty pairs from each sampled group of 10 split between players, balancing difficulty as closely as the published pool permits. Exact equality is not mathematically possible for every arbitrary admin-supplied pool (for example, an odd count in a difficulty bucket).

The client receives only the current question, answer/explanation after resolution, and complete review after the match ends. No future questions, bot decisions, opponent IDs or emails are sent. Names are public display names, not email fallbacks. State/history responses are private and non-cacheable. Mutations validate origin and current account/session version. Game requests are limited per account to 40 per 10-second window in PostgreSQL.

Disconnects are checked before refreshing heartbeat. Account removal is serialized against game operations, anonymizes the player's stored name, cascades session/answers/rewards and leaves anonymous scores in the opponent's history. Reward settlement and `User.xp` increment share one transaction, with a unique reward per participant. Only positive awards count toward the five-per-day limit; dates use Asia/Ho_Chi_Minh and the server-scheduled finish time.

No automatic cleanup job is added. Abandoned matches settle when a participant next requests their state. Match history intentionally persists; set a retention policy separately if storage measurements justify one.

## Release sequence (not executed on production)

1. Back up the target database using the project's existing process.
2. Apply the additive migration `20260923100000_quick_battle` using `npx prisma migrate deploy`, with the existing direct migration connection. Generate Prisma Client as in the existing install workflow. Do not reset the database.
3. Deploy code with `QUICK_BATTLE_ENABLED` absent or `false`. The game introduction is visible, but joining is disabled server-side and client-side. Existing active matches can still finish if the switch is later disabled.
4. As an admin, open `/manage/battle` and choose **Nạp bộ khởi đầu 150 câu**. Confirm 50 published per type. Matchmaking also independently checks at least 10 published per type.
5. Enable `QUICK_BATTLE_ENABLED=true` on an isolated staging deployment. Test with real authenticated accounts on that deployment, including 20 concurrent users and the checks below. Do not reuse learner credentials in scripts or logs.
6. Only after staging verification, enable the same switch on the intended live deployment. No production environment variables, data, migration or deployment were changed by this implementation task.

The flag is new game configuration, not a modification to the AI worker or the existing deployment topology. Restart/redeploy the Next.js process when changing it. Roll back by disabling joining; do not drop game tables or reverse earned XP.

## Reproducible local tests

The integration/browser tests refuse to write unless BOTH conditions hold:

- `BATTLE_INTEGRATION=true`
- `DATABASE_URL` points to user `battle_qa`, database `battle_test`, host `127.0.0.1`, port `55439`.

An isolated Docker PostgreSQL 16 container named `wewin-battle-qa` was used. It is separate from the application's normal database. The only remaining content in it is the starter pack; temporary accounts/matches created by passing tests are cleaned up.

In a shell configured for that isolated database (`DIRECT_URL` equal to `DATABASE_URL`):

```powershell
npx prisma migrate deploy
$env:BATTLE_INTEGRATION='true'
npx vitest run tests/battle-engine.integration.test.ts
npx vitest run tests/battle-rules.test.ts tests/battle-api.test.ts tests/manage-user-delete.test.ts
npx tsc --noEmit
npm run lint
npx prisma validate
npm run build
```

For browser checks start the production build with `QUICK_BATTLE_ENABLED=true` against the same isolated database, then:

```powershell
$env:QA_BASE_URL='http://localhost:3100'
npx playwright test tests/e2e/quick-battle.spec.ts tests/e2e/battle-characters.spec.ts --workers=1
```

Browser tests create temporary local accounts, log in through the actual credentials endpoint, pair two contexts, answer with the keyboard, reload, review, and exercise admin import/edit/delete. Only their local fixture clock is accelerated to test results. Screenshots go to `.qa/quick-battle-*.png`.

Unit/integration coverage includes 150-question validation, question allocation, score/rank/day boundaries, 20,000 bot trials, duplicate/concurrent joins, ownership/late/changed answers, durable timeout settlement, bot threshold, cancellation, full 30-turn completion, repeated reward reads, five-match reward cap, reconnect/double disconnect, removed/locked accounts, forfeit eligibility, rate limiting and snapshot isolation.

## Measurements and remaining release checks

- Existing `PERF_BASELINE_SAMPLE_RATE` telemetry now also accepts `battle.command` and `battle.queue_wait`; it never logs question text, answers, tokens, names or identifiers. Existing `db.query` measurements remain available.
- Local 20-player integration load writes `.qa/quick-battle-local-load.json` with p50/p95/max processing duration. This includes shared-lock contention and database work but NOT internet RTT, Vercel cold starts or client polling delay.
- Recorded local run after early-turn changes: 140 commands across 20 concurrent players, p50 232 ms, p95 501 ms, max 782 ms. This is a local measurement, not a production performance guarantee.
- Compare at least 100 samples at the same load/region/configuration. Observe poll round-trip and the time from one player's confirmed answer to its appearance in the opponent browser. Target most opponent updates within ~2 seconds, without duplicate answers/rewards.
- Staging load with Vercel/Neon and real network latency was NOT run. A global lock may become the bottleneck on a higher-latency database connection; measure before enabling production. If needed, split locks by queue/match while retaining per-user exclusivity.
- No monitoring infrastructure or connection-pool settings are changed. AI Speaking/Writing grading stays independent.

## Early-turn and badge update verification

- TypeScript, lint, Prisma validation, production build, 16 focused unit/API tests and all 8 isolated database integration tests passed. The build completed while reporting the temporarily unavailable local QA database during vocabulary page generation. The database was recovered before the successful integration rerun.
- Integration checks cover immediate answer reveal, the 2-second result interval, next-turn deadlines, early/future/late answer rejection, duplicate answers, bot and human early transitions, complete 30-turn scoring, once-only XP and the daily reward cap.
- The six badge assets are byte-identical copies of the supplied PNGs. No image regeneration or schema migration was needed for this update.
- Browser tests were updated for early transitions, reloads, badges and removed controls, but have NOT been run for this update: local preview-server launch was rejected with “blocked by policy”. Desktop/mobile visual verification remains pending.

## Changed modules

- `prisma/schema.prisma`, `prisma/migrations/20260923100000_quick_battle/migration.sql`
- `src/lib/battle-rules.ts`, `src/lib/battle-starter.ts`, `src/lib/battle-engine.ts`
- `src/app/api/battle/route.ts`, `src/app/api/manage/battle/route.ts`
- `src/app/(main)/game/page.tsx`, `src/app/battle/[matchId]/page.tsx`, `src/app/(main)/manage/battle/page.tsx`
- `src/components/battle/BattleGame.tsx`, `src/components/battle/battle-game.module.css`, `src/components/manage/BattleQuestionManager.tsx`
- Existing animation pack: `src/components/battle/BattleCharacter.tsx`, `src/components/battle/battle-character.module.css` (rank-specific effects added; other pack files preserved).
- `src/config/navigation.ts`, `next.config.ts`, `src/lib/performance-baseline.ts`, `src/app/api/manage/users/[userId]/route.ts`
- `tests/battle-rules.test.ts`, `tests/battle-api.test.ts`, `tests/battle-engine.integration.test.ts`, `tests/e2e/quick-battle.spec.ts`, `tests/manage-user-delete.test.ts`
- This document. Previous uncommitted character assets, preview, tests and documentation remain intact.
