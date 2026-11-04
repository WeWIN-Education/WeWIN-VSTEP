ALTER TABLE "VocabularyProgress"
  ADD COLUMN "nextReviewAt" TIMESTAMP(3),
  ADD COLUMN "intervalStep" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "firstLearnedAt" TIMESTAMP(3);

-- Preserve existing progress and place previously studied words in the review queue.
UPDATE "VocabularyProgress"
SET "nextReviewAt" = COALESCE("lastReviewedAt", "updatedAt")
WHERE "status" IN ('LEARNING', 'MASTERED');

CREATE INDEX "VocabularyProgress_userId_nextReviewAt_idx" ON "VocabularyProgress"("userId", "nextReviewAt");
CREATE INDEX "VocabularyProgress_userId_firstLearnedAt_idx" ON "VocabularyProgress"("userId", "firstLearnedAt");

CREATE TABLE "VocabularyStudy" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "goal" INTEGER NOT NULL DEFAULT 10,
  "version" TEXT NOT NULL,
  "entryIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isReview" BOOLEAN NOT NULL DEFAULT false,
  "passedAt" TIMESTAMP(3),
  "result" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "VocabularyStudy_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "VocabularyStudy_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "VocabularyStudy_userId_key" ON "VocabularyStudy"("userId");
CREATE INDEX "ExamPaper_sections_gin_idx" ON "ExamPaper" USING GIN ("sections");
