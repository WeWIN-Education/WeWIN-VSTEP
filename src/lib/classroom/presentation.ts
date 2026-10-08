import "server-only";
import { prisma } from "@/lib/prisma";
import { sessionAccess, type Actor } from "./access";
import { requireValue } from "./domain";

export const previewSelect = {
  id: true,
  name: true,
  mimeType: true,
  sizeBytes: true,
  previewPageCount: true,
  previewError: true,
} as const;
const previewTypes = ["application/pdf", "image/jpeg", "image/png"];
function materialFilter(classId: string, sessionId: string) {
  return { classId, published: true, OR: [{ sessionId: null }, { sessionId }] };
}
export async function listPresentation(actor: Actor, id: string) {
  const session = await sessionAccess(actor, id);
  if (actor.role === "LEARNER")
    requireValue(
      await prisma.classroomEnrollment.findFirst({
        where: { classId: session.classId, userId: actor.id, status: "ACTIVE" },
      }),
      "Bạn không còn đang học trong lớp này.",
      403,
    );
  const active =
    ["SCHEDULED", "LIVE"].includes(session.status) &&
    session.endsAt > new Date();
  const [row, files] = await Promise.all([
    prisma.classroomPresentation.findUnique({ where: { sessionId: id } }),
    prisma.classroomFile.findMany({
      where: {
        state: "CLEAN",
        mimeType: { in: previewTypes },
        material: materialFilter(session.classId, id),
      },
      select: previewSelect,
      orderBy: { createdAt: "asc" },
    }),
  ]);
  // Unpublishing/removing a material revokes the current presentation on the next read.
  const file = active
    ? files.find((file) => file.id === row?.fileId)
    : undefined;
  return {
    active,
    files,
    presentation: {
      fileId: file?.id || null,
      page: file ? row!.page : 1,
      revision: row?.revision || 0,
      updatedAt: row?.updatedAt || null,
    },
  };
}
export async function updatePresentation(
  actor: Actor,
  id: string,
  input: Record<string, unknown>,
) {
  requireValue(
    Number.isInteger(input.revision) && Number(input.revision) >= 0,
    "Phiên bản không hợp lệ.",
  );
  requireValue(
    input.fileId === null ||
      (typeof input.fileId === "string" && input.fileId.length > 0),
    "Tệp không hợp lệ.",
  );
  requireValue(
    Number.isInteger(input.page) && Number(input.page) > 0,
    "Trang không hợp lệ.",
  );
  await prisma.$transaction(async (db) => {
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`presentation:${id}`}))`;
    const session = await sessionAccess(actor, id, true, db);
    requireValue(
      ["SCHEDULED", "LIVE"].includes(session.status) &&
        session.endsAt > new Date(),
      "Buổi học đã kết thúc hoặc hủy.",
      409,
    );
    const row = await db.classroomPresentation.findUnique({
      where: { sessionId: id },
    });
    requireValue(
      (row?.revision || 0) === input.revision,
      "Người khác đã đổi trình chiếu. Hãy thử lại trên trạng thái mới.",
      409,
    );
    if (input.fileId !== null) {
      const file = await db.classroomFile.findFirst({
        where: {
          id: input.fileId as string,
          state: "CLEAN",
          mimeType: { in: previewTypes },
          material: materialFilter(session.classId, id),
        },
      });
      requireValue(
        file?.previewPageCount && !file.previewError,
        "Học liệu chưa sẵn sàng, chưa công bố hoặc không thuộc buổi này.",
        400,
      );
      requireValue(
        Number(input.page) <= file.previewPageCount,
        "Trang vượt quá số trang của tài liệu.",
      );
    }
    const data = {
      fileId: input.fileId as string | null,
      page: input.fileId === null ? 1 : Number(input.page),
      controllerId: actor.id,
      revision: Number(input.revision) + 1,
    };
    await db.classroomPresentation.upsert({
      where: { sessionId: id },
      create: { sessionId: id, ...data },
      update: data,
    });
  });
  return listPresentation(actor, id);
}
export async function clearEndedPresentations() {
  await prisma.classroomPresentation.updateMany({
    where: {
      fileId: { not: null },
      session: {
        OR: [
          { status: { in: ["ENDED", "CANCELED"] } },
          { endsAt: { lte: new Date() } },
        ],
      },
    },
    data: {
      fileId: null,
      page: 1,
      controllerId: null,
      revision: { increment: 1 },
    },
  });
}
