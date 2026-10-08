import "server-only";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { prisma } from "@/lib/prisma";
import {
  deleteObject,
  getObject,
  headObject,
  putObject,
  readObject,
} from "@/lib/storage";
import { classAccess, enqueue, type Actor } from "./access";
import { requireValue, text } from "./domain";

export const MAX_FILE_SIZE = 25 * 1024 * 1024;
export const FILE_TYPES: Record<string, string[]> = {
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ],
  pptx: [
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ],
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  mp3: ["audio/mpeg"],
  m4a: ["audio/mp4", "audio/x-m4a"],
};
export async function reserveFile(
  actor: Actor,
  input: Record<string, unknown>,
) {
  const classId = text(input.classId);
  await classAccess(actor, classId, actor.role !== "LEARNER");
  if (actor.role === "LEARNER")
    requireValue(
      await prisma.classroomEnrollment.findFirst({
        where: {
          classId,
          userId: actor.id,
          status: "ACTIVE",
          classroom: { status: "ACTIVE" },
        },
      }),
      "Bạn không còn được tải bài trong lớp.",
      403,
    );
  const name = text(input.name, 160),
    ext = name.split(".").at(-1)?.toLowerCase() || "",
    mimeType = text(input.mimeType, 150),
    sizeBytes = input.sizeBytes;
  requireValue(
    !/[\\/\u0000-\u001f]/.test(name) && FILE_TYPES[ext]?.includes(mimeType),
    "Chỉ nhận PDF, DOCX, PPTX, JPG, PNG, MP3, M4A.",
  );
  requireValue(
    typeof sizeBytes === "number" &&
      Number.isInteger(sizeBytes) &&
      sizeBytes > 0 &&
      sizeBytes <= MAX_FILE_SIZE,
    "Tệp cần nhỏ hơn hoặc bằng 25 MB.",
  );
  // Bound abandoned uploads and pending processing per account.
  requireValue(
    (await prisma.classroomFile.count({
      where: {
        ownerId: actor.id,
        state: { in: ["UPLOADING", "SCAN_PENDING", "SCAN_FAILED"] },
      },
    })) < 20,
    "Có quá nhiều tệp chưa xử lý. Hãy chờ worker.",
    429,
  );
  return prisma.classroomFile.create({
    data: {
      classId,
      ownerId: actor.id,
      name,
      mimeType,
      sizeBytes,
      storageKey: `classrooms/quarantine/${randomUUID()}.${ext}`,
    },
  });
}
export async function completeFile(actor: Actor, id: string) {
  const file = await prisma.classroomFile.findFirst({
    where: { id, ownerId: actor.id },
  });
  requireValue(file, "Không tìm thấy tệp.", 404);
  await classAccess(actor, file.classId);
  if (file.state !== "UPLOADING") return file;
  const head = await headObject(file.storageKey);
  requireValue(
    head &&
      head.sizeBytes === file.sizeBytes &&
      head.sizeBytes <= MAX_FILE_SIZE,
    "Tệp chưa tải đủ hoặc sai kích thước.",
  );
  return prisma.$transaction(async (db) => {
    await db.classroomFile.updateMany({
      where: { id, state: "UPLOADING" },
      data: { state: "SCAN_PENDING" },
    });
    await enqueue(db, `scan:${id}`, "FILE_SCAN", id);
    return db.classroomFile.findUniqueOrThrow({ where: { id } });
  });
}
// Keep legacy job/state names so existing uploads remain compatible; CLEAN now
// means size/signature validation passed, not an antivirus verdict.
export async function validateFile(id: string) {
  const file = await prisma.classroomFile.findUniqueOrThrow({ where: { id } });
  if (file.state === "CLEAN" || file.state === "REJECTED") return;
  try {
    const bytes = await readObject(file.storageKey);
    requireValue(
      bytes && bytes.length === file.sizeBytes && bytes.length <= MAX_FILE_SIZE,
      "FILE_SIZE_MISMATCH",
    );
    const kind = await fileTypeFromBuffer(bytes);
    requireValue(
      kind &&
        FILE_TYPES[file.name.split(".").at(-1)!.toLowerCase()]?.includes(
          kind.mime,
        ),
      "FILE_TYPE_MISMATCH",
    );
    const cleanKey = `classrooms/clean/${file.id}.${kind.ext}`;
    const exists = await headObject(cleanKey);
    if (!exists) await putObject(cleanKey, bytes, kind.mime);
    await prisma.classroomFile.update({
      where: { id },
      data: { state: "CLEAN", cleanKey, mimeType: kind.mime },
    });
    await prisma.classroomJob.upsert({
      where: { key: `preview:${id}` },
      create: { key: `preview:${id}`, kind: "FILE_PREVIEW", entityId: id },
      update: {},
    });
    await deleteObject(file.storageKey).catch(() => undefined);
  } catch (error) {
    const rejected =
      error instanceof Error &&
      ["FILE_TYPE_MISMATCH", "FILE_SIZE_MISMATCH"].includes(error.message);
    await prisma.classroomFile.update({
      where: { id },
      data: { state: rejected ? "REJECTED" : "SCAN_FAILED" },
    });
    if (rejected) {
      await deleteObject(file.storageKey).catch(() => undefined);
      return;
    }
    throw error;
  }
}
export async function accessibleFile(actor: Actor, id: string) {
  const row = await prisma.classroomFile.findUnique({
    where: { id },
    include: { material: true, assignment: true, submission: true },
  });
  requireValue(
    row?.state === "CLEAN" && row.cleanKey,
    "Tệp chưa xử lý xong hoặc không hợp lệ.",
    404,
  );
  await classAccess(actor, row.classId);
  if (actor.role === "LEARNER")
    requireValue(
      row.ownerId === actor.id ||
        row.material?.published ||
        row.assignment?.published,
      "Bạn không có quyền tải tệp này.",
      403,
    );
  return row;
}
export async function downloadFile(actor: Actor, id: string) {
  const row = await accessibleFile(actor, id);
  const object = await getObject(row.cleanKey!);
  requireValue(object, "Không tìm thấy tệp.", 404);
  return new Response(object.stream, {
    headers: {
      "Content-Type": row.mimeType,
      "Content-Length": String(object.sizeBytes),
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}

// A single byte range, including open-ended and suffix ranges. Multiple ranges are rejected.
export function fileRange(value: string, size: number) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || (!match[1] && !match[2])) return null;
  const start = match[1]
    ? Number(match[1])
    : Math.max(0, size - Number(match[2]));
  const end =
    match[1] && match[2] ? Math.min(size - 1, Number(match[2])) : size - 1;
  return Number.isSafeInteger(start) &&
    Number.isSafeInteger(end) &&
    start >= 0 &&
    start <= end &&
    start < size &&
    (match[1] || Number(match[2]) > 0)
    ? { start, end }
    : null;
}
export async function viewFile(actor: Actor, id: string, request: Request) {
  const row = await accessibleFile(actor, id);
  requireValue(
    ["application/pdf", "image/jpeg", "image/png"].includes(row.mimeType),
    "Xuất Word/PowerPoint thành PDF để xem hoặc trình chiếu trên web.",
    415,
  );
  const head = await headObject(row.cleanKey!);
  requireValue(head, "Không tìm thấy tệp.", 404);
  const value = request.headers.get("range");
  const range = value ? fileRange(value, head.sizeBytes) : undefined;
  const headers: Record<string, string> = {
    "Content-Type": row.mimeType,
    "Accept-Ranges": "bytes",
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
    "X-Content-Type-Options": "nosniff",
    // Revalidate permission on every request; the browser may retain immutable bytes privately.
    "Cache-Control": "private, no-cache, must-revalidate",
    Vary: "Cookie",
  };
  if (value && !range)
    return new Response(null, {
      status: 416,
      headers: { ...headers, "Content-Range": `bytes */${head.sizeBytes}` },
    });
  headers["Content-Length"] = String(
    range ? range.end - range.start + 1 : head.sizeBytes,
  );
  if (range)
    headers["Content-Range"] =
      `bytes ${range.start}-${range.end}/${head.sizeBytes}`;
  if (request.method === "HEAD")
    return new Response(null, { headers, status: range ? 206 : 200 });
  const object = await getObject(row.cleanKey!, range ? { range } : {});
  requireValue(object, "Không đọc được tệp.", 404);
  return new Response(object.stream, { headers, status: range ? 206 : 200 });
}
