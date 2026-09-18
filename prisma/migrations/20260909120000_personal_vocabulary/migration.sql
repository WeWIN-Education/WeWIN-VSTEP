-- Personal vocabulary entries created by an individual learner.
CREATE TABLE "PersonalVocabulary" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "ipa" TEXT,
    "meaningVi" TEXT NOT NULL,
    "exampleEn" TEXT,
    "note" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "VocabularyProgressStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PersonalVocabulary_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PersonalVocabulary_userId_status_idx" ON "PersonalVocabulary"("userId", "status");
CREATE INDEX "PersonalVocabulary_userId_term_idx" ON "PersonalVocabulary"("userId", "term");
ALTER TABLE "PersonalVocabulary" ADD CONSTRAINT "PersonalVocabulary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
