# Quick Battle B1

## Implemented

- `/game`: public introduction; active accounts can queue, resume, see rank and paginated history.
- `/battle/[matchId]`: focused responsive arena, 30 alternating turns, countdown, answers, effects, and final result.
- `/manage/battle`: admin-only paginated/searchable bank, draft/publish, add/edit/delete, idempotent 150-question starter import.
- `POST /api/battle`: state, join, cancel, answer, leave. Heartbeat is sent every 5 seconds with polling, not a separate extra request. State polling is every 1.5 seconds in the queue and every second during a match; a confirmed answer reveals immediately and the next turn starts one second later.
- `GET /api/battle?page=1`: private history, 10 rows/page, current total XP.
- `GET/POST /api/manage/battle`: admin content operations.

The question pack is original WEWIN B1 practice oriented toward VSTEP, not an official exam bank. It has 50 questions of each type and Vietnamese explanations. Importing again does not overwrite questions with an existing source key; deliberately deleted starter questions return if an admin explicitly imports the starter again.

## Integrity and simplifications

PostgreSQL is authoritative. A transaction advisory lock serializes matchmaking across instances; active matches lock only their own row, so separate games proceed independently. This simple queue lock targets up to 20 concurrent players. No Redis, sockets, background timer, dependency, worker or deployment-service changes.

Each active match snapshots its 30 questions, bot decisions, current turn and temporary score in `BattleMatch.runtime`. Bot accuracy remains 80%; each response is independently set to arrive in 2–6 seconds. The server resolves overdue events lazily; late requests cannot backdate answers. After the 3-second countdown, each turn allows up to 15 seconds. Correctness appears as soon as the answer is accepted, then the next turn starts one second later. At finish, the runtime is cleared: new matches do not save individual answers, explanations, or a review. Only final outcome and XP awards remain in history. The additive migration `20260923120000_battle_runtime` adds the temporary runtime column; existing in-progress matches can resume from legacy turns. Bot display names are sampled once per match from the supplied 100 Vietnamese names. The lobby and arena use the six supplied WEWIN rank badges and omit the manual animation toggle; system reduced-motion preferences still apply.

Adjacent difficulty pairs from each sampled group of 10 split between players, balancing difficulty as closely as the published pool permits. Exact equality is not mathematically possible for every arbitrary admin-supplied pool (for example, an odd count in a difficulty bucket).

The client receives only the current question and its correctness after resolution. There is no answer explanation or post-match question review. No future questions, bot decisions, opponent IDs or emails are sent. Names are public display names, not email fallbacks. State/history responses are private and non-cacheable. Mutations validate origin and current account/session version. Game requests are limited per account to 40 per 10-second window in PostgreSQL.

Disconnects are checked before refreshing heartbeat. Account removal anonymizes the player name in saved history and cascades sessions/rewards. Reward settlement and `User.xp` increment share one transaction, with a unique reward per participant. Only positive awards count toward the five-per-day limit; dates use Asia/Ho_Chi_Minh and the server-scheduled finish time.

No automatic cleanup job is added. Abandoned matches settle when a participant next requests their state. Match history intentionally persists; set a retention policy separately if storage measurements justify one.

## Release sequence (not executed on production)

1. Back up the target database using the project's existing process.
2. Apply additive migrations, including `20260923120000_battle_runtime`, using `npx prisma migrate deploy` with the existing direct migration connection. Generate Prisma Client as in the existing install workflow. Do not reset the database.
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

Browser tests create temporary local accounts, log in through the credentials endpoint, pair two contexts, answer with the keyboard, observe the entering-game screen, reload the next question, and check outcome-only history. The character test checks canvas reuse as poses change. Only the isolated match runtime is advanced to test final results. Screenshots go to `.qa/quick-battle-*.png`.

Unit/integration coverage includes 150-question validation, question allocation, score/rank/day boundaries, 20,000 bot trials, duplicate/concurrent joins, ownership/late/changed answers, durable timeout settlement, bot threshold, cancellation, full 30-turn completion, repeated reward reads, five-match reward cap, reconnect/double disconnect, removed/locked accounts, forfeit eligibility, rate limiting and snapshot isolation.

## Measurements and remaining release checks

- Existing `PERF_BASELINE_SAMPLE_RATE` telemetry now also accepts `battle.command` and `battle.queue_wait`; it never logs question text, answers, tokens, names or identifiers. Existing `db.query` measurements remain available.
- Local 20-player integration load writes `.qa/quick-battle-local-load.json` with p50/p95/max processing duration. This includes shared-lock contention and database work but NOT internet RTT, Vercel cold starts or client polling delay.
- Latest local run: 140 matchmaking/state commands across 20 concurrent players, p50 31.5 ms, p95 311.1 ms, max 440.3 ms. This isolated PostgreSQL measurement excludes internet latency and is not a production guarantee.
- Compare at least 100 samples at the same load/region/configuration. Observe poll round-trip and the time from one player's confirmed answer to its appearance in the opponent browser. Target most opponent updates within ~2 seconds, without duplicate answers/rewards.
- Staging load with Vercel/Neon and real network latency was NOT run. The matchmaking lock may become a bottleneck on a higher-latency database connection; measure before enabling production. Active game commands already use per-match locking.
- No monitoring infrastructure or connection-pool settings are changed. AI Speaking/Writing grading stays independent.

## Fast turns and lightweight match history verification

- The additive runtime migration was applied only to the isolated local QA database; no production or learner database was changed.
- TypeScript, lint, Prisma validation, and production build passed after the runtime-storage changes. The isolated database suite passed 10 scenarios; 26 focused unit/API/integration tests passed together.
- Integration checks cover immediate correctness, the one-second transition, concurrent/retried answers, distinct match locks, 30-turn settlement, once-only XP, the daily cap, timeout/reconnect behavior, legacy-match recovery, the bot response distribution, and load from 20 simultaneous users.
- The character WebGL canvas now survives pose changes instead of being recreated. Drawing is capped at 30 FPS with a smaller mesh/texture; reduced-motion and static-image fallback remain available.
- The local browser preview could not be started: automatic approval blocked the command with “blocked by policy,” even after the operator authorized it. Browser and desktop/mobile visual checks remain pending.
- The six supplied rank badge images and the legacy completed match records remain intact. The migration is additive and does not require restoring a backup.

## Changed modules

- `prisma/schema.prisma`, `prisma/migrations/20260923120000_battle_runtime/migration.sql`
- `src/lib/battle-rules.ts`, `src/lib/battle-runtime.ts`, `src/lib/battle-starter.ts`, `src/lib/battle-engine.ts`
- `src/app/api/battle/route.ts`, `src/app/api/manage/battle/route.ts`
- `src/app/(main)/game/page.tsx`, `src/app/battle/[matchId]/page.tsx`, `src/app/(main)/manage/battle/page.tsx`
- `src/components/battle/BattleGame.tsx`, `src/components/battle/BattleLoading.tsx`, `src/components/battle/battle-game.module.css`, `src/components/battle/character-renderer.ts`, `src/components/manage/BattleQuestionManager.tsx`
- Existing animation pack: `src/components/battle/BattleCharacter.tsx`, `src/components/battle/battle-character.module.css` (rank-specific effects added; other pack files preserved).
- `src/config/navigation.ts`, `next.config.ts`, `src/lib/performance-baseline.ts`, `src/app/api/manage/users/[userId]/route.ts`
- `tests/battle-rules.test.ts`, `tests/battle-api.test.ts`, `tests/battle-engine.integration.test.ts`, `tests/e2e/quick-battle.spec.ts`, `tests/manage-user-delete.test.ts`
- This document. Previous uncommitted character assets, preview, tests and documentation remain intact.
