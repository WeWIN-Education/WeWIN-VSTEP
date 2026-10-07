-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'TEACHER';

-- CreateTable
CREATE TABLE "Classroom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "capacity" INTEGER NOT NULL DEFAULT 30,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Classroom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomEnrollment" (
    "classId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomEnrollment_pkey" PRIMARY KEY ("classId","userId")
);

-- CreateTable
CREATE TABLE "ClassroomStaff" (
    "classId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "ClassroomStaff_pkey" PRIMARY KEY ("classId","userId")
);

-- CreateTable
CREATE TABLE "ZoomHost" (
    "userId" TEXT NOT NULL,
    "zoomUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "licensed" BOOLEAN NOT NULL DEFAULT false,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ZoomHost_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ClassroomSession" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "hostUserId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "meetingId" TEXT,
    "passcodeEncrypted" TEXT,
    "joinUrlEncrypted" TEXT,
    "zoomState" TEXT NOT NULL DEFAULT 'PENDING',
    "zoomCreateStarted" BOOLEAN NOT NULL DEFAULT false,
    "confirmedStart" TIMESTAMP(3),
    "confirmedEnd" TIMESTAMP(3),

    CONSTRAINT "ClassroomSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomJoinGrant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'RESERVED',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomJoinGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomMaterial" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sessionId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "sourceKind" TEXT,
    "sourceId" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomAssignment" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sessionId" TEXT,
    "title" TEXT NOT NULL,
    "instructions" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3) NOT NULL,
    "published" BOOLEAN NOT NULL DEFAULT false,
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomDraft" (
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "reopenUntil" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomDraft_pkey" PRIMARY KEY ("assignmentId","userId")
);

-- CreateTable
CREATE TABLE "ClassroomSubmission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "late" BOOLEAN NOT NULL,
    "requestKey" TEXT NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "grade" DOUBLE PRECISION,
    "feedback" TEXT NOT NULL DEFAULT '',
    "gradedById" TEXT,
    "gradedAt" TIMESTAMP(3),
    "revision" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClassroomSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomAttendance" (
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "minutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "late" BOOLEAN NOT NULL DEFAULT false,
    "suggestion" TEXT NOT NULL DEFAULT 'PENDING',
    "finalStatus" TEXT,
    "reason" TEXT NOT NULL DEFAULT '',
    "confirmedById" TEXT,
    "confirmedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassroomAttendance_pkey" PRIMARY KEY ("sessionId","userId")
);

-- CreateTable
CREATE TABLE "ClassroomFile" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "materialId" TEXT,
    "assignmentId" TEXT,
    "submissionId" TEXT,
    "name" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "cleanKey" TEXT,
    "state" TEXT NOT NULL DEFAULT 'UPLOADING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "href" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomZoomEvent" (
    "id" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "meetingUuid" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB NOT NULL,
    "processedAt" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomZoomEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomJob" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseToken" TEXT,
    "leaseExpiresAt" TIMESTAMP(3),
    "error" TEXT,
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassroomWorker" (
    "id" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClassroomWorker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Classroom_code_key" ON "Classroom"("code");

-- CreateIndex
CREATE INDEX "ClassroomEnrollment_userId_status_idx" ON "ClassroomEnrollment"("userId", "status");

-- CreateIndex
CREATE INDEX "ClassroomStaff_userId_idx" ON "ClassroomStaff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ZoomHost_zoomUserId_key" ON "ZoomHost"("zoomUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomSession_meetingId_key" ON "ClassroomSession"("meetingId");

-- CreateIndex
CREATE INDEX "ClassroomSession_classId_startsAt_idx" ON "ClassroomSession"("classId", "startsAt");

-- CreateIndex
CREATE INDEX "ClassroomSession_hostUserId_startsAt_endsAt_idx" ON "ClassroomSession"("hostUserId", "startsAt", "endsAt");

-- CreateIndex
CREATE INDEX "ClassroomJoinGrant_userId_state_expiresAt_idx" ON "ClassroomJoinGrant"("userId", "state", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomJoinGrant_sessionId_userId_key" ON "ClassroomJoinGrant"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "ClassroomMaterial_classId_published_idx" ON "ClassroomMaterial"("classId", "published");

-- CreateIndex
CREATE INDEX "ClassroomAssignment_classId_published_dueAt_idx" ON "ClassroomAssignment"("classId", "published", "dueAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomSubmission_assignmentId_userId_version_key" ON "ClassroomSubmission"("assignmentId", "userId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomSubmission_userId_requestKey_key" ON "ClassroomSubmission"("userId", "requestKey");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomFile_storageKey_key" ON "ClassroomFile"("storageKey");

-- CreateIndex
CREATE INDEX "ClassroomFile_classId_state_idx" ON "ClassroomFile"("classId", "state");

-- CreateIndex
CREATE INDEX "ClassroomNotification_userId_readAt_createdAt_idx" ON "ClassroomNotification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomNotification_userId_eventKey_key" ON "ClassroomNotification"("userId", "eventKey");

-- CreateIndex
CREATE INDEX "ClassroomAudit_entityId_createdAt_idx" ON "ClassroomAudit"("entityId", "createdAt");

-- CreateIndex
CREATE INDEX "ClassroomZoomEvent_meetingId_occurredAt_idx" ON "ClassroomZoomEvent"("meetingId", "occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClassroomJob_key_key" ON "ClassroomJob"("key");

-- CreateIndex
CREATE INDEX "ClassroomJob_status_availableAt_leaseExpiresAt_idx" ON "ClassroomJob"("status", "availableAt", "leaseExpiresAt");

-- AddForeignKey
ALTER TABLE "ClassroomEnrollment" ADD CONSTRAINT "ClassroomEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomEnrollment" ADD CONSTRAINT "ClassroomEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomStaff" ADD CONSTRAINT "ClassroomStaff_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomStaff" ADD CONSTRAINT "ClassroomStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ZoomHost" ADD CONSTRAINT "ZoomHost_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomSession" ADD CONSTRAINT "ClassroomSession_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomSession" ADD CONSTRAINT "ClassroomSession_hostUserId_fkey" FOREIGN KEY ("hostUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomJoinGrant" ADD CONSTRAINT "ClassroomJoinGrant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomJoinGrant" ADD CONSTRAINT "ClassroomJoinGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomMaterial" ADD CONSTRAINT "ClassroomMaterial_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomMaterial" ADD CONSTRAINT "ClassroomMaterial_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAssignment" ADD CONSTRAINT "ClassroomAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomDraft" ADD CONSTRAINT "ClassroomDraft_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomDraft" ADD CONSTRAINT "ClassroomDraft_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomSubmission" ADD CONSTRAINT "ClassroomSubmission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomSubmission" ADD CONSTRAINT "ClassroomSubmission_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAttendance" ADD CONSTRAINT "ClassroomAttendance_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ClassroomSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomAttendance" ADD CONSTRAINT "ClassroomAttendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomFile" ADD CONSTRAINT "ClassroomFile_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Classroom"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomFile" ADD CONSTRAINT "ClassroomFile_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomFile" ADD CONSTRAINT "ClassroomFile_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "ClassroomMaterial"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomFile" ADD CONSTRAINT "ClassroomFile_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "ClassroomAssignment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomFile" ADD CONSTRAINT "ClassroomFile_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "ClassroomSubmission"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassroomNotification" ADD CONSTRAINT "ClassroomNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
