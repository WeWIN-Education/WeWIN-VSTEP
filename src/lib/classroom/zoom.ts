import "server-only";
import { clearedAttention } from "./attention";
import { prisma } from "@/lib/prisma";
import {
  audit,
  classAccess,
  enqueue,
  sessionAccess,
  type Actor,
} from "./access";
import {
  decrypt,
  encrypt,
  joinWindow,
  requireValue,
  sdkSignature,
  text,
  zoomHostAllowed,
} from "./domain";

let token: { value: string; expires: number } | undefined;
let refreshing: Promise<string> | undefined;
async function accessToken() {
  if (token && token.expires > Date.now() + 60000) return token.value;
  return (refreshing ??= (async () => {
    try {
      const id = process.env.ZOOM_ACCOUNT_ID,
        key = process.env.ZOOM_OAUTH_CLIENT_ID,
        secret = process.env.ZOOM_OAUTH_CLIENT_SECRET;
      requireValue(id && key && secret, "Chưa cấu hình Zoom OAuth.", 503);
      const response = await fetch(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${encodeURIComponent(id)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`${key}:${secret}`).toString("base64")}`,
          },
          signal: AbortSignal.timeout(8000),
        },
      );
      requireValue(response.ok, "Không thể xác thực Zoom.", 503);
      const data = await response.json();
      requireValue(
        typeof data.access_token === "string",
        "Zoom không trả token.",
        503,
      );
      token = {
        value: data.access_token,
        expires: Date.now() + Number(data.expires_in) * 1000,
      };
      return token.value;
    } finally {
      refreshing = undefined;
    }
  })());
}
export async function zoomApi(path: string, method = "GET", body?: unknown) {
  const response = await fetch(`https://api.zoom.us/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(8000),
  });
  requireValue(
    !(
      method === "GET" &&
      path.startsWith("/users/") &&
      response.status === 404
    ),
    "Không tìm thấy email host trong tài khoản Zoom đã kết nối. Hãy dùng email thuộc tài khoản này.",
  );
  requireValue(
    response.ok || (method === "DELETE" && response.status === 404),
    `Zoom chưa xử lý được yêu cầu (${response.status}).`,
    503,
  );
  return response.status === 204 || response.status === 404
    ? {}
    : response.json();
}
export async function verifyHost(actor: Actor, input: Record<string, unknown>) {
  requireValue(
    actor.role === "ADMIN",
    "Chỉ quản trị viên được xác minh host.",
    403,
  );
  const userId = text(input.userId),
    email = text(input.email, 254);
  requireValue(
    await prisma.user.findFirst({
      where: { id: userId, role: { in: ["TEACHER", "ADMIN"] }, isActive: true },
    }),
    "Tài khoản giáo viên không hợp lệ.",
  );
  const host = await zoomApi(`/users/${encodeURIComponent(email)}`);
  requireValue(
    host.account_id === process.env.ZOOM_ACCOUNT_ID && host.status === "active",
    "Host phải đang hoạt động và thuộc tài khoản Zoom đã kết nối.",
  );
  requireValue(
    zoomHostAllowed(host.type !== 1),
    "Host đang dùng Zoom Basic. Quản trị viên cần bật ZOOM_ALLOW_BASIC để thử buổi học tối đa 40 phút, hoặc cấp giấy phép Zoom cho host.",
  );
  return prisma.zoomHost.upsert({
    where: { userId },
    create: {
      userId,
      email: host.email,
      zoomUserId: host.id,
      verified: true,
      licensed: host.type !== 1,
    },
    update: {
      email: host.email,
      zoomUserId: host.id,
      verified: true,
      licensed: host.type !== 1,
      checkedAt: new Date(),
    },
  });
}
export async function syncMeeting(sessionId: string) {
  const row = await prisma.$transaction(
    async (db) => {
      await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"zoom:" + sessionId}))`;
      const session = await db.classroomSession.findUnique({
        where: { id: sessionId },
        include: { host: { include: { zoomHost: true } } },
      });
      if (
        !session ||
        ["READY", "DELETED", "NEEDS_RECONCILE"].includes(session.zoomState)
      )
        return null;
      if (session.status === "CANCELED" && !session.meetingId) {
        await db.classroomSession.update({
          where: { id: sessionId },
          data: { zoomState: "DELETED" },
        });
        return null;
      }
      if (!session.meetingId) {
        encrypt(""); // Validate storage encryption before creating anything at Zoom.
        if (session.zoomCreateStarted) {
          await db.classroomSession.update({
            where: { id: sessionId },
            data: { zoomState: "NEEDS_RECONCILE" },
          });
          return null;
        }
        const host = session.host.zoomHost;
        requireValue(
          session.host.isActive &&
            host?.verified &&
            zoomHostAllowed(host.licensed),
          "Host chưa được xác minh.",
          503,
        );
        const current = await zoomApi(
          `/users/${encodeURIComponent(host.zoomUserId)}`,
        );
        requireValue(
          current.account_id === process.env.ZOOM_ACCOUNT_ID &&
            zoomHostAllowed(current.type !== 1) &&
            current.status === "active",
          "Giấy phép/host Zoom không còn hợp lệ.",
          503,
        );
        requireValue(
          current.type !== 1 ||
            +session.endsAt - +session.startsAt <= 40 * 60000,
          "Buổi thử với host Basic cần ngắn hơn hoặc bằng 40 phút.",
          503,
        );
        await db.classroomSession.update({
          where: { id: sessionId },
          data: { zoomCreateStarted: true, zoomState: "CREATING" },
        });
      }
      return session;
    },
    { timeout: 15000 },
  );
  if (!row) return;
  const host = row.host.zoomHost!;
  if (row.status === "CANCELED") {
    if (row.meetingId) await zoomApi(`/meetings/${row.meetingId}`, "DELETE");
    await prisma.classroomSession.updateMany({
      where: { id: sessionId, revision: row.revision },
      data: { zoomState: "DELETED" },
    });
    return;
  }
  const data = {
    topic: row.title,
    start_time: row.startsAt.toISOString(),
    duration: Math.ceil((+row.endsAt - +row.startsAt) / 60000),
    timezone: "Asia/Ho_Chi_Minh",
  };
  if (row.meetingId) {
    await zoomApi(`/meetings/${row.meetingId}`, "PATCH", {
      ...data,
      schedule_for: host.zoomUserId,
    });
    const checked = await zoomApi(`/meetings/${row.meetingId}`);
    requireValue(
      checked.host_id === host.zoomUserId,
      "Chưa xác nhận đổi host.",
      503,
    );
    await prisma.$transaction(async (db) => {
      const current = await db.classroomSession.findUniqueOrThrow({
        where: { id: sessionId },
      });
      if (current.revision === row.revision && current.status !== "CANCELED") {
        await db.classroomSession.updateMany({
          where: { id: sessionId, revision: row.revision },
          data: { zoomState: "READY" },
        });
      } else {
        // An older worker may finish after a newer schedule: reconcile the provider again.
        await db.classroomSession.update({
          where: { id: sessionId },
          data: {
            zoomState:
              current.status === "CANCELED"
                ? "DELETE_PENDING"
                : "UPDATE_PENDING",
          },
        });
        await enqueue(
          db,
          `zoom-stale:${sessionId}:${Date.now()}`,
          "ZOOM_SYNC",
          sessionId,
        );
      }
    });
    return;
  }
  try {
    const meeting = await zoomApi(
      `/users/${encodeURIComponent(host.zoomUserId)}/meetings`,
      "POST",
      {
        ...data,
        type: 2,
        agenda: `WEWIN_SESSION:${sessionId}`,
        settings: {
          waiting_room: true,
          join_before_host: false,
          mute_upon_entry: true,
          auto_recording: "none",
        },
      },
    );
    const encrypted = {
      meetingId: String(meeting.id),
      passcodeEncrypted: encrypt(meeting.password || ""),
      joinUrlEncrypted: encrypt(meeting.join_url),
    };
    await prisma.$transaction(async (db) => {
      const current = await db.classroomSession.findUniqueOrThrow({
        where: { id: sessionId },
      });
      await db.classroomSession.update({
        where: { id: sessionId },
        data: {
          ...encrypted,
          zoomState:
            current.status === "CANCELED"
              ? "DELETE_PENDING"
              : current.revision === row.revision
                ? "READY"
                : "UPDATE_PENDING",
        },
      });
      await enqueue(
        db,
        `events-created:${sessionId}`,
        "ZOOM_EVENT",
        String(meeting.id),
      );
      if (current.status === "CANCELED" || current.revision !== row.revision)
        await enqueue(
          db,
          `zoom-after:${sessionId}:${current.revision}`,
          "ZOOM_SYNC",
          sessionId,
        );
    });
  } catch (e) {
    await prisma.classroomSession.update({
      where: { id: sessionId },
      data: { zoomState: "NEEDS_RECONCILE" },
    });
    throw e;
  }
}
export async function reconcileMeeting(
  actor: Actor,
  id: string,
  input: Record<string, unknown>,
) {
  requireValue(actor.role === "ADMIN", "Chỉ quản trị viên được đối soát.", 403);
  const row = await sessionAccess(actor, id),
    meetingId = text(input.meetingId, 32);
  requireValue(/^\d{9,12}$/.test(meetingId), "Mã phòng Zoom không hợp lệ.");
  const meeting = await zoomApi(`/meetings/${meetingId}`),
    host = await prisma.zoomHost.findUnique({
      where: { userId: row.hostUserId },
    });
  requireValue(
    host &&
      meeting.host_id === host.zoomUserId &&
      meeting.agenda === `WEWIN_SESSION:${id}`,
    "Phòng không đúng host hoặc mã buổi WEWIN.",
  );
  return prisma.$transaction(async (db) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"zoom:" + id}))`;
    const current = await db.classroomSession.findUniqueOrThrow({
      where: { id },
    });
    requireValue(
      current.zoomState === "NEEDS_RECONCILE",
      "Buổi không cần đối soát.",
      409,
    );
    const saved = await db.classroomSession.update({
      where: { id },
      data: {
        meetingId,
        passcodeEncrypted: encrypt(meeting.password || ""),
        joinUrlEncrypted: encrypt(meeting.join_url),
        zoomState:
          current.status === "CANCELED" ? "DELETE_PENDING" : "UPDATE_PENDING",
      },
    });
    await enqueue(db, `reconcile:${id}:${Date.now()}`, "ZOOM_SYNC", id);
    await enqueue(
      db,
      `events-reconcile:${id}:${Date.now()}`,
      "ZOOM_EVENT",
      meetingId,
    );
    await audit(db, actor, "ZOOM_RECONCILE", id, { meetingId });
    return { id: saved.id, zoomState: saved.zoomState };
  });
}
export async function joinContext(
  actor: Actor & { name: string | null; email: string },
  id: string,
  input: Record<string, unknown>,
) {
  const deviceId = text(input.deviceId, 100);
  const result = await prisma.$transaction(async (db) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"live-user:" + actor.id}))`;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"live-session:" + id}))`;
    const row = await sessionAccess(actor, id, false, db),
      classroom = await classAccess(actor, row.classId, false, db),
      staff = actor.role !== "LEARNER",
      now = new Date();
    requireValue(
      classroom.status === "ACTIVE" &&
        ["SCHEDULED", "LIVE"].includes(row.status) &&
        joinWindow(row.startsAt, row.endsAt, staff, now),
      "Chưa tới giờ vào lớp hoặc buổi đã kết thúc.",
      409,
    );
    requireValue(
      row.meetingId &&
        row.zoomState === "READY" &&
        row.passcodeEncrypted &&
        row.joinUrlEncrypted,
      "Phòng Zoom đang chuẩn bị. Vui lòng thử lại sau.",
      503,
    );
    if (!staff) {
      requireValue(
        await db.classroomEnrollment.findFirst({
          where: { classId: row.classId, userId: actor.id, status: "ACTIVE" },
        }),
        "Bạn không còn được vào lớp.",
        403,
      );
      const other = await db.classroomJoinGrant.findFirst({
        where: {
          userId: actor.id,
          expiresAt: { gt: now },
          state: { in: ["RESERVED", "JOINED", "LEFT"] },
        },
      });
      requireValue(
        !other || (other.sessionId === id && other.deviceId === deviceId),
        "Bạn đã giữ chỗ trên thiết bị/buổi khác. Nhờ giáo viên xác nhận chuyển thiết bị.",
        409,
      );
      const seats = await db.classroomJoinGrant.count({
          where: {
            sessionId: id,
            userId: { not: actor.id },
            user: { role: "LEARNER" },
            state: { in: ["RESERVED", "JOINED", "LEFT"] },
            expiresAt: { gt: now },
          },
        }),
        staffCount = await db.classroomStaff.count({
          where: { classId: row.classId },
        });
      requireValue(
        seats < classroom.capacity - Math.max(2, staffCount),
        "Phòng đã đủ chỗ.",
        409,
      );
    }
    const grant = await db.classroomJoinGrant.upsert({
      where: { sessionId_userId: { sessionId: id, userId: actor.id } },
      create: {
        sessionId: id,
        userId: actor.id,
        deviceId,
        expiresAt: new Date(+row.endsAt + 15 * 60000),
      },
      update: {
        deviceId,
        state: "RESERVED",
        ...clearedAttention,
        expiresAt: new Date(+row.endsAt + 15 * 60000),
      },
    });
    return { row, grant };
  });
  const { row, grant } = result,
    role = actor.id === row.hostUserId ? 1 : 0;
  let zak: string | undefined;
  if (role === 1) {
    const host = await prisma.zoomHost.findUnique({
      where: { userId: actor.id },
    });
    requireValue(host?.verified, "Host chưa được xác minh.", 503);
    zak = (
      await zoomApi(
        `/users/${encodeURIComponent(host.zoomUserId)}/token?type=zak`,
      )
    ).token;
    requireValue(zak, "Zoom chưa cấp quyền host.", 503);
  }
  return {
    sdkKey: process.env.ZOOM_MEETING_SDK_KEY,
    signature: sdkSignature(row.meetingId!, role),
    meetingNumber: row.meetingId!,
    password: decrypt(row.passcodeEncrypted!),
    userName: actor.name || actor.email,
    customerKey: grant.id,
    grantId: grant.id,
    role,
    zak,
    appUrl: decrypt(row.joinUrlEncrypted!),
  };
}
export async function leaveOrRelease(
  actor: Actor,
  id: string,
  input: Record<string, unknown>,
  release: boolean,
) {
  return prisma.$transaction(async (db) => {
    const session = await sessionAccess(actor, id, release, db),
      userId = release ? text(input.userId) : actor.id;
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"live-user:" + userId}))`;
    if (release) {
      const reason = text(input.reason, 1000);
      await audit(db, actor, "DEVICE_RELEASE", session.id, { userId, reason });
    }
    await db.classroomJoinGrant.updateMany({
      where: { sessionId: id, userId },
      data: { state: release ? "RELEASED" : "LEFT", ...clearedAttention },
    });
    return { ok: true };
  });
}
