-- Preserve account and attempt identities while introducing role-aware access.
ALTER TYPE "UserRole" RENAME VALUE 'CONTENT_MANAGER' TO 'ADMIN';
ALTER TABLE "User" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ExamPaper" ADD COLUMN "trialSlot" INTEGER;
ALTER TABLE "ExamPaper" ADD CONSTRAINT "ExamPaper_trialSlot_check" CHECK ("trialSlot" IN (1, 2));
CREATE UNIQUE INDEX "ExamPaper_trialSlot_key" ON "ExamPaper"("trialSlot");
CREATE TABLE "GuestSession" (
  "id" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GuestSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GuestSession_tokenHash_key" ON "GuestSession"("tokenHash");
CREATE INDEX "GuestSession_expiresAt_idx" ON "GuestSession"("expiresAt");
ALTER TABLE "ExamAttempt" ALTER COLUMN "userId" DROP NOT NULL;
ALTER TABLE "ExamAttempt" ADD COLUMN "guestSessionId" TEXT, ADD COLUMN "trialSlot" INTEGER;
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_owner_check"
  CHECK (("userId" IS NOT NULL AND "guestSessionId" IS NULL AND "trialSlot" IS NULL)
    OR ("userId" IS NULL AND "guestSessionId" IS NOT NULL AND "trialSlot" IN (1, 2)));
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_guestSessionId_fkey"
  FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE UNIQUE INDEX "ExamAttempt_guestSessionId_trialSlot_key" ON "ExamAttempt"("guestSessionId", "trialSlot");
CREATE TABLE "TrialRateLimit" (
  "key" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TrialRateLimit_pkey" PRIMARY KEY ("key")
);
CREATE INDEX "TrialRateLimit_expiresAt_idx" ON "TrialRateLimit"("expiresAt");
UPDATE "ExamPaper" SET "trialSlot" = 1 WHERE "programme" = 'VSTEP'
  AND "slug" = 'vstep-test-1' AND "status" = 'PUBLISHED';
