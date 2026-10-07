import "server-only";
import { randomUUID } from "node:crypto";
import { connect } from "node:net";
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
  // Bound abandoned uploads per account; a scanner outage must not grow an unbounded queue.
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
export function scanClamAV(bytes: Buffer) {
  return new Promise<void>((resolve, reject) => {
    requireValue(process.env.CLAMAV_HOST, "Chưa cấu hình máy quét tệp.", 503);
    const socket = connect(
        Number(process.env.CLAMAV_PORT || 3310),
        process.env.CLAMAV_HOST,
      ),
      chunks: Buffer[] = [];
    socket.setTimeout(60000);
    socket.on("connect", () => {
      socket.write("zINSTREAM\0");
      for (let offset = 0; offset < bytes.length; offset += 65536) {
        const chunk = bytes.subarray(offset, offset + 65536),
          size = Buffer.alloc(4);
        size.writeUInt32BE(chunk.length);
        socket.write(size);
        socket.write(chunk);
      }
      socket.write(Buffer.alloc(4));
    });
    socket.on("data", (chunk) => chunks.push(chunk));
    socket.on("timeout", () =>
      socket.destroy(new Error("Máy quét không phản hồi.")),
    );
    socket.on("error", reject);
    socket.on("end", () => {
      const reply = Buffer.concat(chunks).toString().replace(/\0/g, "").trim();
      if (reply === "stream: OK") resolve();
      else
        reject(
          new Error(
            reply.includes("FOUND")
              ? "FILE_INFECTED"
              : "Máy quét chưa xác nhận an toàn.",
          ),
        );
    });
  });
}
export async function scanFile(id: string) {
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
    await scanClamAV(bytes);
    const cleanKey = `classrooms/clean/${file.id}.${kind.ext}`;
    const exists = await headObject(cleanKey);
    if (!exists) await putObject(cleanKey, bytes, kind.mime);
    await prisma.classroomFile.update({
      where: { id },
      data: { state: "CLEAN", cleanKey, mimeType: kind.mime },
    });
    await deleteObject(file.storageKey);
  } catch (error) {
    const rejected =
      error instanceof Error &&
      ["FILE_INFECTED", "FILE_TYPE_MISMATCH", "FILE_SIZE_MISMATCH"].includes(
        error.message,
      );
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
export async function downloadFile(actor: Actor, id: string) {
  const row = await prisma.classroomFile.findUnique({
    where: { id },
    include: { material: true, assignment: true, submission: true },
  });
  requireValue(
    row?.state === "CLEAN" && row.cleanKey,
    "Tệp chưa được quét an toàn.",
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
  const object = await getObject(row.cleanKey);
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
