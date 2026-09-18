ALTER TABLE "ExamAttempt" ADD COLUMN "grading" JSONB, ADD COLUMN "gradingStartedAt" TIMESTAMP(3);
ALTER TABLE "ExamAttempt" ADD COLUMN "currentUnit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VideoProgress" ADD COLUMN "watchedIntervals" JSONB, ADD COLUMN "quizAnswers" JSONB;
