-- Add the catalog, community and bookmark surfaces without rewriting learner data.
CREATE TYPE "ExamCatalog" AS ENUM ('FULL', 'LISTENING', 'READING', 'WRITING', 'SPEAKING');
CREATE TYPE "UserPostStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');
CREATE TYPE "VocabularyCollectionKind" AS ENUM ('VOCABULARY', 'COLLOCATION');

ALTER TABLE "ExamAttempt" DROP CONSTRAINT IF EXISTS "ExamAttempt_owner_check";
ALTER TABLE "ExamAttempt"
  ADD COLUMN "catalog" "ExamCatalog" NOT NULL DEFAULT 'FULL',
  ADD COLUMN "skill" "ExamSkill",
  ADD COLUMN "paperPartId" TEXT;

CREATE TABLE "ExamPaperPart" (
    "id" TEXT NOT NULL,
    "examPaperId" TEXT NOT NULL,
    "catalog" "ExamCatalog" NOT NULL,
    "skill" "ExamSkill",
    "title" TEXT NOT NULL,
    "durationMin" INTEGER NOT NULL DEFAULT 0,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "sections" JSONB,
    "questions" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExamPaperPart_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ExamPaperPart_examPaperId_catalog_key" ON "ExamPaperPart"("examPaperId", "catalog");
CREATE INDEX "ExamPaperPart_catalog_skill_createdAt_idx" ON "ExamPaperPart"("catalog", "skill", "createdAt");
ALTER TABLE "ExamPaperPart" ADD CONSTRAINT "ExamPaperPart_examPaperId_fkey"
  FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_paperPartId_fkey"
  FOREIGN KEY ("paperPartId") REFERENCES "ExamPaperPart"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "GuestAttemptUse" (
    "id" TEXT NOT NULL,
    "guestSessionId" TEXT NOT NULL,
    "examPaperId" TEXT NOT NULL,
    "catalog" "ExamCatalog" NOT NULL,
    "attemptId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GuestAttemptUse_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "GuestAttemptUse_guestSessionId_catalog_examPaperId_key" ON "GuestAttemptUse"("guestSessionId", "catalog", "examPaperId");
CREATE UNIQUE INDEX "GuestAttemptUse_attemptId_key" ON "GuestAttemptUse"("attemptId");
CREATE INDEX "GuestAttemptUse_guestSessionId_catalog_idx" ON "GuestAttemptUse"("guestSessionId", "catalog");
ALTER TABLE "GuestAttemptUse" ADD CONSTRAINT "GuestAttemptUse_guestSessionId_fkey"
  FOREIGN KEY ("guestSessionId") REFERENCES "GuestSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestAttemptUse" ADD CONSTRAINT "GuestAttemptUse_examPaperId_fkey"
  FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GuestAttemptUse" ADD CONSTRAINT "GuestAttemptUse_attemptId_fkey"
  FOREIGN KEY ("attemptId") REFERENCES "ExamAttempt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "QuestionBookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examPaperId" TEXT NOT NULL,
    "paperPartId" TEXT,
    "catalog" "ExamCatalog" NOT NULL DEFAULT 'FULL',
    "questionId" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "QuestionBookmark_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "QuestionBookmark_userId_examPaperId_catalog_questionId_key" ON "QuestionBookmark"("userId", "examPaperId", "catalog", "questionId");
CREATE INDEX "QuestionBookmark_userId_catalog_createdAt_idx" ON "QuestionBookmark"("userId", "catalog", "createdAt");
ALTER TABLE "QuestionBookmark" ADD CONSTRAINT "QuestionBookmark_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionBookmark" ADD CONSTRAINT "QuestionBookmark_examPaperId_fkey"
  FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "QuestionBookmark" ADD CONSTRAINT "QuestionBookmark_paperPartId_fkey"
  FOREIGN KEY ("paperPartId") REFERENCES "ExamPaperPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BlogPost" ADD COLUMN "authorId" TEXT;
ALTER TABLE "BlogPost" ADD CONSTRAINT "BlogPost_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "UserPost" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "reviewedById" TEXT,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "status" "UserPostStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "publishedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserPost_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "UserPost_slug_key" ON "UserPost"("slug");
CREATE INDEX "UserPost_status_publishedAt_idx" ON "UserPost"("status", "publishedAt");
CREATE INDEX "UserPost_authorId_status_createdAt_idx" ON "UserPost"("authorId", "status", "createdAt");
ALTER TABLE "UserPost" ADD CONSTRAINT "UserPost_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserPost" ADD CONSTRAINT "UserPost_reviewedById_fkey"
  FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "VocabularyCollection" ADD COLUMN "kind" "VocabularyCollectionKind" NOT NULL DEFAULT 'VOCABULARY';
ALTER TABLE "VocabularyEntry" ALTER COLUMN "topicId" DROP NOT NULL;
ALTER TABLE "VocabularyImport" ADD COLUMN "kind" "VocabularyCollectionKind" NOT NULL DEFAULT 'VOCABULARY';

-- Keep existing guest attempts readable while recording them in the new quota table.
INSERT INTO "GuestAttemptUse" ("id", "guestSessionId", "examPaperId", "catalog", "attemptId")
SELECT 'legacy_' || "id", "guestSessionId", "examPaperId", 'FULL'::"ExamCatalog", "id"
FROM "ExamAttempt"
WHERE "guestSessionId" IS NOT NULL
ON CONFLICT DO NOTHING;

ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_owner_check"
  CHECK (("userId" IS NOT NULL AND "guestSessionId" IS NULL)
    OR ("userId" IS NULL AND "guestSessionId" IS NOT NULL));

CREATE INDEX "ExamAttempt_userId_catalog_updatedAt_idx" ON "ExamAttempt"("userId", "catalog", "updatedAt");
CREATE INDEX "ExamAttempt_examPaperId_catalog_status_idx" ON "ExamAttempt"("examPaperId", "catalog", "status");
