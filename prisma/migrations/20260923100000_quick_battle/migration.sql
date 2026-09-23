-- CreateTable
CREATE TABLE "BattleQuestion" (
    "id" TEXT NOT NULL,
    "sourceKey" TEXT,
    "type" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT[],
    "correct" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleSession" (
    "userId" TEXT NOT NULL,
    "queuedAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchId" TEXT,
    "windowAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "requests" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "BattleSession_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "BattleMatch" (
    "id" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "reason" TEXT,
    "winnerSlot" INTEGER,

    CONSTRAINT "BattleMatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattlePlayer" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "userId" TEXT,
    "slot" INTEGER NOT NULL,
    "isBot" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "correct" INTEGER NOT NULL DEFAULT 0,
    "answered" INTEGER NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattlePlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleTurn" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "difficulty" INTEGER NOT NULL,
    "prompt" TEXT NOT NULL,
    "options" TEXT[],
    "correct" INTEGER NOT NULL,
    "explanation" TEXT NOT NULL,
    "botChoice" INTEGER,
    "botDelay" INTEGER,

    CONSTRAINT "BattleTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleAnswer" (
    "id" TEXT NOT NULL,
    "turnId" TEXT NOT NULL,
    "userId" TEXT,
    "choice" INTEGER,
    "points" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BattleAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleReward" (
    "id" TEXT NOT NULL,
    "playerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "xp" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BattleReward_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BattleQuestion_sourceKey_key" ON "BattleQuestion"("sourceKey");

-- CreateIndex
CREATE INDEX "BattleQuestion_published_type_difficulty_idx" ON "BattleQuestion"("published", "type", "difficulty");

-- CreateIndex
CREATE INDEX "BattleSession_matchId_queuedAt_idx" ON "BattleSession"("matchId", "queuedAt");

-- CreateIndex
CREATE INDEX "BattlePlayer_userId_matchId_idx" ON "BattlePlayer"("userId", "matchId");

-- CreateIndex
CREATE UNIQUE INDEX "BattlePlayer_matchId_slot_key" ON "BattlePlayer"("matchId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "BattlePlayer_matchId_userId_key" ON "BattlePlayer"("matchId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleTurn_matchId_number_key" ON "BattleTurn"("matchId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "BattleAnswer_turnId_key" ON "BattleAnswer"("turnId");

-- CreateIndex
CREATE UNIQUE INDEX "BattleReward_playerId_key" ON "BattleReward"("playerId");

-- CreateIndex
CREATE INDEX "BattleReward_userId_day_xp_idx" ON "BattleReward"("userId", "day", "xp");

-- AddForeignKey
ALTER TABLE "BattleSession" ADD CONSTRAINT "BattleSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleSession" ADD CONSTRAINT "BattleSession_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "BattleMatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePlayer" ADD CONSTRAINT "BattlePlayer_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "BattleMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattlePlayer" ADD CONSTRAINT "BattlePlayer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleTurn" ADD CONSTRAINT "BattleTurn_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "BattleMatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleAnswer" ADD CONSTRAINT "BattleAnswer_turnId_fkey" FOREIGN KEY ("turnId") REFERENCES "BattleTurn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleAnswer" ADD CONSTRAINT "BattleAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReward" ADD CONSTRAINT "BattleReward_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "BattlePlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleReward" ADD CONSTRAINT "BattleReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
