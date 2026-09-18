import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { deleteObject, headObject } from "@/lib/storage";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const imageTypes: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

function text(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập để đăng bài." }, { status: 401 });

  let storageKey: string | null = null;
  try {
    const body = await request.json() as { title?: string; body?: string; pathname?: string };
    const title = text(body.title, 140);
    const postBody = text(body.body, 5000);
    if (!postBody || postBody.length < 10) return NextResponse.json({ error: "Nội dung bài viết cần ít nhất 10 ký tự." }, { status: 400 });

    let imageKey: string | null = null;
    if (body.pathname) {
      const pathname = text(body.pathname, 500);
      const safeName = path.basename(pathname);
      const extension = path.extname(safeName).toLowerCase();
      if (pathname !== `posts/${safeName}` || !/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp)$/i.test(safeName) || !imageTypes[extension]) {
        return NextResponse.json({ error: "Ảnh đính kèm không hợp lệ." }, { status: 400 });
      }
      const stored = await headObject(pathname);
      if (!stored || stored.sizeBytes <= 0 || stored.sizeBytes > MAX_IMAGE_SIZE || stored.contentType !== imageTypes[extension]) {
        return NextResponse.json({ error: "Không tìm thấy ảnh vừa tải lên hoặc ảnh không hợp lệ." }, { status: 400 });
      }
      storageKey = stored.key;
      imageKey = safeName;
    }

    const post = await prisma.userPost.create({ data: { authorId: user.id, slug: `member-${randomUUID()}`, title: title || null, body: postBody, imageUrl: imageKey, status: "PENDING" }, select: { id: true, status: true } });
    return NextResponse.json({ post }, { status: 201 });
  } catch (caught) {
    if (storageKey) await deleteObject(storageKey).catch(() => undefined);
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Không thể đăng bài." }, { status: 500 });
  }
}
