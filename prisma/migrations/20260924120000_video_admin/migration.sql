ALTER TABLE "LearningVideo"
  ADD COLUMN "titleVi" TEXT,
  ADD COLUMN "sourceUrl" TEXT,
  ADD COLUMN "questions" JSONB,
  ADD COLUMN "transcriptSource" TEXT,
  ADD COLUMN "ipaDialect" TEXT DEFAULT 'en-US',
  ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "errorMessage" TEXT;

UPDATE "LearningVideo"
SET "status" = 'PUBLISHED'
WHERE "published" = true;

CREATE INDEX "LearningVideo_published_status_sortOrder_idx"
  ON "LearningVideo"("published", "status", "sortOrder");
