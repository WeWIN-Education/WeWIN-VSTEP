CREATE TABLE "LearningContent" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "LearningContent_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "LearningContent_kind_check" CHECK ("kind" IN ('SKILL', 'EXERCISE')),
    CONSTRAINT "LearningContent_skill_check" CHECK ("skill" IN ('LISTENING', 'READING', 'WRITING', 'SPEAKING'))
);
CREATE UNIQUE INDEX "LearningContent_kind_code_key" ON "LearningContent"("kind", "code");
CREATE INDEX "LearningContent_kind_published_skill_createdAt_idx" ON "LearningContent"("kind", "published", "skill", "createdAt");
