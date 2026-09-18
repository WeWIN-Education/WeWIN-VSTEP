-- CreateEnum
CREATE TYPE "Programme" AS ENUM ('VSTEP', 'IELTS', 'CLASSROOM');

-- CreateEnum
CREATE TYPE "ExamSkill" AS ENUM ('LISTENING', 'READING', 'WRITING', 'SPEAKING');

-- CreateEnum
CREATE TYPE "PracticeType" AS ENUM ('WORD_ORDER', 'FILL_BLANK', 'LISTENING_FILL', 'LISTENING_ORDER', 'CLOZE_READING', 'WRITING');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('SAMPLE', 'READY', 'PUBLISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProgrammeEnrollment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "programme" "Programme" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgrammeEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamPaper" (
    "id" TEXT NOT NULL,
    "programme" "Programme" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "target" TEXT,
    "durationMin" INTEGER NOT NULL DEFAULT 60,
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "sections" JSONB,
    "questions" JSONB,
    "status" "ExamStatus" NOT NULL DEFAULT 'READY',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamPaper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExamAttempt" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "examPaperId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'IN_PROGRESS',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "currentSkill" "ExamSkill",
    "currentPart" INTEGER NOT NULL DEFAULT 0,
    "answers" JSONB,
    "recordings" JSONB,
    "listeningScore" DOUBLE PRECISION,
    "readingScore" DOUBLE PRECISION,
    "writingStatus" TEXT NOT NULL DEFAULT 'NOT_GRADED',
    "speakingStatus" TEXT NOT NULL DEFAULT 'NOT_GRADED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PracticeItem" (
    "id" TEXT NOT NULL,
    "programme" "Programme",
    "skill" "ExamSkill",
    "type" "PracticeType" NOT NULL,
    "title" TEXT,
    "prompt" TEXT NOT NULL,
    "instruction" TEXT,
    "payload" JSONB NOT NULL,
    "answer" JSONB NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PracticeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningVideo" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "youtubeId" TEXT NOT NULL,
    "level" TEXT,
    "category" TEXT,
    "duration" TEXT,
    "transcript" JSONB,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningVideo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT,
    "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ProgrammeEnrollment_userId_programme_key" ON "ProgrammeEnrollment"("userId", "programme");

-- CreateIndex
CREATE INDEX "ExamPaper_programme_status_idx" ON "ExamPaper"("programme", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExamPaper_programme_slug_key" ON "ExamPaper"("programme", "slug");

-- CreateIndex
CREATE INDEX "ExamAttempt_userId_status_idx" ON "ExamAttempt"("userId", "status");

-- CreateIndex
CREATE INDEX "PracticeItem_programme_skill_type_idx" ON "PracticeItem"("programme", "skill", "type");

-- CreateIndex
CREATE UNIQUE INDEX "LearningVideo_slug_key" ON "LearningVideo"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- AddForeignKey
ALTER TABLE "ProgrammeEnrollment" ADD CONSTRAINT "ProgrammeEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExamAttempt" ADD CONSTRAINT "ExamAttempt_examPaperId_fkey" FOREIGN KEY ("examPaperId") REFERENCES "ExamPaper"("id") ON DELETE CASCADE ON UPDATE CASCADE;
