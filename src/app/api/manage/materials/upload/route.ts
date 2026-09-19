import { handleUpload } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Bạn không có quyền tải tài liệu." }, { status: 403 });
  return NextResponse.json({ directUpload: Boolean(process.env.BLOB_READ_WRITE_TOKEN), serverUpload: process.env.NODE_ENV !== "production" }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được tải tài liệu." }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Blob storage chưa được cấu hình." }, { status: 503 });
  try {
    const body = await request.json() as { type?: string; payload?: { pathname?: string; clientPayload?: string | null; blob?: { pathname?: string } } };
    const payload = body.payload || {};
    if (body.type === "blob.generate-client-token" && (typeof payload.pathname !== "string" || !payload.pathname.startsWith("materials/"))) return NextResponse.json({ error: "Đường dẫn tài liệu không hợp lệ." }, { status: 400 });
    if (body.type === "blob.upload-completed" && (typeof payload.blob?.pathname !== "string" || !payload.blob.pathname.startsWith("materials/"))) return NextResponse.json({ error: "Blob tài liệu không hợp lệ." }, { status: 400 });
    const response = await handleUpload({
      request,
      body: body as never,
      onBeforeGenerateToken: async () => ({ allowedContentTypes: ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "application/zip", "image/jpeg", "image/png", "image/webp", "audio/mpeg", "audio/mp4", "video/mp4"], maximumSizeInBytes: MAX_FILE_SIZE, addRandomSuffix: false, allowOverwrite: false }),
    });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo token upload." }, { status: 400 });
  }
}
