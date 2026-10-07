import { handleUpload } from "@vercel/blob/client";
import { prisma } from "@/lib/prisma";
import {
  classroomActor,
  classAccess,
  classroomEnabled,
} from "@/lib/classroom/access";
import { ClassroomError, requireValue, text } from "@/lib/classroom/domain";
import { completeFile, FILE_TYPES, MAX_FILE_SIZE } from "@/lib/classroom/files";
import { isSameOrigin } from "@/lib/request-security";
import { putObject } from "@/lib/storage";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    if (request.headers.get("content-type")?.includes("multipart/form-data")) {
      requireValue(
        process.env.NODE_ENV !== "production" &&
          !process.env.BLOB_READ_WRITE_TOKEN,
        "Sử dụng tải tệp trực tiếp trên máy chủ.",
        400,
      );
      requireValue(isSameOrigin(request), "Yêu cầu không hợp lệ.", 403);
      const actor = await classroomActor();
      requireValue(
        Number(request.headers.get("content-length") || 0) <=
          MAX_FILE_SIZE + 65536,
        "Tệp quá lớn.",
        413,
      );
      const form = await request.formData(),
        id = text(form.get("fileId")),
        bytes = form.get("file");
      const row = await prisma.classroomFile.findFirst({
        where: { id, ownerId: actor.id, state: "UPLOADING" },
      });
      requireValue(
        row &&
          bytes instanceof File &&
          bytes.size === row.sizeBytes &&
          bytes.size <= MAX_FILE_SIZE,
        "Tệp không hợp lệ.",
      );
      await classAccess(actor, row.classId);
      await putObject(
        row.storageKey,
        Buffer.from(await bytes.arrayBuffer()),
        row.mimeType,
      );
      return NextResponse.json(await completeFile(actor, id));
    }
    requireValue(
      classroomEnabled() && process.env.BLOB_READ_WRITE_TOKEN,
      "Lưu trữ tệp chưa được cấu hình.",
      503,
    );
    const body = await request.json();
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname, clientPayload) => {
        requireValue(isSameOrigin(request), "Yêu cầu không hợp lệ.", 403);
        const actor = await classroomActor(),
          id = text(clientPayload);
        const row = await prisma.classroomFile.findFirst({
          where: {
            id,
            ownerId: actor.id,
            state: "UPLOADING",
            storageKey: pathname,
          },
        });
        requireValue(row, "Không có quyền tải tệp.", 403);
        await classAccess(actor, row.classId);
        return {
          allowedContentTypes: Object.values(FILE_TYPES).flat(),
          maximumSizeInBytes: Math.min(row.sizeBytes, MAX_FILE_SIZE),
          addRandomSuffix: false,
          allowOverwrite: false,
          tokenPayload: JSON.stringify({ id: row.id, ownerId: actor.id }),
        };
      },
      // handleUpload verifies Blob's callback signature before invoking this function.
      onUploadCompleted: async ({ blob, tokenPayload }) => {
        const payload = JSON.parse(tokenPayload || "{}");
        const row = await prisma.classroomFile.findFirst({
          where: {
            id: payload.id,
            ownerId: payload.ownerId,
            storageKey: blob.pathname,
          },
        });
        requireValue(row, "Tệp không hợp lệ.");
        const owner = await prisma.user.findUnique({
          where: { id: row.ownerId },
        });
        requireValue(owner?.isActive, "Tài khoản đã khóa.", 403);
        await completeFile(owner, row.id);
      },
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof ClassroomError
            ? error.message
            : "Không thể tải tệp. Hãy thử lại.",
      },
      { status: error instanceof ClassroomError ? error.status : 400 },
    );
  }
}
