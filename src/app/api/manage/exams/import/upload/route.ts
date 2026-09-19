import { handleUpload } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { NextResponse } from "next/server";
import path from "node:path";

export const runtime = "nodejs";

const MAX_AUDIO_SIZE = 25 * 1024 * 1024;
const mimeByExtension: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "audio/mp4",
  ".ogg": "audio/ogg",
  ".webm": "audio/webm",
};
const allowedContentTypes = [
  ...Object.values(mimeByExtension),
  "audio/m4a",
  "audio/x-wav",
  "video/mp4",
  "video/webm",
];

function parseClientPayload(value: string | null) {
  if (!value) return {} as { fileName?: string };
  try {
    return JSON.parse(value) as { fileName?: string };
  } catch {
    return {} as { fileName?: string };
  }
}

function validPathname(value: unknown) {
  if (typeof value !== "string") return false;
  const extension = path.posix.extname(value).toLowerCase();
  return /^exams\/[a-f0-9-]{36}\.[a-z0-9]+$/i.test(value) && Boolean(mimeByExtension[extension]);
}

export async function GET() {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Bạn không có quyền tải audio đề." }, { status: 403 });
  return NextResponse.json(
    { directUpload: Boolean(process.env.BLOB_READ_WRITE_TOKEN), serverUpload: process.env.NODE_ENV !== "production" },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được tải audio đề." }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Blob storage chưa được cấu hình. Hãy kết nối Blob và redeploy project." }, { status: 503 });

  try {
    const body = await request.json() as {
      type?: string;
      payload?: { pathname?: string; clientPayload?: string | null; blob?: { pathname?: string } };
    };
    const payload = body.payload || {};
    if (body.type === "blob.generate-client-token") {
      const client = parseClientPayload(payload.clientPayload || null);
      const pathname = payload.pathname;
      const extension = typeof pathname === "string" ? path.posix.extname(pathname).toLowerCase() : "";
      const fileExtension = typeof client.fileName === "string" ? path.extname(client.fileName).toLowerCase() : "";
      if (!validPathname(pathname) || !fileExtension || extension !== fileExtension) {
        return NextResponse.json({ error: "Đường dẫn audio không hợp lệ." }, { status: 400 });
      }
    } else if (body.type === "blob.upload-completed" && !validPathname(payload.blob?.pathname)) {
      return NextResponse.json({ error: "Blob audio không hợp lệ." }, { status: 400 });
    }

    const response = await handleUpload({
      request,
      body: body as never,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes,
        maximumSizeInBytes: MAX_AUDIO_SIZE,
        addRandomSuffix: false,
        allowOverwrite: false,
      }),
    });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo token upload audio." }, { status: 400 });
  }
}
