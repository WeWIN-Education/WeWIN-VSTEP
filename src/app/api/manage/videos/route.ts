import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/access";
import { enrichVideoTranscript, fetchYoutubeSource, transcriptFromSource, youtubeIdFromUrl } from "@/lib/video-import";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/request-security";
import { normalizeTranscript } from "@/lib/video-transcript";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

async function authorize(request: Request, mutation = false) {
  if (mutation && !isSameOrigin(request)) return reply({ error: "Yêu cầu không hợp lệ." }, 403);
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Bạn cần đăng nhập." }, 401);
  if (user.role !== "ADMIN") return reply({ error: "Chỉ quản trị viên được quản lý video." }, 403);
  return null;
}

function slugify(value: string) {
  const slug = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70);
  return slug || `video-${Date.now()}`;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function validJsonArray(value: unknown) {
  return Array.isArray(value) ? value : [];
}

function publicVideo(row: {
  id: string; slug: string; title: string; titleVi: string | null; description: string | null; youtubeId: string; sourceUrl: string | null;
  level: string | null; category: string | null; duration: string | null; transcript: unknown; questions: unknown; published: boolean; status: string; errorMessage: string | null; ipaDialect: string | null; updatedAt: Date;
}) {
  return { ...row, updatedAt: row.updatedAt.toISOString() };
}

export async function GET(request: Request) {
  const denied = await authorize(request); if (denied) return denied;
  try {
    const q = new URL(request.url).searchParams.get("q")?.trim() || "";
    const rows = await prisma.learningVideo.findMany({
      where: q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { slug: { contains: q, mode: "insensitive" } }] } : undefined,
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }], take: 100,
      select: { id: true, slug: true, title: true, titleVi: true, description: true, youtubeId: true, sourceUrl: true, level: true, category: true, duration: true, transcript: true, questions: true, published: true, status: true, errorMessage: true, ipaDialect: true, updatedAt: true },
    });
    return reply({ items: rows.map(publicVideo) });
  } catch {
    return reply({ error: "Không tải được kho video. Hãy kiểm tra migration và database." }, 503);
  }
}

export async function POST(request: Request) {
  const denied = await authorize(request, true); if (denied) return denied;
  try {
    const body = await request.json() as Record<string, unknown>;
    const sourceUrl = clean(body.sourceUrl || body.youtubeUrl, 500);
    const youtubeId = youtubeIdFromUrl(sourceUrl);
    if (!youtubeId) return reply({ error: "Dán một link YouTube hợp lệ." }, 400);
    let sourceTranscript = normalizeTranscript(body.transcript);
    let fetchedTitle = "";
    let fetchedDuration = "";
    let transcriptSource = "upload";
    let sourceError = "";
    if (!sourceTranscript.length && typeof body.transcriptSource === "string") {
      sourceTranscript = transcriptFromSource(body.transcriptSource);
      transcriptSource = "upload";
    }
    if (!sourceTranscript.length) {
      try {
        const fetched = await fetchYoutubeSource(youtubeId);
        sourceTranscript = fetched.transcript;
        fetchedTitle = fetched.title;
        fetchedDuration = fetched.duration;
        transcriptSource = "youtube";
      } catch (error) {
        sourceError = error instanceof Error ? error.message : "Không lấy được phụ đề YouTube.";
      }
    }
    let aiError = "";
    let questions: unknown[] = [];
    if (sourceTranscript.length) {
      try {
        const enriched = await enrichVideoTranscript(sourceTranscript, clean(body.ipaDialect, 20) || "en-US");
        sourceTranscript = enriched.transcript;
        questions = enriched.questions;
      } catch (error) {
        aiError = error instanceof Error ? error.message : "Chưa tạo được nội dung bổ trợ.";
      }
    }
    const title = clean(body.title, 200) || fetchedTitle || `Video ${youtubeId}`;
    const baseSlug = slugify(clean(body.slug, 80) || title);
    const duplicate = await prisma.learningVideo.findUnique({ where: { slug: baseSlug }, select: { id: true } });
    if (duplicate) return reply({ error: "Mã đường dẫn video đã tồn tại." }, 409);
    const errorMessage = [sourceError, aiError].filter(Boolean).join(" ") || null;
    const published = body.published === true && sourceTranscript.length > 0;
    const row = await prisma.learningVideo.create({ data: {
      slug: baseSlug,
      title,
      titleVi: clean(body.titleVi, 200) || title,
      description: clean(body.description, 1000) || "Video luyện nghe và phát âm theo chủ đề VSTEP.",
      youtubeId,
      sourceUrl,
      level: clean(body.level, 20) || "B1",
      category: clean(body.category, 80) || "Luyện nghe",
      duration: clean(body.duration, 20) || fetchedDuration || "0:00",
      transcript: sourceTranscript as unknown as Prisma.InputJsonValue,
      questions: questions as unknown as Prisma.InputJsonValue,
      transcriptSource,
      ipaDialect: clean(body.ipaDialect, 20) || "en-US",
      status: published ? "PUBLISHED" : sourceTranscript.length ? "READY" : "DRAFT",
      errorMessage,
      published,
    }, select: { id: true, slug: true, title: true, titleVi: true, description: true, youtubeId: true, sourceUrl: true, level: true, category: true, duration: true, transcript: true, questions: true, published: true, status: true, errorMessage: true, ipaDialect: true, updatedAt: true } });
    return reply({ item: publicVideo(row), warning: errorMessage || undefined }, 201);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return reply({ error: "Video đã tồn tại trong kho." }, 409);
    return reply({ error: error instanceof Error ? error.message : "Không tạo được video." }, 400);
  }
}

export async function PUT(request: Request) {
  const denied = await authorize(request, true); if (denied) return denied;
  try {
    const body = await request.json() as Record<string, unknown>;
    const id = clean(body.id, 100);
    if (!id) return reply({ error: "Thiếu video cần sửa." }, 400);
    const current = await prisma.learningVideo.findUnique({ where: { id } });
    if (!current) return reply({ error: "Không tìm thấy video." }, 404);
    const transcript = normalizeTranscript(body.transcript ?? current.transcript);
    const published = body.published === true;
    if (published && !transcript.length) return reply({ error: "Cần có transcript trước khi xuất bản." }, 400);
    const row = await prisma.learningVideo.update({ where: { id }, data: {
      title: clean(body.title, 200) || current.title,
      titleVi: clean(body.titleVi, 200) || current.titleVi,
      description: clean(body.description, 1000) || current.description,
      level: clean(body.level, 20) || current.level,
      category: clean(body.category, 80) || current.category,
      duration: clean(body.duration, 20) || current.duration,
      transcript: transcript as unknown as Prisma.InputJsonValue,
      questions: validJsonArray(body.questions ?? current.questions) as unknown as Prisma.InputJsonValue,
      ipaDialect: clean(body.ipaDialect, 20) || current.ipaDialect,
      published,
      status: published ? "PUBLISHED" : current.status === "PUBLISHED" ? "READY" : current.status,
      errorMessage: null,
    }, select: { id: true, slug: true, title: true, titleVi: true, description: true, youtubeId: true, sourceUrl: true, level: true, category: true, duration: true, transcript: true, questions: true, published: true, status: true, errorMessage: true, ipaDialect: true, updatedAt: true } });
    return reply({ item: publicVideo(row) });
  } catch (error) {
    return reply({ error: error instanceof Error ? error.message : "Không lưu được video." }, 400);
  }
}
