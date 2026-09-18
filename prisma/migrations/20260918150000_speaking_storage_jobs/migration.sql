-- Store candidate recordings outside the attempt JSON payload and queue long grading work.
CREATE TABLE "ExamRecording" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "storageUrl" TEXT,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "durationSeconds" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'SAVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamRecording_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamRecording_attemptId_partId_key" ON "ExamRecording"("attemptId", "partId");
CREATE INDEX "ExamRecording_attemptId_status_idx" ON "ExamRecording"("attemptId", "status");

ALTER TABLE "ExamRecording" ADD CONSTRAINT "ExamRecording_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ExamGradingJob" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamGradingJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ExamGradingJob_attemptId_key" ON "ExamGradingJob"("attemptId");
CREATE INDEX "ExamGradingJob_status_availableAt_idx" ON "ExamGradingJob"("status", "availableAt");

ALTER TABLE "ExamGradingJob" ADD CONSTRAINT "ExamGradingJob_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE;
