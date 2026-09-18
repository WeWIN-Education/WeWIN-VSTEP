CREATE TABLE "LearningMaterial" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "programme" TEXT NOT NULL DEFAULT 'VSTEP',
    "skill" TEXT NOT NULL DEFAULT 'GENERAL',
    "level" TEXT,
    "fileName" TEXT NOT NULL,
    "storageName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "uploadedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningMaterial_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LearningMaterial_storageName_key" ON "LearningMaterial"("storageName");
CREATE INDEX "LearningMaterial_published_programme_skill_createdAt_idx" ON "LearningMaterial"("published", "programme", "skill", "createdAt");
CREATE INDEX "LearningMaterial_uploadedById_createdAt_idx" ON "LearningMaterial"("uploadedById", "createdAt");

ALTER TABLE "LearningMaterial" ADD CONSTRAINT "LearningMaterial_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
