import { beforeAll, afterAll, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { createHmac } from "node:crypto";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/access", () => ({ getCurrentUser: vi.fn() }));
const enabled = process.env.CLASSROOM_DATABASE_QA === "1";
const db = new PrismaClient(),
  suffix = Date.now().toString(36),
  prefix = `qa-classroom-${suffix}`,
  actor = { id: prefix + "-admin", role: "ADMIN" as const },
  teacher = { id: prefix + "-teacher", role: "TEACHER" as const },
  student = { id: prefix + "-student", role: "LEARNER" as const },
  other = { id: prefix + "-other", role: "LEARNER" as const };
let classId: string,
  assignmentId: string,
  sessionId: string,
  submissionId: string;
const meetingId = String(90000000000 + (Date.now() % 999999999));
beforeAll(async () => {
  if (!enabled) return;
  if (
    !process.env.DATABASE_URL?.includes("localhost:5434/wewin_classroom_test")
  )
    throw new Error(
      "Refusing database QA outside the isolated local test database.",
    );
  for (const a of [actor, teacher, student, other])
    await db.user.create({
      data: {
        id: a.id,
        email: a.id + "@example.invalid",
        name: a.role,
        role: a.role,
      },
    });
});
afterAll(async () => {
  if (enabled) {
    const classWhere = { classroom: { code: prefix } };
    await db.classroomJob.deleteMany({
      where: { entityId: { in: [meetingId, sessionId || ""] } },
    });
    await db.classroomZoomEvent.deleteMany({ where: { meetingId } });
    await db.classroomAttendance.deleteMany({ where: { session: classWhere } });
    await db.classroomJoinGrant.deleteMany({ where: { session: classWhere } });
    await db.classroomFile.deleteMany({ where: classWhere });
    await db.classroomDraft.deleteMany({ where: { assignment: classWhere } });
    await db.classroomSubmission.deleteMany({
      where: { assignment: classWhere },
    });
    await db.classroomAssignment.deleteMany({ where: classWhere });
    await db.classroomMaterial.deleteMany({ where: classWhere });
    await db.classroomSession.deleteMany({ where: classWhere });
    await db.classroomEnrollment.deleteMany({ where: classWhere });
    await db.classroomStaff.deleteMany({ where: classWhere });
    await db.classroom.deleteMany({ where: { code: prefix } });
    await db.zoomHost.deleteMany({ where: { userId: teacher.id } });
    await db.classroomNotification.deleteMany({
      where: { userId: { in: [actor.id, teacher.id, student.id, other.id] } },
    });
    await db.user.deleteMany({
      where: { id: { in: [actor.id, teacher.id, student.id, other.id] } },
    });
  }
  await db.$disconnect();
});
it.skipIf(!enabled)(
  "enforces role/scope, preserves submissions, resolves concurrent sends and audits final attendance",
  async () => {
    const service = await import("../src/lib/classroom/service"),
      access = await import("../src/lib/classroom/access");
    const data = {
      code: prefix,
      title: "QA only",
      description: "",
      capacity: 3,
      staffIds: [teacher.id],
      status: "ACTIVE",
    };
    await expect(service.saveClass(teacher, data)).rejects.toMatchObject({
      status: 403,
    });
    classId = (await service.saveClass(actor, data)).id;
    await expect(access.classAccess(other, classId)).rejects.toMatchObject({
      status: 403,
    });
    await service.enrollment(actor, classId, {
      userId: student.id,
      status: "ACTIVE",
    });
    await expect(
      service.enrollment(teacher, classId, {
        userId: other.id,
        status: "ACTIVE",
      }),
    ).rejects.toMatchObject({ status: 403 });
    await expect(
      service.enrollment(actor, classId, {
        userId: other.id,
        status: "ACTIVE",
      }),
    ).rejects.toMatchObject({ status: 409 });
    const material = await service.saveMaterial(teacher, classId, {
      title: "Học liệu",
      body: "Test",
      published: false,
    });
    expect(material.published).toBe(false);
    await expect(
      service.saveMaterial(
        teacher,
        classId,
        { title: "X", body: "", published: true, revision: 1 },
        material.id,
      ),
    ).rejects.toMatchObject({ status: 409 });
    const assignment = await service.saveAssignment(teacher, classId, {
      title: "Bài tập",
      instructions: "Write",
      published: true,
      dueAt: new Date(Date.now() - 1000).toISOString(),
    });
    assignmentId = assignment.id;
    const draft = await service.saveDraft(student, assignmentId, {
      body: "Draft",
      revision: 0,
    });
    expect(draft.revision).toBe(1);
    await expect(
      service.saveDraft(student, assignmentId, {
        body: "Overwrite",
        revision: 0,
      }),
    ).rejects.toMatchObject({ status: 409 });
    const [first, retry] = await Promise.all([
      service.submit(student, assignmentId, {
        body: "Answer",
        requestKey: "qa-same-key",
      }),
      service.submit(student, assignmentId, {
        body: "Answer",
        requestKey: "qa-same-key",
      }),
    ]);
    expect(first.id).toBe(retry.id);
    expect(first.late).toBe(true);
    submissionId = first.id;
    await expect(
      service.submit(student, assignmentId, {
        body: "Overwrite",
        requestKey: "qa-other-key",
      }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      service.grade(other, assignmentId, submissionId, {
        revision: 0,
        action: "RETURN",
        grade: 10,
        feedback: "",
      }),
    ).rejects.toMatchObject({ status: 403 });
    const graded = await service.grade(teacher, assignmentId, submissionId, {
      revision: 0,
      action: "RETURN",
      grade: 0,
      feedback: "Needs practice",
      reason: "QA",
    });
    expect(graded.grade).toBe(0);
    await service.grade(teacher, assignmentId, submissionId, {
      revision: 1,
      action: "REVISION",
      grade: null,
      feedback: "Please revise",
      reopenUntil: new Date(Date.now() + 3600000).toISOString(),
      reason: "QA",
    });
    const second = await service.submit(student, assignmentId, {
      body: "Revised",
      requestKey: "qa-version-two",
    });
    expect(second.version).toBe(2);
    expect(
      (
        await db.classroomSubmission.findUniqueOrThrow({
          where: { id: first.id },
        })
      ).body,
    ).toBe("Answer");
    expect(
      (await db.user.findUniqueOrThrow({ where: { id: student.id } })).xp,
    ).toBe(0);
    sessionId = (
      await db.classroomSession.create({
        data: {
          classId,
          hostUserId: teacher.id,
          title: "QA session",
          startsAt: new Date(Date.now() - 3600000),
          endsAt: new Date(),
          status: "ENDED",
        },
      })
    ).id;
    await expect(
      service.confirmAttendance(teacher, sessionId, {
        userId: student.id,
        finalStatus: "PRESENT",
        reason: "",
      }),
    ).rejects.toMatchObject({ status: 400 });
    await service.confirmAttendance(teacher, sessionId, {
      userId: student.id,
      finalStatus: "EXCUSED",
      reason: "Verified absence",
    });
    await db.classroomAttendance.update({
      where: { sessionId_userId: { sessionId, userId: student.id } },
      data: { minutes: 50, suggestion: "PRESENT" },
    });
    expect(
      (
        await db.classroomAttendance.findUniqueOrThrow({
          where: { sessionId_userId: { sessionId, userId: student.id } },
        })
      ).finalStatus,
    ).toBe("EXCUSED");
    expect(
      await db.classroomAudit.count({
        where: { entityId: sessionId, action: "ATTENDANCE_CONFIRM" },
      }),
    ).toBe(1);
    // One device, authorized release, and a signed attendance replay using isolated fixtures.
    const zoom = await import("../src/lib/classroom/zoom"),
      domain = await import("../src/lib/classroom/domain");
    const start = new Date(Date.now() + 60000),
      end = new Date(+start + 3600000);
    vi.stubEnv("ZOOM_MEETING_SDK_KEY", "qa-sdk-key");
    vi.stubEnv("ZOOM_MEETING_SDK_SECRET", "qa-sdk-secret");
    await db.classroomSession.update({
      where: { id: sessionId },
      data: {
        status: "SCHEDULED",
        startsAt: start,
        endsAt: end,
        meetingId,
        zoomState: "READY",
        passcodeEncrypted: domain.encrypt("qa-pass"),
        joinUrlEncrypted: domain.encrypt("https://zoom.us/j/" + meetingId),
      },
    });
    const joinActor = {
      ...student,
      name: "QA",
      email: student.id + "@example.invalid",
    };
    const firstGrant = await zoom.joinContext(joinActor, sessionId, {
      deviceId: "qa-device-1",
    });
    expect(firstGrant.role).toBe(0);
    expect(firstGrant.zak).toBeUndefined();
    expect(
      (
        await zoom.joinContext(joinActor, sessionId, {
          deviceId: "qa-device-1",
        })
      ).grantId,
    ).toBe(firstGrant.grantId);
    await expect(
      zoom.joinContext(joinActor, sessionId, { deviceId: "qa-device-2" }),
    ).rejects.toMatchObject({ status: 409 });
    await expect(
      zoom.leaveOrRelease(
        teacher,
        sessionId,
        { userId: student.id, reason: "" },
        true,
      ),
    ).rejects.toMatchObject({ status: 400 });
    await zoom.leaveOrRelease(
      teacher,
      sessionId,
      { userId: student.id, reason: "QA verified device transfer" },
      true,
    );
    const grant = await zoom.joinContext(joinActor, sessionId, {
      deviceId: "qa-device-2",
    });
    const { POST } = await import("../src/app/api/zoom/webhook/route");
    const secret = "qa-event-secret";
    vi.stubEnv("ZOOM_WEBHOOK_SECRET", secret);
    async function deliver(
      event: string,
      minutes: number,
      participant?: Record<string, unknown>,
    ) {
      const at = new Date(+start + minutes * 60000).toISOString();
      const object = {
        id: meetingId,
        uuid: prefix,
        start_time: start.toISOString(),
        ...(event === "meeting.ended" ? { end_time: at } : {}),
        ...(participant ? { participant } : {}),
      };
      const raw = JSON.stringify({
          event,
          event_ts: +new Date(at),
          payload: { object },
        }),
        ts = String(Math.floor(Date.now() / 1000));
      const mac = createHmac("sha256", secret)
        .update(`v0:${ts}:${raw}`)
        .digest("hex");
      expect(
        (
          await POST(
            new Request("http://localhost/api/zoom/webhook", {
              method: "POST",
              body: raw,
              headers: {
                "x-zm-request-timestamp": ts,
                "x-zm-signature": `v0=${mac}`,
              },
            }),
          )
        ).status,
      ).toBe(204);
    }
    const participant = (id: string, joined: number, left?: number) => ({
      id,
      customer_key: grant.grantId,
      join_time: new Date(+start + joined * 60000).toISOString(),
      ...(left !== undefined
        ? { leave_time: new Date(+start + left * 60000).toISOString() }
        : {}),
    });
    // Deliver in reverse order; overlapping reconnects must merge into exactly 50 minutes.
    await deliver("meeting.ended", 60);
    await deliver("meeting.participant_left", 50, participant("two", 20, 50));
    await deliver("meeting.participant_left", 30, participant("one", 0, 30));
    await deliver("meeting.participant_joined", 20, participant("two", 20));
    await deliver("meeting.participant_joined", 0, participant("one", 0));
    await deliver("meeting.participant_joined", 0, participant("one", 0));
    await deliver("meeting.started", 0);
    const events = await import("../src/lib/classroom/events");
    await events.processEvents(meetingId);
    await events.processEvents(meetingId);
    expect(await db.classroomZoomEvent.count({ where: { meetingId } })).toBe(6);
    expect(
      await db.classroomAttendance.findUniqueOrThrow({
        where: { sessionId_userId: { sessionId, userId: student.id } },
      }),
    ).toMatchObject({
      minutes: 50,
      suggestion: "PRESENT",
      finalStatus: "EXCUSED",
    });
    // Provider mocks cover an old worker completing after a newer schedule, without Zoom access.
    await db.zoomHost.create({
      data: {
        userId: teacher.id,
        zoomUserId: prefix,
        email: teacher.id + "@example.invalid",
        licensed: true,
        verified: true,
      },
    });
    await db.classroomSession.update({
      where: { id: sessionId },
      data: { status: "SCHEDULED", zoomState: "UPDATE_PENDING" },
    });
    vi.stubEnv("ZOOM_ACCOUNT_ID", "qa-account");
    vi.stubEnv("ZOOM_OAUTH_CLIENT_ID", "qa-id");
    vi.stubEnv("ZOOM_OAUTH_CLIENT_SECRET", "qa-secret");
    const provider = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        if (String(input).includes("oauth/token"))
          return Response.json({ access_token: "qa-token", expires_in: 3600 });
        if (init?.method === "PATCH") {
          await db.classroomSession.update({
            where: { id: sessionId },
            data: { revision: { increment: 1 }, title: "New schedule" },
          });
          return new Response(null, { status: 204 });
        }
        return Response.json({ host_id: prefix });
      },
    );
    vi.stubGlobal("fetch", provider);
    try {
      await zoom.syncMeeting(sessionId);
    } finally {
      vi.unstubAllGlobals();
    }
    expect(
      (
        await db.classroomSession.findUniqueOrThrow({
          where: { id: sessionId },
        })
      ).zoomState,
    ).toBe("UPDATE_PENDING");
    expect(
      await db.classroomJob.count({
        where: {
          entityId: sessionId,
          kind: "ZOOM_SYNC",
          key: { startsWith: "zoom-stale:" },
        },
      }),
    ).toBe(1);
    vi.unstubAllEnvs();
    await service.enrollment(actor, classId, {
      userId: student.id,
      status: "WITHDRAWN",
    });
    await expect(access.classAccess(student, classId)).rejects.toMatchObject({
      status: 403,
    });
  },
  30000,
);
