import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { tabAttentionState } from "../src/lib/classroom/domain";

vi.mock("server-only", () => ({}));
const auth = vi.hoisted(() => ({ current: vi.fn() }));
vi.mock("@/lib/access", () => ({ getCurrentUser: auth.current }));

it("distinguishes visible, grace period, away, and stale signals at the boundaries", () => {
  const now = new Date("2026-10-07T03:00:00Z");
  const ago = (ms: number) => new Date(+now - ms);
  expect(tabAttentionState(null, null, null, now)).toBe("UNKNOWN");
  expect(tabAttentionState(true, ago(120000), ago(20000), now)).toBe("VISIBLE");
  expect(tabAttentionState(false, ago(29999), now, now)).toBe("AWAY_PENDING");
  expect(tabAttentionState(false, ago(30000), now, now)).toBe("AWAY");
  expect(tabAttentionState(false, ago(120000), ago(90000), now)).toBe("AWAY");
  expect(tabAttentionState(false, ago(120000), ago(90001), now)).toBe(
    "UNKNOWN",
  );
  expect(tabAttentionState(true, ago(120000), ago(90001), now)).toBe("UNKNOWN");
});

const enabled = process.env.CLASSROOM_DATABASE_QA === "1";
const db = new PrismaClient();
const prefix = `qa-tab-${randomUUID()}`;
const admin = { id: prefix + "-admin", role: "ADMIN" as const },
  teacher = { id: prefix + "-teacher", role: "TEACHER" as const },
  learner = { id: prefix + "-learner", role: "LEARNER" as const },
  outsider = { id: prefix + "-outsider", role: "TEACHER" as const };
const classId = prefix,
  sessionId = prefix + "-session",
  grantId = prefix + "-grant";
beforeAll(async () => {
  if (!enabled) return;
  if (
    !process.env.DATABASE_URL?.includes("localhost:5434/wewin_classroom_test")
  )
    throw new Error(
      "Attention database tests require the isolated local QA database.",
    );
  for (const actor of [admin, teacher, learner, outsider])
    await db.user.create({
      data: {
        ...actor,
        email: actor.id + "@example.invalid",
        name: actor.role,
      },
    });
  await db.classroom.create({
    data: { id: classId, code: prefix, title: "Tab QA" },
  });
  await db.classroomStaff.create({ data: { classId, userId: teacher.id } });
  await db.classroomEnrollment.create({
    data: { classId, userId: learner.id },
  });
  await db.classroomSession.create({
    data: {
      id: sessionId,
      classId,
      hostUserId: teacher.id,
      title: "Tab QA only",
      startsAt: new Date(Date.now() - 60000),
      endsAt: new Date(Date.now() + 1200000),
    },
  });
  await db.classroomJoinGrant.create({
    data: {
      id: grantId,
      sessionId,
      userId: learner.id,
      deviceId: "qa-tab-device",
      expiresAt: new Date(Date.now() + 1200000),
    },
  });
});
afterAll(async () => {
  if (enabled) {
    await db.classroomZoomEvent.deleteMany({ where: { meetingId: prefix } });
    await db.classroomJob.deleteMany({ where: { entityId: sessionId } });
    await db.classroomNotification.deleteMany({
      where: { userId: learner.id },
    });
    await db.classroomAudit.deleteMany({
      where: { actorId: { in: [admin.id, teacher.id] } },
    });
    await db.classroomJoinGrant.deleteMany({ where: { sessionId } });
    await db.classroomAttendance.deleteMany({ where: { sessionId } });
    await db.classroomSession.deleteMany({ where: { id: sessionId } });
    await db.classroomStaff.deleteMany({ where: { classId } });
    await db.classroomEnrollment.deleteMany({ where: { classId } });
    await db.classroom.deleteMany({ where: { id: classId } });
    await db.user.deleteMany({
      where: { id: { in: [admin.id, teacher.id, learner.id, outsider.id] } },
    });
  }
  await db.$disconnect();
});

it.skipIf(!enabled)(
  "authenticates reports, scopes the roster and preserves only the current state",
  async () => {
    const { classroomHTTP } = await import("../src/lib/classroom/http");
    const { clearExpiredAttention } =
      await import("../src/lib/classroom/attention");
    const { leaveOrRelease } = await import("../src/lib/classroom/zoom");
    const request = async (
      actor:
        typeof learner | typeof teacher | typeof admin | typeof outsider | null,
      method = "GET",
      body?: unknown,
    ) => {
      auth.current.mockResolvedValue(actor);
      return classroomHTTP(
        new Request(
          `http://localhost:3000/api/sessions/${sessionId}/attention`,
          {
            method,
            headers: {
              Origin: "http://localhost:3000",
              "Content-Type": "application/json",
            },
            ...(body ? { body: JSON.stringify(body) } : {}),
          },
        ),
        ["sessions", sessionId, "attention"],
      );
    };
    const signal = { grantId, deviceId: "qa-tab-device", visible: false };
    auth.current.mockResolvedValue(learner);
    const foreign = await classroomHTTP(
      new Request(`http://localhost:3000/api/sessions/${sessionId}/attention`, {
        method: "POST",
        headers: {
          Origin: "https://other.invalid",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signal),
      }),
      ["sessions", sessionId, "attention"],
    );
    expect(foreign.status).toBe(403);
    expect((await request(null)).status).toBe(401);
    expect((await request(outsider)).status).toBe(403);
    expect((await request(learner)).status).toBe(403);
    expect((await request(teacher, "POST", signal)).status).toBe(403);
    expect(
      (await request(learner, "POST", { ...signal, visible: "false" })).status,
    ).toBe(400);
    expect(
      (await request(learner, "POST", { ...signal, deviceId: "other-device" }))
        .status,
    ).toBe(403);
    expect(
      (await request(learner, "POST", { ...signal, grantId: "other-grant" }))
        .status,
    ).toBe(403);
    expect((await request(learner, "POST", signal)).status).toBe(200);
    const changedAt = new Date(Date.now() - 31000);
    await db.classroomJoinGrant.update({
      where: { id: grantId },
      data: { tabChangedAt: changedAt },
    });
    expect((await request(learner, "POST", signal)).status).toBe(200);
    expect(
      (
        await db.classroomJoinGrant.findUniqueOrThrow({
          where: { id: grantId },
        })
      ).tabChangedAt,
    ).toEqual(changedAt);
    const roster = await (await request(teacher)).json();
    expect(roster.learners).toMatchObject([
      { userId: learner.id, state: "AWAY", awaySince: changedAt.toISOString() },
    ]);
    expect((await request(admin)).status).toBe(200);
    expect(
      (await request(learner, "POST", { ...signal, visible: true })).status,
    ).toBe(200);
    expect((await (await request(teacher)).json()).learners[0]).toMatchObject({
      state: "VISIBLE",
      awaySince: null,
    });
    await db.classroomJoinGrant.update({
      where: { id: grantId },
      data: { tabSignalAt: new Date(Date.now() - 91000) },
    });
    expect((await (await request(teacher)).json()).learners[0].state).toBe(
      "UNKNOWN",
    );
    await clearExpiredAttention();
    expect(
      (
        await db.classroomJoinGrant.findUniqueOrThrow({
          where: { id: grantId },
        })
      ).tabSignalAt,
    ).toBeNull();
    await request(learner, "POST", signal);
    await leaveOrRelease(learner, sessionId, {}, false);
    expect((await request(learner, "POST", signal)).status).toBe(403);
    expect(
      (
        await db.classroomJoinGrant.findUniqueOrThrow({
          where: { id: grantId },
        })
      ).tabVisible,
    ).toBeNull();
    await db.classroomJoinGrant.update({
      where: { id: grantId },
      data: { state: "RESERVED", expiresAt: new Date(Date.now() - 1000) },
    });
    expect((await request(learner, "POST", signal)).status).toBe(403);
    await db.classroomJoinGrant.update({
      where: { id: grantId },
      data: { expiresAt: new Date(Date.now() + 60000) },
    });
    await db.classroomEnrollment.update({
      where: { classId_userId: { classId, userId: learner.id } },
      data: { status: "WITHDRAWN" },
    });
    expect((await request(learner, "POST", signal)).status).toBe(403);
    await db.classroomEnrollment.update({
      where: { classId_userId: { classId, userId: learner.id } },
      data: { status: "ACTIVE" },
    });
    await db.user.update({
      where: { id: learner.id },
      data: { isActive: false },
    });
    expect((await request(learner, "POST", signal)).status).toBe(403);
    await db.user.update({
      where: { id: learner.id },
      data: { isActive: true },
    });
    expect((await request(learner, "POST", signal)).status).toBe(200);
    await db.classroomSession.update({
      where: { id: sessionId },
      data: { meetingId: prefix },
    });
    await db.classroomZoomEvent.create({
      data: {
        id: prefix + "-ended",
        meetingId: prefix,
        meetingUuid: prefix,
        event: "meeting.ended",
        occurredAt: new Date(),
        payload: {},
      },
    });
    const { processEvents } = await import("../src/lib/classroom/events");
    await processEvents(prefix);
    expect(
      (
        await db.classroomJoinGrant.findUniqueOrThrow({
          where: { id: grantId },
        })
      ).tabSignalAt,
    ).toBeNull();
    expect((await request(learner, "POST", signal)).status).toBe(409);
    await db.classroomSession.update({
      where: { id: sessionId },
      data: { status: "SCHEDULED", confirmedEnd: null },
    });
    await request(learner, "POST", signal);
    await leaveOrRelease(
      teacher,
      sessionId,
      { userId: learner.id, reason: "QA device release" },
      true,
    );
    expect(
      (
        await db.classroomJoinGrant.findUniqueOrThrow({
          where: { id: grantId },
        })
      ).tabSignalAt,
    ).toBeNull();
    await db.classroomJoinGrant.update({
      where: { id: grantId },
      data: { state: "RESERVED" },
    });
    await request(learner, "POST", signal);
    const { cancelSession } = await import("../src/lib/classroom/service");
    await cancelSession(admin, sessionId, { revision: 0, reason: "QA cancel" });
    expect((await request(learner, "POST", signal)).status).toBe(409);
    expect(
      (
        await db.classroomJoinGrant.findUniqueOrThrow({
          where: { id: grantId },
        })
      ).tabSignalAt,
    ).toBeNull();
    expect((await (await request(teacher)).json()).learners[0].state).toBe(
      "UNKNOWN",
    );
  },
);
