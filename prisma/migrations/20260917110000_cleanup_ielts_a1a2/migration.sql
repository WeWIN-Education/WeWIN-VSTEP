-- Product cleanup is intentionally idempotent. Programme.IELTS remains in the enum
-- for migration compatibility, but it must not remain active in the product.
DELETE FROM "QuestionBookmark"
WHERE "examPaperId" IN (SELECT "id" FROM "ExamPaper" WHERE "programme" = 'IELTS');
DELETE FROM "GuestAttemptUse"
WHERE "examPaperId" IN (SELECT "id" FROM "ExamPaper" WHERE "programme" = 'IELTS');
DELETE FROM "ExamAttempt"
WHERE "examPaperId" IN (SELECT "id" FROM "ExamPaper" WHERE "programme" = 'IELTS');
DELETE FROM "ExamPaper"
WHERE "programme" = 'IELTS';
DELETE FROM "PracticeItem"
WHERE "programme" = 'IELTS';
DELETE FROM "ProgrammeEnrollment"
WHERE "programme" = 'IELTS';

DELETE FROM "VocabularyProgress"
WHERE "entryId" IN (
  SELECT e."id"
  FROM "VocabularyEntry" e
  INNER JOIN "VocabularyCollection" c ON c."id" = e."collectionId"
  WHERE c."code" IN ('A1_A2', 'A1-A2')
);
DELETE FROM "VocabularyEntry"
WHERE "collectionId" IN (SELECT "id" FROM "VocabularyCollection" WHERE "code" IN ('A1_A2', 'A1-A2'));
DELETE FROM "VocabularyTopic"
WHERE "collectionId" IN (SELECT "id" FROM "VocabularyCollection" WHERE "code" IN ('A1_A2', 'A1-A2'));
DELETE FROM "VocabularyImport"
WHERE "collectionId" IN (SELECT "id" FROM "VocabularyCollection" WHERE "code" IN ('A1_A2', 'A1-A2'));
DELETE FROM "VocabularyCollection"
WHERE "code" IN ('A1_A2', 'A1-A2');
