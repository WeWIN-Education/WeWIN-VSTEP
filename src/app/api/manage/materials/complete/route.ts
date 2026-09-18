import { getCurrentUser } from "@/lib/access";
import { fileExtension, MATERIAL_FILE_TYPES, MATERIAL_LEVELS, MATERIAL_SKILLS, type MaterialLevel, type MaterialSkill } from "@/lib/learning-materials";
import { isSameOrigin } from "@/lib/request-security";
import { deleteObject, headObject } from "@/lib/storage";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_FILE_SIZE = 50 * 1024 * 1024;

function text(value: unknown, maxLength: number) { return typeof value === "string" ? value.trim().slice(0, maxLength) : ""; }

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được tải tài liệu." }, { status: 403 });
  let storageKey = "";
  try {
    const body = await request.json() as { pathname?: string; title?: string; description?: string; skill?: string; level?: string; published?: boolean; fileName?: string };
    const title = text(body.title, 160);
    const description = text(body.description, 1000);
    const skill = text(body.skill, 20) as MaterialSkill;
    const level = text(body.level, 10) as MaterialLevel;
    const fileName = text(body.fileName, 240).replace(/[\r\n]/g, "");
    const pathname = text(body.pathname, 500);
    if (!title || !fileName || !pathname.startsWith("materials/")) return NextResponse.json({ error: "Thông tin tài liệu chưa đủ." }, { status: 400 });
    if (!MATERIAL_SKILLS.includes(skill) || !MATERIAL_LEVELS.includes(level)) return NextResponse.json({ error: "Kỹ năng hoặc trình độ không hợp lệ." }, { status: 400 });
    const extension = fileExtension(fileName);
    const expectedType = MATERIAL_FILE_TYPES[extension as keyof typeof MATERIAL_FILE_TYPES];
    const stored = await headObject(pathname);
    if (!expectedType || !stored || stored.sizeBytes <= 0 || stored.sizeBytes > MAX_FILE_SIZE || stored.contentType !== expectedType) return NextResponse.json({ error: "File tài liệu không hợp lệ hoặc đã hết hạn." }, { status: 400 });
    storageKey = stored.key;
    const material = await prisma.learningMaterial.create({ data: { title, description: description || null, programme: "VSTEP", skill, level: level === "ALL" ? null : level, fileName, storageName: stored.key, mimeType: expectedType, sizeBytes: stored.sizeBytes, published: body.published !== false, uploadedById: actor.id }, select: { id: true, title: true, description: true, programme: true, skill: true, level: true, fileName: true, mimeType: true, sizeBytes: true, published: true, createdAt: true } });
    return NextResponse.json({ material: { ...material, createdAt: material.createdAt.toISOString() } }, { status: 201 });
  } catch (error) {
    if (storageKey) await deleteObject(storageKey).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể lưu tài liệu." }, { status: 400 });
  }
}
