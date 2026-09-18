-- Add durable VSTEP progress, streak, XP and community hearts.
CREATE TYPE "VstepLevel" AS ENUM ('B1', 'B2', 'C1');

ALTER TABLE "User"
  ADD COLUMN "vstepTarget" "VstepLevel" NOT NULL DEFAULT 'B1',
  ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "heartsReceived" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "streakDays" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastActiveDate" DATE;

CREATE TABLE "XpAward" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "baseXp" INTEGER NOT NULL,
    "scoreBonus" INTEGER NOT NULL DEFAULT 0,
    "catalog" "ExamCatalog" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "XpAward_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "XpAward_attemptId_key" ON "XpAward"("attemptId");
CREATE INDEX "XpAward_userId_createdAt_idx" ON "XpAward"("userId", "createdAt");

ALTER TABLE "XpAward" ADD CONSTRAINT "XpAward_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "XpAward" ADD CONSTRAINT "XpAward_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DailyActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityDate" DATE NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DailyActivity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DailyActivity_userId_activityDate_key" ON "DailyActivity"("userId", "activityDate");
CREATE INDEX "DailyActivity_userId_activityDate_idx" ON "DailyActivity"("userId", "activityDate");

ALTER TABLE "DailyActivity" ADD CONSTRAINT "DailyActivity_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep the denormalized counter correct if community likes already exist.
UPDATE "User" AS u
SET "heartsReceived" = counts.total
FROM (
  SELECT p."authorId" AS "userId", COUNT(*)::INTEGER AS total
  FROM "PostLike" AS l
  INNER JOIN "UserPost" AS p ON p."id" = l."userPostId"
  GROUP BY p."authorId"
) AS counts
WHERE u."id" = counts."userId";
