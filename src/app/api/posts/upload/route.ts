import { handleUpload } from "@vercel/blob/client";
import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedContentTypes = ["image/jpeg", "image/png", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập để đăng bài." }, { status: 401 });
  return NextResponse.json({ directUpload: Boolean(process.env.BLOB_READ_WRITE_TOKEN) }, { headers: { "Cache-Control": "private, no-store" } });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập để đăng bài." }, { status: 401 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Blob storage chưa được cấu hình." }, { status: 503 });

  try {
    const body = await request.json() as { type?: string; payload?: { pathname?: string; blob?: { pathname?: string } } };
    const payload = body.payload || {};
    if (body.type === "blob.generate-client-token" && (typeof payload.pathname !== "string" || !payload.pathname.startsWith("posts/"))) {
      return NextResponse.json({ error: "Đường dẫn ảnh không hợp lệ." }, { status: 400 });
    }
    if (body.type === "blob.upload-completed" && (typeof payload.blob?.pathname !== "string" || !payload.blob.pathname.startsWith("posts/"))) {
      return NextResponse.json({ error: "Blob ảnh không hợp lệ." }, { status: 400 });
    }
    const response = await handleUpload({
      request,
      body: body as never,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes,
        maximumSizeInBytes: MAX_IMAGE_SIZE,
        addRandomSuffix: false,
        allowOverwrite: false,
        tokenPayload: JSON.stringify({ userId: user.id }),
      }),
    });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo token upload ảnh." }, { status: 400 });
  }
}
