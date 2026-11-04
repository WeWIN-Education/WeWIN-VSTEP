import "server-only";

import { prisma } from "@/lib/prisma";
import { CLASSROOM_INSTRUCTIONS_QUESTIONS, LEARNING_VIDEOS, type LearningVideo, type VideoQuestion } from "@/lib/video-config";
import { normalizeTranscript } from "@/lib/video-transcript";
import { cache } from "react";
import type { Prisma } from "@prisma/client";

export type VideoSummary = Omit<LearningVideo, "transcript" | "questions">;

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

export async function listPublishedLearningVideos(page = 1, filter = "", q = "") {
  const size = 12;
  const where: Prisma.LearningVideoWhereInput = { published: true,
    ...(filter ? { OR: [{ level: filter }, { category: filter }] } : {}),
    ...(q ? { AND: [{ OR: [{ title: { contains: q, mode: "insensitive" } }, { titleVi: { contains: q, mode: "insensitive" } }] }] } : {}),
  };
  try {
    const [total, groups] = await Promise.all([
      prisma.learningVideo.count({ where }),
      prisma.learningVideo.groupBy({ by: ["level", "category"], where: { published: true } }),
    ]);
    const currentPage = Math.min(Math.max(1, page), Math.max(1, Math.ceil(total / size)));
    const rows = await prisma.learningVideo.findMany({ where, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }, { id: "asc" }],
      skip: (currentPage - 1) * size, take: size,
      select: { slug: true, title: true, titleVi: true, description: true, youtubeId: true, level: true, category: true, duration: true },
    });
    const items: VideoSummary[] = rows.map(row => ({ ...row, titleVi: row.titleVi || row.title, description: row.description || "", level: row.level || "B1", category: row.category || "Luyện nghe", duration: row.duration || "0:00" }));
    return { items, total, page: currentPage, pages: Math.max(1, Math.ceil(total / size)), filters: [...new Set(groups.flatMap(row => [row.level, row.category]).filter((value): value is string => !!value))] };
  } catch {
    const items = LEARNING_VIDEOS.filter(video => (!filter || video.level === filter || video.category === filter) && (!q || `${video.title} ${video.titleVi}`.toLocaleLowerCase().includes(q.toLocaleLowerCase())))
      .map(video => ({ slug: video.slug, title: video.title, titleVi: video.titleVi, description: video.description, youtubeId: video.youtubeId, level: video.level, category: video.category, duration: video.duration }));
    return { items, total: items.length, page: 1, pages: 1, filters: [...new Set(LEARNING_VIDEOS.flatMap(video => [video.level, video.category]))] };
  }
}

export const findPublishedLearningVideo = cache(async (slug: string) => {
  try {
    const row = await prisma.learningVideo.findFirst({ where: { slug, published: true }, select: rowSelect });
    if (row) return learningVideoFromRow(row);
    const existing = await prisma.learningVideo.findUnique({ where: { slug }, select: { id: true } });
    return existing ? undefined : LEARNING_VIDEOS.find((video) => video.slug === slug);
  } catch {
    // The static catalog keeps the public page usable while the database is unavailable.
  }
  return LEARNING_VIDEOS.find((video) => video.slug === slug);
});

// Progress writes need quiz validation, never the transcript payload.
export async function findLearningVideoProgressSource(slug: string) {
  try {
    const row = await prisma.learningVideo.findUnique({ where: { slug }, select: { published: true, duration: true, questions: true } });
    if (row) {
      const questions = normalizeQuestions(row.questions);
      return row.published ? { duration: row.duration || "0:00", questions: questions.length ? questions : (LEARNING_VIDEOS.find(video => video.slug === slug)?.questions ?? []) } : undefined;
    }
  } catch { /* Keep the bundled lesson available during an outage. */ }
  const fallback = LEARNING_VIDEOS.find(video => video.slug === slug);
  return fallback ? { duration: fallback.duration, questions: fallback.questions } : undefined;
}

export { CLASSROOM_INSTRUCTIONS_QUESTIONS };
