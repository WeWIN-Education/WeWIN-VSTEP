ALTER TABLE "ExamGradingJob"
  ADD COLUMN "leaseToken" TEXT,
  ADD COLUMN "leaseExpiresAt" TIMESTAMP(3),
  ADD COLUMN "pipelineVersion" TEXT NOT NULL DEFAULT 'v1';

CREATE TABLE "GradingWorker" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "GradingWorker_lastSeenAt_idx" ON "GradingWorker"("lastSeenAt");

CREATE TABLE "ExamGradingPart" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "attemptId" TEXT NOT NULL,
  "partId" TEXT NOT NULL,
  "pipelineVersion" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'QUEUED',
  "checkpoint" JSONB,
  "result" JSONB,
  "errorCode" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ExamGradingPart_attemptId_fkey" FOREIGN KEY ("attemptId")
    REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ExamGradingPart_attemptId_partId_pipelineVersion_key"
  ON "ExamGradingPart"("attemptId", "partId", "pipelineVersion");
