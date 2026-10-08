import "server-only";
import { clearedAttention } from "./attention";
import { prisma } from "@/lib/prisma";
import type { Actor, DB } from "./access";
import {
  admin,
  assignmentAccess,
  audit,
  classAccess,
  enqueue,
  notify,
  sessionAccess,
} from "./access";
import {
  choice,
  date,
  integer,
  requireValue,
  text,
  zoomHostAllowed,
} from "./domain";

type Input = Record<string, unknown>;
async function lock(db: DB, key: string) {
  await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;
}
function revision(value: unknown) {
  return integer(value, 0, 1000000);
}
async function matchRevision(found: number, input: Input) {
  requireValue(
    found === revision(input.revision),
    "Nội dung đã thay đổi. Hãy tải lại trước khi lưu.",
    409,
  );
}
async function sessionLink(db: DB, classId: string, id: unknown) {
  if (!id) return null;
  const sessionId = text(id);
  requireValue(
    await db.classroomSession.findFirst({ where: { id: sessionId, classId } }),
    "Buổi học không thuộc lớp.",
  );
  return sessionId;
}
export async function saveClass(actor: Actor, input: Input, id?: string) {
  admin(actor);
  return prisma.$transaction(async (db) => {
    await lock(db, "classroom-admin");
    const existing = id
      ? await db.classroom.findUnique({ where: { id } })
      : null;
    if (id) {
      requireValue(existing, "Không tìm thấy lớp.", 404);
      await matchRevision(existing.revision, input);
    }
    const capacity = integer(input.capacity, 3, 100);
    const used = id
      ? await db.classroomEnrollment.count({
          where: { classId: id, status: "ACTIVE" },
        })
      : 0;
    const staff = Array.isArray(input.staffIds)
      ? input.staffIds.map((i) => text(i))
      : [];
    requireValue(
      staff.length <= 5 && new Set(staff).size === staff.length,
      "Danh sách giáo viên không hợp lệ.",
    );
    requireValue(
      used + Math.max(2, staff.length) <= capacity,
      "Cần chừa chỗ cho giáo viên trong phòng.",
    );
    const valid = await db.user.count({
      where: {
        id: { in: staff },
        role: { in: ["TEACHER", "ADMIN"] },
        isActive: true,
      },
    });
    requireValue(
      valid === staff.length,
      "Giáo viên đã bị khóa hoặc không hợp lệ.",
    );
    if (id) {
      const future = await db.classroomSession.count({
        where: {
          classId: id,
          hostUserId: { notIn: staff },
          status: { in: ["SCHEDULED", "LIVE"] },
          endsAt: { gt: new Date() },
        },
      });
      requireValue(
        !future,
        "Hãy đổi host các buổi sắp tới trước khi bỏ phân công giáo viên.",
        409,
      );
    }
    const data = {
      code: text(input.code, 32),
      title: text(input.title),
      description: text(input.description ?? "", 4000, false),
      capacity,
      status: choice(input.status ?? "ACTIVE", [
        "ACTIVE",
        "COMPLETED",
        "ARCHIVED",
      ]),
    };
    const row = id
      ? await db.classroom.update({
          where: { id },
          data: { ...data, revision: { increment: 1 } },
        })
      : await db.classroom.create({ data });
    await db.classroomStaff.deleteMany({ where: { classId: row.id } });
    await db.classroomStaff.createMany({
      data: staff.map((userId) => ({ classId: row.id, userId })),
    });
    await audit(db, actor, id ? "CLASS_UPDATE" : "CLASS_CREATE", row.id, {
      before: existing
        ? {
            title: existing.title,
            status: existing.status,
            capacity: existing.capacity,
          }
        : {},
      after: data,
    });
    return row;
  });
}
export async function enrollment(actor: Actor, classId: string, input: Input) {
  admin(actor);
  return prisma.$transaction(async (db) => {
    await lock(db, "classroom-admin");
    const classroom = await classAccess(actor, classId, true, db);
    const userId = text(input.userId),
      status = choice(input.status, ["ACTIVE", "COMPLETED", "WITHDRAWN"]);
    requireValue(
      await db.user.findFirst({
        where: { id: userId, role: "LEARNER", isActive: true },
      }),
      "Học viên không hợp lệ.",
    );
    const current = await db.classroomEnrollment.findUnique({
      where: { classId_userId: { classId, userId } },
    });
    if (status === "ACTIVE" && current?.status !== "ACTIVE") {
      const [count, staff] = await Promise.all([
        db.classroomEnrollment.count({ where: { classId, status: "ACTIVE" } }),
        db.classroomStaff.count({ where: { classId } }),
      ]);
      requireValue(
        count < classroom.capacity - Math.max(2, staff),
        "Lớp đã đủ sĩ số.",
        409,
      );
    }
    const row = await db.classroomEnrollment.upsert({
      where: { classId_userId: { classId, userId } },
      create: { classId, userId, status },
      update: { status },
    });
    if (status !== "ACTIVE")
      await db.classroomJoinGrant.updateMany({
        where: { userId, session: { classId } },
        data: { state: "RELEASED", ...clearedAttention },
      });
    await audit(db, actor, "ENROLLMENT", classId, {
      userId,
      before: current?.status ?? "NONE",
      after: status,
    });
    return row;
  });
}
export async function saveSession(actor: Actor, input: Input, id?: string) {
  admin(actor);
  return prisma.$transaction(async (db) => {
    // ponytail: one schedule lock is sufficient for the first 20 concurrent classrooms.
    await lock(db, "classroom-schedule");
    const classId = text(input.classId);
    await classAccess(actor, classId, true, db);
    const old = id ? await sessionAccess(actor, id, true, db) : null;
    if (old) {
      await matchRevision(old.revision, input);
      requireValue(
        old.status === "SCHEDULED" &&
          old.classId === classId &&
          !old.confirmedStart &&
          !(await db.classroomJoinGrant.count({ where: { sessionId: id } })),
        "Buổi đã bắt đầu/được vào, không thể đổi lịch.",
        409,
      );
    }
    const startsAt = date(input.startsAt),
      endsAt = date(input.endsAt),
      hostUserId = text(input.hostUserId);
    requireValue(
      endsAt > startsAt &&
        endsAt.getTime() - startsAt.getTime() <= 120 * 60000 &&
        startsAt > new Date(),
      "Buổi học cần ở tương lai và dài tối đa 120 phút.",
    );
    requireValue(
      await db.classroomStaff
        .findUnique({
          where: { classId_userId: { classId, userId: hostUserId } },
          include: { user: true },
        })
        .then((s) => s?.user.isActive),
      "Host phải được phân công trong lớp.",
    );
    const zoomHost = await db.zoomHost.findFirst({
      where: { userId: hostUserId, verified: true },
    });
    requireValue(
      zoomHost && zoomHostAllowed(zoomHost.licensed),
      "Cần xác minh host tại mục Zoom & tác vụ trước; host Basic cần bật quyền dùng thử.",
    );
    requireValue(
      zoomHost.licensed || +endsAt - +startsAt <= 40 * 60000,
      "Host Zoom Basic chỉ dùng cho buổi học tối đa 40 phút.",
    );
    const overlap = await db.classroomSession.count({
      where: {
        id: id ? { not: id } : undefined,
        status: { in: ["SCHEDULED", "LIVE"] },
        OR: [{ hostUserId }, { classId }],
        startsAt: { lt: new Date(endsAt.getTime() + 15 * 60000) },
        endsAt: { gt: new Date(startsAt.getTime() - 15 * 60000) },
      },
    });
    requireValue(
      !overlap,
      "Trùng lịch lớp hoặc host (bao gồm 15 phút giữa các buổi).",
      409,
    );
    const data = {
      classId,
      hostUserId,
      title: text(input.title),
      startsAt,
      endsAt,
    };
    const row = id
      ? await db.classroomSession.update({
          where: { id },
          data: {
            ...data,
            revision: { increment: 1 },
            zoomState: old?.meetingId ? "UPDATE_PENDING" : "PENDING",
          },
        })
      : await db.classroomSession.create({ data });
    await enqueue(db, `zoom:${row.id}:${row.revision}`, "ZOOM_SYNC", row.id);
    await notify(
      db,
      classId,
      `session:${row.id}:${row.revision}`,
      `${id ? "Đổi lịch" : "Buổi học mới"}: ${row.title}`,
      `/sessions/${row.id}`,
    );
    await audit(db, actor, "SESSION_SAVE", row.id, {
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      hostUserId,
    });
    return row;
  });
}
export async function cancelSession(actor: Actor, id: string, input: Input) {
  admin(actor);
  return prisma.$transaction(async (db) => {
    await lock(db, "classroom-schedule");
    const old = await sessionAccess(actor, id, false, db);
    await matchRevision(old.revision, input);
    requireValue(old.status === "SCHEDULED", "Chỉ hủy buổi chưa bắt đầu.", 409);
    const reason = text(input.reason, 1000);
    const row = await db.classroomSession.update({
      where: { id },
      data: {
        status: "CANCELED",
        revision: { increment: 1 },
        zoomState: old.meetingId ? "DELETE_PENDING" : "CANCELED",
      },
    });
    await db.classroomJoinGrant.updateMany({
      where: { sessionId: id },
      data: { state: "RELEASED", ...clearedAttention },
    });
    await db.classroomPresentation.updateMany({
      where: { sessionId: id },
      data: {
        fileId: null,
        page: 1,
        controllerId: null,
        revision: { increment: 1 },
      },
    });
    await enqueue(db, `cancel:${id}:${row.revision}`, "ZOOM_SYNC", id);
    await notify(
      db,
      row.classId,
      `cancel:${id}`,
      `Hủy buổi: ${row.title}`,
      `/sessions/${id}`,
    );
    await audit(db, actor, "SESSION_CANCEL", id, { reason });
    return row;
  });
}
async function attachFiles(
  db: DB,
  actor: Actor,
  classId: string,
  input: Input,
  target: { materialId?: string; assignmentId?: string; submissionId?: string },
) {
  const ids = Array.isArray(input.fileIds)
    ? input.fileIds.map((id) => text(id))
    : [];
  requireValue(
    ids.length <= 5 && new Set(ids).size === ids.length,
    "Tối đa 5 tệp cho mỗi nội dung.",
  );
  for (const id of [...ids].sort()) await lock(db, `classroom-file:${id}`);
  const files = await db.classroomFile.findMany({
    where: {
      id: { in: ids },
      classId,
      ownerId: actor.id,
      state: "CLEAN",
      materialId: null,
      assignmentId: null,
      submissionId: null,
    },
  });
  requireValue(
    files.length === ids.length &&
      files.reduce((n, f) => n + f.sizeBytes, 0) <= 100 * 1024 * 1024,
    "Tệp chưa xử lý xong, đã sử dụng hoặc vượt 100 MB.",
  );
  await db.classroomFile.updateMany({
    where: { id: { in: ids } },
    data: target,
  });
}
export async function saveMaterial(
  actor: Actor,
  classId: string,
  input: Input,
  id?: string,
) {
  return prisma.$transaction(async (db) => {
    await lock(db, `class:${classId}`);
    await classAccess(actor, classId, true, db);
    const old = id
      ? await db.classroomMaterial.findFirst({ where: { id, classId } })
      : null;
    if (id) {
      requireValue(old, "Không tìm thấy học liệu.", 404);
      await matchRevision(old.revision, input);
    }
    let sourceKind: string | null = null,
      sourceId: string | null = null;
    if (input.sourceKind) {
      sourceKind = choice(input.sourceKind, ["MATERIAL", "VIDEO", "CONTENT"]);
      sourceId = text(input.sourceId);
      const source =
        sourceKind === "MATERIAL"
          ? await db.learningMaterial.findFirst({
              where: { id: sourceId, published: true },
            })
          : sourceKind === "VIDEO"
            ? await db.learningVideo.findFirst({
                where: { id: sourceId, published: true },
              })
            : await db.learningContent.findFirst({
                where: { id: sourceId, published: true },
              });
      requireValue(source, "Nội dung nguồn chưa được công bố.");
    }
    requireValue(
      typeof input.published === "boolean",
      "Trạng thái công bố không hợp lệ.",
    );
    const data = {
      classId,
      sessionId: await sessionLink(db, classId, input.sessionId),
      title: text(input.title),
      body: text(input.body ?? "", 20000, false),
      sourceKind,
      sourceId,
      published: input.published,
    };
    const row = id
      ? await db.classroomMaterial.update({
          where: { id },
          data: { ...data, revision: { increment: 1 } },
        })
      : await db.classroomMaterial.create({ data });
    await attachFiles(db, actor, classId, input, { materialId: row.id });
    if (row.published)
      await notify(
        db,
        classId,
        `material:${row.id}:${row.revision}`,
        `Học liệu: ${row.title}`,
        `/classes/${classId}?tab=materials`,
      );
    await audit(db, actor, "MATERIAL_SAVE", row.id, {
      published: row.published,
      title: row.title,
    });
    return row;
  });
}
export async function removeMaterial(
  actor: Actor,
  classId: string,
  id: string,
  input: Input,
) {
  return prisma.$transaction(async (db) => {
    await lock(db, `class:${classId}`);
    await classAccess(actor, classId, true, db);
    const row = await db.classroomMaterial.findFirst({
      where: { id, classId },
    });
    requireValue(row, "Không tìm thấy học liệu.", 404);
    await matchRevision(row.revision, input);
    await db.classroomFile.updateMany({
      where: { materialId: id },
      data: { materialId: null },
    });
    await db.classroomMaterial.delete({ where: { id } });
    await audit(db, actor, "MATERIAL_REMOVE", id, { title: row.title });
  });
}
export async function saveAssignment(
  actor: Actor,
  classId: string,
  input: Input,
  id?: string,
) {
  return prisma.$transaction(async (db) => {
    await lock(db, `class:${classId}`);
    await classAccess(actor, classId, true, db);
    const old = id
      ? await db.classroomAssignment.findFirst({ where: { id, classId } })
      : null;
    if (id) await lock(db, `assignment:${id}`);
    if (id) {
      requireValue(old, "Không tìm thấy bài tập.", 404);
      await matchRevision(old.revision, input);
      requireValue(
        !(await db.classroomSubmission.count({ where: { assignmentId: id } })),
        "Bài đã có bài nộp, hãy tạo bài mới để giữ đề gốc.",
        409,
      );
    }
    requireValue(
      typeof input.published === "boolean",
      "Trạng thái công bố không hợp lệ.",
    );
    const data = {
      classId,
      sessionId: await sessionLink(db, classId, input.sessionId),
      title: text(input.title),
      instructions: text(input.instructions, 20000),
      dueAt: date(input.dueAt),
      published: input.published,
    };
    const row = id
      ? await db.classroomAssignment.update({
          where: { id },
          data: { ...data, revision: { increment: 1 } },
        })
      : await db.classroomAssignment.create({ data });
    await attachFiles(db, actor, classId, input, { assignmentId: row.id });
    if (row.published)
      await notify(
        db,
        classId,
        `assignment:${row.id}:${row.revision}`,
        `Bài tập: ${row.title}`,
        `/assignments/${row.id}`,
      );
    await audit(db, actor, "ASSIGNMENT_SAVE", row.id, { title: row.title });
    return row;
  });
}
async function activeStudent(db: DB, actor: Actor, assignmentId: string) {
  requireValue(actor.role === "LEARNER", "Chỉ học viên được nộp bài.", 403);
  const assignment = await assignmentAccess(actor, assignmentId, false, db);
  requireValue(
    await db.classroomEnrollment.findFirst({
      where: {
        classId: assignment.classId,
        userId: actor.id,
        status: "ACTIVE",
        classroom: { status: "ACTIVE" },
      },
    }),
    "Bạn không còn học trong lớp này.",
    403,
  );
  return assignment;
}
export async function saveDraft(actor: Actor, id: string, input: Input) {
  return prisma.$transaction(async (db) => {
    await lock(db, `assignment:${id}`);
    await activeStudent(db, actor, id);
    const key = { assignmentId: id, userId: actor.id },
      old = await db.classroomDraft.findUnique({
        where: { assignmentId_userId: key },
      });
    requireValue(
      (old?.revision ?? 0) === revision(input.revision),
      "Bản nháp đã thay đổi trên thiết bị khác.",
      409,
    );
    const body = text(input.body ?? "", 50000, false);
    return db.classroomDraft.upsert({
      where: { assignmentId_userId: key },
      create: { ...key, body, revision: 1 },
      update: { body, revision: { increment: 1 } },
    });
  });
}
export async function submit(actor: Actor, id: string, input: Input) {
  return prisma.$transaction(async (db) => {
    await lock(db, `assignment:${id}`);
    const assignment = await activeStudent(db, actor, id),
      requestKey = text(input.requestKey, 100);
    const existing = await db.classroomSubmission.findUnique({
      where: { userId_requestKey: { userId: actor.id, requestKey } },
    });
    if (existing) {
      requireValue(existing.assignmentId === id, "Mã gửi trùng bài khác.", 409);
      return existing;
    }
    const key = { assignmentId: id, userId: actor.id },
      latest = await db.classroomSubmission.findFirst({
        where: key,
        orderBy: { version: "desc" },
      }),
      draft = await db.classroomDraft.findUnique({
        where: { assignmentId_userId: key },
      });
    requireValue(
      !latest || (draft?.reopenUntil && draft.reopenUntil > new Date()),
      "Bài đã nộp. Giáo viên cần mở lại để nộp phiên bản mới.",
      409,
    );
    const body = text(input.body ?? "", 50000, false);
    requireValue(
      body || (Array.isArray(input.fileIds) && input.fileIds.length),
      "Hãy nhập bài hoặc đính kèm tệp.",
    );
    const now = new Date(),
      row = await db.classroomSubmission.create({
        data: {
          ...key,
          body,
          version: (latest?.version ?? 0) + 1,
          requestKey,
          late: now > assignment.dueAt,
          submittedAt: now,
        },
      });
    await attachFiles(db, actor, assignment.classId, input, {
      submissionId: row.id,
    });
    if (draft)
      await db.classroomDraft.update({
        where: { assignmentId_userId: key },
        data: { reopenUntil: null },
      });
    await audit(db, actor, "SUBMISSION", row.id, {
      version: row.version,
      late: row.late,
    });
    return row;
  });
}
export async function grade(
  actor: Actor,
  assignmentId: string,
  submissionId: string,
  input: Input,
) {
  return prisma.$transaction(async (db) => {
    await lock(db, `assignment:${assignmentId}`);
    const assignment = await assignmentAccess(actor, assignmentId, true, db);
    const old = await db.classroomSubmission.findFirst({
      where: { id: submissionId, assignmentId },
    });
    requireValue(old, "Không tìm thấy bài nộp.", 404);
    await matchRevision(old.revision, input);
    const action = choice(input.action, ["RETURN", "REVISION", "REOPEN"]),
      feedback = text(input.feedback ?? "", 20000, false),
      reason = text(input.reason, 1000);
    const grade =
      input.grade == null || input.grade === "" ? null : input.grade;
    requireValue(
      grade === null ||
        (typeof grade === "number" &&
          Number.isFinite(grade) &&
          grade >= 0 &&
          grade <= 10),
      "Điểm phải từ 0 đến 10.",
    );
    if (action !== "RETURN") {
      const reopenUntil = date(input.reopenUntil);
      requireValue(reopenUntil > new Date(), "Hạn mở lại phải ở tương lai.");
      await db.classroomDraft.upsert({
        where: { assignmentId_userId: { assignmentId, userId: old.userId } },
        create: { assignmentId, userId: old.userId, reopenUntil },
        update: { reopenUntil },
      });
    }
    const row = await db.classroomSubmission.update({
      where: { id: submissionId },
      data: {
        grade: action === "RETURN" ? grade : old.grade,
        feedback,
        gradedById: actor.id,
        gradedAt: new Date(),
        status: action === "RETURN" ? "RETURNED" : "REVISION_REQUESTED",
        revision: { increment: 1 },
      },
    });
    await db.classroomNotification.create({
      data: {
        userId: old.userId,
        eventKey: `return:${row.id}:${row.revision}`,
        title: `${action === "RETURN" ? "Đã trả bài" : "Mở lại bài"}: ${assignment.title}`,
        href: `/assignments/${assignmentId}`,
      },
    });
    await audit(db, actor, `GRADE_${action}`, row.id, {
      before: { grade: old.grade, feedback: old.feedback },
      after: { grade: row.grade, feedback },
      reason,
    });
    return row;
  });
}
export async function confirmAttendance(
  actor: Actor,
  sessionId: string,
  input: Input,
) {
  return prisma.$transaction(async (db) => {
    await lock(db, `attendance:${sessionId}`);
    const session = await sessionAccess(actor, sessionId, true, db),
      userId = text(input.userId);
    requireValue(
      await db.classroomEnrollment.findUnique({
        where: { classId_userId: { classId: session.classId, userId } },
      }),
      "Học viên không thuộc lớp.",
    );
    const finalStatus = choice(input.finalStatus, [
        "PRESENT",
        "LATE",
        "ABSENT",
        "EXCUSED",
      ]),
      reason = text(input.reason, 1000);
    const before = await db.classroomAttendance.findUnique({
      where: { sessionId_userId: { sessionId, userId } },
    });
    const data = {
      finalStatus,
      reason,
      confirmedById: actor.id,
      confirmedAt: new Date(),
    };
    const row = await db.classroomAttendance.upsert({
      where: { sessionId_userId: { sessionId, userId } },
      create: { sessionId, userId, ...data },
      update: data,
    });
    await audit(db, actor, "ATTENDANCE_CONFIRM", sessionId, {
      userId,
      before: before?.finalStatus ?? null,
      after: finalStatus,
      reason,
    });
    return row;
  });
}
