import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { importVocabularyRows, parseVocabularyWorkbook, type VocabularyImportKind } from "@/lib/vocabulary-import";
import { NextResponse } from "next/server";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (actor.role !== "ADMIN") {
    return NextResponse.json({ error: "Bạn không có quyền nhập từ vựng." }, { status: 403 });
  }

  const formData = await request.formData();
  const upload = formData.get("file");
  const kindValue = String(formData.get("kind") || "VOCABULARY").toUpperCase();
  const kind: VocabularyImportKind = kindValue === "COLLOCATION" ? "COLLOCATION" : "VOCABULARY";
  const mode = String(formData.get("mode") || "import").toLowerCase();
  if (!(upload instanceof File)) return NextResponse.json({ error: "Vui lòng chọn file Excel." }, { status: 400 });
  if (upload.size > MAX_FILE_SIZE) return NextResponse.json({ error: "File vượt quá giới hạn 10MB." }, { status: 413 });
  if (!upload.name.toLowerCase().endsWith(".xlsx")) return NextResponse.json({ error: "Chỉ hỗ trợ file .xlsx." }, { status: 400 });

  try {
    const fileBuffer = Buffer.from(await upload.arrayBuffer());
    const parsed = parseVocabularyWorkbook(fileBuffer, upload.name, kind);
    if (mode === "preview") {
      return NextResponse.json({
        kind,
        totalRows: parsed.totalDataRows,
        validRows: parsed.rows.length,
        errors: parsed.errors,
        sample: parsed.rows.slice(0, 12).map((row) => ({ term: row.term, meaningVi: row.meaningVi, exampleEn: row.exampleEn, note: row.note, topicName: row.topicName })),
      });
    }
    if (!parsed.rows.length) {
      return NextResponse.json({ error: "Không có dòng từ vựng hợp lệ để nhập.", errors: parsed.errors }, { status: 422 });
    }
    const summary = await importVocabularyRows({ prisma, uploadedById: actor.id, fileName: upload.name, kind, ...parsed });
    return NextResponse.json(summary);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể nhập file." }, { status: 500 });
  }
}
