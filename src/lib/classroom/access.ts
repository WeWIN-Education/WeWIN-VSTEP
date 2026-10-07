import "server-only";
import type { Prisma, UserRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireValue } from "./domain";

export type Actor = { id: string; role: UserRole };
export type DB = Prisma.TransactionClient;
export function classroomEnabled() {
  return process.env.CLASSROOM_ENABLED === "true";
}
export function managedAccountRoles(): ("LEARNER" | "TEACHER")[] {
  return classroomEnabled() ? ["LEARNER", "TEACHER"] : ["LEARNER"];
}
export async function classroomActor() {
  requireValue(classroomEnabled(), "Lớp học online chưa được mở.", 404);
  const { getCurrentUser } = await import("@/lib/access");
  const user = await getCurrentUser();
  requireValue(user, "Bạn cần đăng nhập.", 401);
  return user;
}
export function admin(actor: Actor) {
  requireValue(
    actor.role === "ADMIN",
    "Chỉ quản trị viên được thực hiện thao tác này.",
    403,
  );
}
export function classFilter(actor: Actor): Prisma.ClassroomWhereInput {
  return actor.role === "ADMIN"
    ? {}
    : actor.role === "TEACHER"
      ? { staff: { some: { userId: actor.id } } }
      : {
          enrollments: {
            some: { userId: actor.id, status: { in: ["ACTIVE", "COMPLETED"] } },
          },
        };
}
export async function classAccess(
  actor: Actor,
  classId: string,
  write = false,
  db: DB = prisma,
) {
  const row = await db.classroom.findFirst({
    where: { id: classId, ...classFilter(actor) },
  });
  requireValue(row, "Bạn không có quyền truy cập lớp này.", 403);
  if (write)
    requireValue(
      actor.role !== "LEARNER" && row.status === "ACTIVE",
      "Lớp đã kết thúc hoặc bạn không có quyền chỉnh sửa.",
      403,
    );
  return row;
}
export async function sessionAccess(
  actor: Actor,
  sessionId: string,
  write = false,
  db: DB = prisma,
) {
  const row = await db.classroomSession.findUnique({
    where: { id: sessionId },
  });
  requireValue(row, "Không tìm thấy buổi học.", 404);
  await classAccess(actor, row.classId, write, db);
  return row;
}
export async function assignmentAccess(
  actor: Actor,
  id: string,
  write = false,
  db: DB = prisma,
) {
  const row = await db.classroomAssignment.findUnique({ where: { id } });
  requireValue(
    row && (actor.role !== "LEARNER" || row.published),
    "Không tìm thấy bài tập.",
    404,
  );
  await classAccess(actor, row.classId, write, db);
  return row;
}
export async function audit(
  db: DB,
  actor: Actor,
  action: string,
  entityId: string,
  detail: Prisma.InputJsonObject = {},
) {
  await db.classroomAudit.create({
    data: { actorId: actor.id, action, entityId, detail },
  });
}
export async function notify(
  db: DB,
  classId: string,
  eventKey: string,
  title: string,
  href: string,
) {
  const students = await db.classroomEnrollment.findMany({
    where: { classId, status: "ACTIVE", user: { isActive: true } },
    select: { userId: true },
  });
  await db.classroomNotification.createMany({
    data: students.map((s) => ({ userId: s.userId, eventKey, title, href })),
    skipDuplicates: true,
  });
}
export async function enqueue(
  db: DB,
  key: string,
  kind: string,
  entityId: string,
) {
  await db.classroomJob.upsert({
    where: { key },
    create: { key, kind, entityId },
    update: {},
  });
}
