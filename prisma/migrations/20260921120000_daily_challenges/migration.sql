CREATE TABLE "DailyChallengeReward" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "amount" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DailyChallengeReward_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "DailyChallengeReward_userId_day_key" ON "DailyChallengeReward"("userId", "day");
CREATE INDEX "VocabularyProgress_userId_lastReviewedAt_idx" ON "VocabularyProgress"("userId", "lastReviewedAt");
