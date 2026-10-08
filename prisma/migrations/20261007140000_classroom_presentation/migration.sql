ALTER TABLE "ClassroomFile" ADD COLUMN "previewPageCount" INTEGER, ADD COLUMN "previewError" TEXT;
ALTER TABLE "ClassroomWorker" ADD COLUMN "scannerOk" BOOLEAN, ADD COLUMN "scannerCheckedAt" TIMESTAMP(3);
CREATE TABLE "ClassroomPresentation" (
  "sessionId" TEXT NOT NULL PRIMARY KEY,
  "fileId" TEXT,
  "page" INTEGER NOT NULL DEFAULT 1,
  "revision" INTEGER NOT NULL DEFAULT 0,
  "controllerId" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ClassroomPresentation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ClassroomPresentation_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "ClassroomFile"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "ClassroomPresentation_page_check" CHECK ("page" > 0)
);
