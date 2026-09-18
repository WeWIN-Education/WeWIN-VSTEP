import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { deleteObject, putObject } from "@/lib/storage";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const imageTypes: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập để đăng bài." }, { status: 401 });
  const form = await request.formData();
  const title = typeof form.get("title") === "string" ? String(form.get("title")).trim().slice(0, 140) : "";
  const body = typeof form.get("body") === "string" ? String(form.get("body")).trim() : "";
  const image = form.get("image");
  if (!body || body.length < 10) return NextResponse.json({ error: "Nội dung bài viết cần ít nhất 10 ký tự." }, { status: 400 });
  if (body.length > 5000) return NextResponse.json({ error: "Nội dung bài viết tối đa 5.000 ký tự." }, { status: 400 });
  if (title.length > 140) return NextResponse.json({ error: "Tiêu đề tối đa 140 ký tự." }, { status: 400 });
  if (image && (!(image instanceof File) || !image.size)) return NextResponse.json({ error: "Ảnh đính kèm không hợp lệ." }, { status: 400 });
  if (image instanceof File && (!imageTypes[image.type] || image.size > MAX_IMAGE_SIZE)) return NextResponse.json({ error: "Chỉ nhận JPEG, PNG hoặc WebP tối đa 5 MB." }, { status: 413 });

  let imageKey: string | null = null;
  let storageKey: string | null = null;
  try {
    if (image instanceof File) {
      imageKey = `${randomUUID()}${imageTypes[image.type]}`;
      storageKey = `posts/${imageKey}`;
      await putObject(storageKey, Buffer.from(await image.arrayBuffer()), image.type);
    }
    const slug = `member-${randomUUID()}`;
    const post = await prisma.userPost.create({ data: { authorId: user.id, slug, title: title || null, body, imageUrl: imageKey, status: "PENDING" }, select: { id: true, status: true } });
    return NextResponse.json({ post }, { status: 201 });
  } catch (caught) {
    if (storageKey) await deleteObject(storageKey).catch(() => undefined);
    return NextResponse.json({ error: caught instanceof Error ? caught.message : "Không thể đăng bài." }, { status: 500 });
  }
}
