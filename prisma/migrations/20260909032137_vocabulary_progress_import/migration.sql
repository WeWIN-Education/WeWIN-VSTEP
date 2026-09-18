-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('LEARNER', 'CONTENT_MANAGER');

-- CreateEnum
CREATE TYPE "VocabularyProgressStatus" AS ENUM ('NEW', 'LEARNING', 'MASTERED');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'LEARNER';

-- CreateTable
CREATE TABLE "VocabularyCollection" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sourceFile" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyTopic" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyTopic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyEntry" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "entryCode" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "meaningVi" TEXT NOT NULL,
    "partOfSpeech" TEXT,
    "ipa" TEXT,
    "exampleEn" TEXT,
    "exampleVi" TEXT,
    "audioUrl" TEXT,
    "note" TEXT,
    "sourceSheet" TEXT,
    "sourceRow" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "status" "VocabularyProgressStatus" NOT NULL DEFAULT 'NEW',
    "note" TEXT,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "lastReviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VocabularyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VocabularyImport" (
    "id" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "collectionId" TEXT,
    "fileName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'COMPLETED',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "insertedRows" INTEGER NOT NULL DEFAULT 0,
    "updatedRows" INTEGER NOT NULL DEFAULT 0,
    "skippedRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "errors" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VocabularyImport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoSlug" TEXT NOT NULL,
    "currentSec" INTEGER NOT NULL DEFAULT 0,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyCollection_code_key" ON "VocabularyCollection"("code");

-- CreateIndex
CREATE INDEX "VocabularyTopic_collectionId_sortOrder_idx" ON "VocabularyTopic"("collectionId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyTopic_collectionId_code_key" ON "VocabularyTopic"("collectionId", "code");

-- CreateIndex
CREATE INDEX "VocabularyEntry_collectionId_topicId_level_idx" ON "VocabularyEntry"("collectionId", "topicId", "level");

-- CreateIndex
CREATE INDEX "VocabularyEntry_term_idx" ON "VocabularyEntry"("term");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyEntry_collectionId_entryCode_key" ON "VocabularyEntry"("collectionId", "entryCode");

-- CreateIndex
CREATE INDEX "VocabularyProgress_userId_status_idx" ON "VocabularyProgress"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VocabularyProgress_userId_entryId_key" ON "VocabularyProgress"("userId", "entryId");

-- CreateIndex
CREATE INDEX "VocabularyImport_uploadedById_createdAt_idx" ON "VocabularyImport"("uploadedById", "createdAt");

-- CreateIndex
CREATE INDEX "VideoProgress_userId_completed_idx" ON "VideoProgress"("userId", "completed");

-- CreateIndex
CREATE UNIQUE INDEX "VideoProgress_userId_videoSlug_key" ON "VideoProgress"("userId", "videoSlug");

-- AddForeignKey
ALTER TABLE "VocabularyTopic" ADD CONSTRAINT "VocabularyTopic_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "VocabularyCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyEntry" ADD CONSTRAINT "VocabularyEntry_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "VocabularyCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyEntry" ADD CONSTRAINT "VocabularyEntry_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "VocabularyTopic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyProgress" ADD CONSTRAINT "VocabularyProgress_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "VocabularyEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyImport" ADD CONSTRAINT "VocabularyImport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VocabularyImport" ADD CONSTRAINT "VocabularyImport_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "VocabularyCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoProgress" ADD CONSTRAINT "VideoProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
