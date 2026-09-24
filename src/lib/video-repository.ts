import "server-only";

import { prisma } from "@/lib/prisma";
import { CLASSROOM_INSTRUCTIONS_QUESTIONS, LEARNING_VIDEOS, type LearningVideo, type VideoQuestion } from "@/lib/video-config";
import { normalizeTranscript } from "@/lib/video-transcript";

function normalizeQuestions(value: unknown): VideoQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || typeof row.prompt !== "string" || !Array.isArray(row.options)) return [];
    const options = row.options.filter((option): option is string => typeof option === "string");
    const correctIndex = Number(row.correctIndex);
    const atSeconds = Number(row.atSeconds);
    if (!options.length || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length || !Number.isFinite(atSeconds)) return [];
    return [{ id: row.id, atSeconds, prompt: row.prompt, options, correctIndex }];
  });
}

export function learningVideoFromRow(row: {
  slug: string; title: string; titleVi: string | null; description: string | null; youtubeId: string; sourceUrl: string | null;
  level: string | null; category: string | null; duration: string | null; transcript: unknown; questions: unknown;
}): LearningVideo {
  const fallback = LEARNING_VIDEOS.find((video) => video.slug === row.slug);
  const transcript = normalizeTranscript(row.transcript);
  // The first migration shipped a two-line seed for this fixture; keep the complete
  // checked-in transcript until an admin republishes the database row.
  const completeTranscript = row.slug === "classroom-instructions" && (fallback?.transcript.length ?? 0) > transcript.length ? fallback?.transcript ?? [] : transcript;
  const questions = normalizeQuestions(row.questions);
  return {
    slug: row.slug,
    title: row.title,
    titleVi: row.titleVi || fallback?.titleVi || row.title,
    description: row.description || fallback?.description || "Luyện nghe và mở rộng vốn tiếng Anh theo chủ đề.",
    level: row.level || fallback?.level || "B1",
    category: row.category || fallback?.category || "Luyện nghe",
    duration: row.duration || fallback?.duration || "0:00",
    youtubeId: row.youtubeId,
    transcript: completeTranscript.length ? completeTranscript : (fallback?.transcript ?? []),
    questions: questions.length ? questions : (fallback?.questions ?? []),
  };
}

const rowSelect = { slug: true, title: true, titleVi: true, description: true, youtubeId: true, sourceUrl: true, level: true, category: true, duration: true, transcript: true, questions: true } as const;

export async function listPublishedLearningVideos() {
  try {
    const rows = await prisma.learningVideo.findMany({ where: { published: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }], select: rowSelect });
    return rows.length ? rows.map(learningVideoFromRow) : LEARNING_VIDEOS;
  } catch {
    return LEARNING_VIDEOS;
  }
}

export async function findPublishedLearningVideo(slug: string) {
  try {
    const row = await prisma.learningVideo.findFirst({ where: { slug, published: true }, select: rowSelect });
    if (row) return learningVideoFromRow(row);
    const existing = await prisma.learningVideo.findUnique({ where: { slug }, select: { id: true } });
    return existing ? undefined : LEARNING_VIDEOS.find((video) => video.slug === slug);
  } catch {
    // The static catalog keeps the public page usable while the database is unavailable.
  }
  return LEARNING_VIDEOS.find((video) => video.slug === slug);
}

export { CLASSROOM_INSTRUCTIONS_QUESTIONS };
