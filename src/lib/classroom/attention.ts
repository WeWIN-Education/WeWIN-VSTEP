import "server-only";
import { prisma } from "@/lib/prisma";
import { sessionAccess, type Actor } from "./access";
import { joinWindow, requireValue, tabAttentionState, text } from "./domain";

export const clearedAttention = {
  tabVisible: null,
  tabChangedAt: null,
  tabSignalAt: null,
};

export async function recordAttention(
  actor: Actor,
  sessionId: string,
  input: Record<string, unknown>,
) {
  requireValue(
    actor.role === "LEARNER",
    "Chỉ học viên gửi trạng thái tab.",
    403,
  );
  requireValue(
    typeof input.visible === "boolean",
    "Trạng thái tab không hợp lệ.",
  );
  const visible = input.visible,
    grantId = text(input.grantId, 100),
    deviceId = text(input.deviceId, 100);
  return prisma.$transaction(async (db) => {
    // Share the device lock with join/leave: a released grant cannot be revived by a late signal.
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"live-user:" + actor.id}))`;
    const session = await sessionAccess(actor, sessionId, false, db),
      now = new Date();
    requireValue(
      ["SCHEDULED", "LIVE"].includes(session.status) &&
        joinWindow(session.startsAt, session.endsAt, false, now),
      "Buổi học không còn nhận trạng thái tab.",
      409,
    );
    const grant = await db.classroomJoinGrant.findFirst({
      where: {
        id: grantId,
        sessionId,
        userId: actor.id,
        deviceId,
        state: { in: ["RESERVED", "JOINED"] },
        expiresAt: { gt: now },
        user: { isActive: true },
        session: {
          classroom: {
            status: "ACTIVE",
            enrollments: {
              some: { userId: actor.id, status: "ACTIVE" },
            },
          },
        },
      },
    });
    requireValue(
      grant,
      "Bạn chưa vào lớp hoặc thiết bị không còn được giữ chỗ.",
      403,
    );
    const updated = await db.classroomJoinGrant.updateMany({
      where: {
        id: grant.id,
        state: { in: ["RESERVED", "JOINED"] },
        session: { status: { in: ["SCHEDULED", "LIVE"] } },
      },
      data: {
        tabVisible: visible,
        tabChangedAt:
          grant.tabVisible === visible && grant.tabChangedAt
            ? grant.tabChangedAt
            : now,
        tabSignalAt: now,
      },
    });
    requireValue(updated.count, "Buổi học hoặc chỗ đã kết thúc.", 409);
    return { ok: true };
  });
}

export async function listAttention(actor: Actor, sessionId: string) {
  requireValue(
    actor.role !== "LEARNER",
    "Chỉ giáo viên và admin xem trạng thái tab.",
    403,
  );
  const session = await sessionAccess(actor, sessionId),
    now = new Date(),
    live =
      ["SCHEDULED", "LIVE"].includes(session.status) &&
      +now <= +session.endsAt + 15 * 60000;
  const enrollments = await prisma.classroomEnrollment.findMany({
    where: {
      classId: session.classId,
      status: "ACTIVE",
      user: { isActive: true },
    },
    select: { userId: true, user: { select: { name: true } } },
  });
  const grants = await prisma.classroomJoinGrant.findMany({
    where: {
      sessionId,
      expiresAt: { gt: now },
      state: { in: ["RESERVED", "JOINED"] },
    },
    select: {
      userId: true,
      tabVisible: true,
      tabChangedAt: true,
      tabSignalAt: true,
    },
  });
  const byUser = new Map(grants.map((grant) => [grant.userId, grant]));
  return {
    serverTime: now.toISOString(),
    learners: enrollments.map(({ userId, user }) => {
      const grant = live ? byUser.get(userId) : undefined,
        state = tabAttentionState(
          grant?.tabVisible ?? null,
          grant?.tabChangedAt ?? null,
          grant?.tabSignalAt ?? null,
          now,
        );
      return {
        userId,
        name: user.name,
        state,
        awaySince:
          state === "AWAY" || state === "AWAY_PENDING"
            ? (grant?.tabChangedAt?.toISOString() ?? null)
            : null,
        lastSignalAt: grant?.tabSignalAt?.toISOString() ?? null,
      };
    }),
  };
}

export async function clearExpiredAttention() {
  return prisma.classroomJoinGrant.updateMany({
    where: {
      tabSignalAt: { not: null },
      OR: [
        { expiresAt: { lte: new Date() } },
        { tabSignalAt: { lt: new Date(Date.now() - 90000) } },
        { state: { in: ["LEFT", "RELEASED"] } },
        { session: { status: { in: ["ENDED", "CANCELED"] } } },
        { user: { isActive: false } },
      ],
    },
    data: clearedAttention,
  });
}
