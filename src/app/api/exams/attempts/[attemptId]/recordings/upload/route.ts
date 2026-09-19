import { handleUpload } from "@vercel/blob/client";
import { getAttemptOwner, ownerWhere } from "@/lib/exam-attempt-access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { resolveCatalogExamData } from "@/lib/exam-scoring";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const allowedContentTypes = ["audio/webm", "audio/ogg", "audio/mp4", "audio/m4a", "audio/wav", "audio/x-wav", "audio/mpeg"];
const MAX_RECORDING_BYTES = 20 * 1024 * 1024;

export async function GET(_request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({ error: "Phiên đăng nhập hoặc phiên học thử đã hết hạn." }, { status: 401 });
  const { attemptId } = await params;
  const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, ...ownerWhere(owner) }, select: { id: true } });
  if (!attempt) return NextResponse.json({ error: "Không tìm thấy lượt thi." }, { status: 404 });
  return NextResponse.json({ directUpload: Boolean(process.env.BLOB_READ_WRITE_TOKEN), serverUpload: process.env.NODE_ENV !== "production" }, { headers: { "Cache-Control": "private, no-store" } });
}

function parsePayload(value: string | null) {
  if (!value) return {} as { attemptId?: string; partId?: string };
  try {
    return JSON.parse(value) as { attemptId?: string; partId?: string };
  } catch {
    return {} as { attemptId?: string; partId?: string };
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ attemptId: string }> }) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) return NextResponse.json({ error: "Blob storage chưa được cấu hình." }, { status: 503 });
  const owner = await getAttemptOwner();
  if (!owner || owner.kind === "invalid") return NextResponse.json({ error: "Phiên đăng nhập hoặc phiên học thử đã hết hạn." }, { status: 401 });
  const { attemptId } = await params;
  const attempt = await prisma.examAttempt.findFirst({
    where: { id: attemptId, ...ownerWhere(owner), status: "IN_PROGRESS" },
    include: { examPaper: { select: { slug: true, sections: true, questions: true } }, paperPart: { select: { sections: true, questions: true } } },
  });
  if (!attempt) return NextResponse.json({ error: "Lượt thi không tồn tại hoặc đã nộp." }, { status: 404 });
  const exam = resolveCatalogExamData({ slug: attempt.examPaper.slug, sections: attempt.examPaper.sections, questions: attempt.examPaper.questions, catalog: attempt.catalog, partSections: attempt.paperPart?.sections, partQuestions: attempt.paperPart?.questions });
  if (!exam) return NextResponse.json({ error: "Nội dung đề không hợp lệ." }, { status: 409 });

  try {
    const body = await request.json() as {
      type?: string;
      payload?: { pathname?: string; clientPayload?: string | null; blob?: { pathname?: string } };
    };
    const payload = body.payload || {};
    const client = parsePayload(payload.clientPayload || null);
    if (body.type === "blob.generate-client-token") {
      if (client.attemptId !== attemptId || typeof client.partId !== "string" || !exam.paper.speaking.parts.some((part) => part.id === client.partId)) {
        return NextResponse.json({ error: "Thông tin upload Speaking không hợp lệ." }, { status: 400 });
      }
      if (typeof payload.pathname !== "string" || !payload.pathname.startsWith(`exam-recordings/${attemptId}/${client.partId}-`)) {
        return NextResponse.json({ error: "Đường dẫn upload không hợp lệ." }, { status: 400 });
      }
    } else if (body.type === "blob.upload-completed") {
      if (typeof payload.blob?.pathname !== "string" || !payload.blob.pathname.startsWith(`exam-recordings/${attemptId}/`)) {
        return NextResponse.json({ error: "Blob upload không thuộc lượt thi này." }, { status: 400 });
      }
    }

    const response = await handleUpload({
      request,
      body: body as never,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes,
        maximumSizeInBytes: MAX_RECORDING_BYTES,
        addRandomSuffix: false,
        allowOverwrite: false,
        tokenPayload: JSON.stringify({ attemptId, partId: client.partId }),
      }),
    });
    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Không thể tạo token upload." }, { status: 400 });
  }
}
