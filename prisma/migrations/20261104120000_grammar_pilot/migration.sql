-- CreateTable
CREATE TABLE "GrammarLesson" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "importedById" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrammarLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarAttempt" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "result" JSONB NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GrammarAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarSetProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "bestCorrect" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "passedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarSetProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrammarReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "setId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "intervalStep" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 1,
    "nextReviewAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrammarReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GrammarLesson_status_number_idx" ON "GrammarLesson"("status", "number");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarLesson_slug_version_key" ON "GrammarLesson"("slug", "version");

-- CreateIndex
CREATE INDEX "GrammarAttempt_userId_lessonId_submittedAt_idx" ON "GrammarAttempt"("userId", "lessonId", "submittedAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarAttempt_userId_submissionId_key" ON "GrammarAttempt"("userId", "submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarSetProgress_userId_lessonId_setId_key" ON "GrammarSetProgress"("userId", "lessonId", "setId");

-- CreateIndex
CREATE INDEX "GrammarReview_userId_nextReviewAt_idx" ON "GrammarReview"("userId", "nextReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrammarReview_userId_lessonId_questionId_key" ON "GrammarReview"("userId", "lessonId", "questionId");

-- AddForeignKey
ALTER TABLE "GrammarLesson" ADD CONSTRAINT "GrammarLesson_importedById_fkey" FOREIGN KEY ("importedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarLesson" ADD CONSTRAINT "GrammarLesson_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarAttempt" ADD CONSTRAINT "GrammarAttempt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarAttempt" ADD CONSTRAINT "GrammarAttempt_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "GrammarLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarSetProgress" ADD CONSTRAINT "GrammarSetProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarSetProgress" ADD CONSTRAINT "GrammarSetProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "GrammarLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarReview" ADD CONSTRAINT "GrammarReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrammarReview" ADD CONSTRAINT "GrammarReview_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "GrammarLesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "GrammarLesson_one_published_slug" ON "GrammarLesson"("slug") WHERE "status" = 'PUBLISHED';
ALTER TABLE "GrammarLesson" ADD CONSTRAINT "GrammarLesson_status_check" CHECK ("status" IN ('DRAFT', 'REVIEWED', 'PUBLISHED', 'ARCHIVED'));
ALTER TABLE "GrammarAttempt" ADD CONSTRAINT "GrammarAttempt_mode_check" CHECK ("mode" IN ('TEST', 'REVIEW'));
ALTER TABLE "GrammarSetProgress" ADD CONSTRAINT "GrammarSetProgress_score_check" CHECK ("total" > 0 AND "bestCorrect" >= 0 AND "bestCorrect" <= "total");
