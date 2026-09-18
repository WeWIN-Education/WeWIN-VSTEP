import { getCurrentUser } from "@/lib/access";
import { fileExtension, MATERIAL_FILE_TYPES, MATERIAL_LEVELS, MATERIAL_SKILLS, type MaterialExtension, type MaterialLevel, type MaterialSkill } from "@/lib/learning-materials";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { deleteObject, putObject } from "@/lib/storage";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_FILE_SIZE = 50 * 1024 * 1024;
function text(value: FormDataEntryValue | null, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function serializeMaterial(material: {
  id: string;
  title: string;
  description: string | null;
  programme: string;
  skill: string;
  level: string | null;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  published: boolean;
  createdAt: Date;
}) {
  return { ...material, createdAt: material.createdAt.toISOString() };
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  if (process.env.NODE_ENV === "production" && !process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Blob storage chưa được cấu hình cho môi trường production." }, { status: 503 });
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được tải tài liệu." }, { status: 403 });

  let storageKey = "";
  try {
    const form = await request.formData();
    const upload = form.get("file");
    const title = text(form.get("title"), 160);
    const description = text(form.get("description"), 1000);
    const skill = text(form.get("skill"), 20) as MaterialSkill;
    const level = text(form.get("level"), 10) as MaterialLevel;
    const published = text(form.get("published"), 10) !== "false";

    if (!title) return NextResponse.json({ error: "Vui lòng nhập tên tài liệu." }, { status: 400 });
    if (!(upload instanceof File) || upload.size === 0) return NextResponse.json({ error: "Vui lòng chọn file tài liệu." }, { status: 400 });
    if (upload.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File tài liệu vượt quá giới hạn 50 MB." }, { status: 413 });
    if (!MATERIAL_SKILLS.includes(skill)) return NextResponse.json({ error: "Kỹ năng tài liệu không hợp lệ." }, { status: 400 });
    if (!MATERIAL_LEVELS.includes(level)) return NextResponse.json({ error: "Trình độ tài liệu không hợp lệ." }, { status: 400 });

    const fileName = path.basename(upload.name).normalize("NFC").trim();
    const extension = fileExtension(fileName) as MaterialExtension;
    const mimeType = MATERIAL_FILE_TYPES[extension];
    if (!fileName || !mimeType) return NextResponse.json({ error: "Định dạng file chưa được hỗ trợ." }, { status: 400 });

    const storageName = `${randomUUID()}${extension}`;
    storageKey = `materials/${storageName}`;
    await putObject(storageKey, Buffer.from(await upload.arrayBuffer()), mimeType);

    const material = await prisma.learningMaterial.create({
      data: {
        title,
        description: description || null,
        programme: "VSTEP",
        skill,
        level: level === "ALL" ? null : level,
        fileName,
        storageName: storageKey,
        mimeType,
        sizeBytes: upload.size,
        published,
        uploadedById: actor.id,
      },
      select: { id: true, title: true, description: true, programme: true, skill: true, level: true, fileName: true, mimeType: true, sizeBytes: true, published: true, createdAt: true },
    });

    return NextResponse.json({ material: serializeMaterial(material) }, { status: 201 });
  } catch (error) {
    if (storageKey) await deleteObject(storageKey).catch(() => undefined);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể lưu tài liệu." }, { status: 500 });
  }
}
