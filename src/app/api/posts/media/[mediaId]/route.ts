import { prisma } from "@/lib/prisma";
import { getObject, headObject } from "@/lib/storage";
import path from "node:path";
import { NextResponse } from "next/server";

const mimeByExtension: Record<string, string> = { ".jpg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ mediaId: string }> }) {
  const { mediaId } = await params;
  const safeName = path.basename(mediaId);
  const post = await prisma.userPost.findFirst({ where: { imageUrl: safeName, status: "APPROVED" }, select: { imageUrl: true } });
  if (!post?.imageUrl) return new NextResponse("Not found", { status: 404 });
  try {
    const storageKey = `posts/${safeName}`;
    const metadata = await headObject(storageKey);
    const object = await getObject(storageKey);
    if (!metadata || !object) return new NextResponse("Not found", { status: 404 });
    return new NextResponse(object.stream, { headers: { "Content-Type": mimeByExtension[path.extname(safeName).toLowerCase()] || metadata.contentType || "application/octet-stream", "Content-Length": String(metadata.sizeBytes), "Cache-Control": "public, max-age=300" } });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
