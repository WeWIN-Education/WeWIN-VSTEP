ALTER TABLE "LearningContent" ADD COLUMN "audioKey" TEXT, ADD COLUMN "audioName" TEXT;
CREATE UNIQUE INDEX "LearningContent_audioKey_key" ON "LearningContent"("audioKey");
CREATE TABLE "LearningContentImport" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
