import { prisma } from "@/lib/prisma";
import type { PracticeType, Programme, ExamSkill } from "@prisma/client";
import { readPrivateData, readStoredPaper } from "@/lib/vstep-paper";
import type { VstepListeningPart, VstepQuestion, VstepReadingPassage } from "@/lib/vstep-test-1-public";

export const PRACTICE_TYPES = [
  { slug: "word-order", type: "WORD_ORDER" as PracticeType, title: "Sắp xếp từ thành câu", description: "Ghép câu lệnh và câu trả lời đúng trật tự." },
  { slug: "fill-blank", type: "FILL_BLANK" as PracticeType, title: "Điền từ vào chỗ trống", description: "Chọn cụm từ phù hợp với ngữ cảnh." },
  { slug: "listening-fill", type: "LISTENING_FILL" as PracticeType, title: "Nghe điền từ", description: "Nghe câu mẫu và chọn từ còn thiếu." },
  { slug: "listening-order", type: "LISTENING_ORDER" as PracticeType, title: "Sắp xếp hội thoại", description: "Nghe một lượt thoại rồi xếp lại thứ tự." },
  { slug: "writing", type: "WRITING" as PracticeType, title: "Luyện viết ngắn", description: "Viết email, phản hồi hoặc hướng dẫn ngắn." },
] as const;

export async function getPracticeItems(type: PracticeType, programme?: Programme, skill?: ExamSkill) {
  return prisma.practiceItem.findMany({ where: { type, programme, skill }, orderBy: { sortOrder: "asc" } });
}

export type MixedPracticeItem = {
  id: string;
  type: "LISTENING_FILL" | "CLOZE_READING";
  prompt: string;
  instruction: string;
  payload: {
    options: string[];
    passage?: string;
    audioUrl?: string;
  };
  answer: string;
};

type SectionContainer = { listening?: { parts?: VstepListeningPart[] }; reading?: { passages?: VstepReadingPassage[] } };

function sectionValue(value: unknown): SectionContainer | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as SectionContainer : null;
}

function answerFor(question: VstepQuestion, answerKey: Record<string, { correctIndex: number }>) {
  const correctIndex = answerKey[question.id]?.correctIndex;
  return typeof correctIndex === "number" ? question.options[correctIndex] ?? null : null;
}

function listeningItems(sourceId: string, title: string, section: { parts?: VstepListeningPart[] } | undefined, answerKey: Record<string, { correctIndex: number }>): MixedPracticeItem[] {
  return (section?.parts ?? []).flatMap((part) => part.questions.flatMap((question) => {
    const answer = answerFor(question, answerKey);
    if (!answer || !question.prompt || question.options.length < 2) return [];
    return [{
      id: `${sourceId}:listening:${question.id}`,
      type: "LISTENING_FILL" as const,
      prompt: question.prompt,
      instruction: `Listening · ${part.title || title}`,
      payload: { options: question.options, audioUrl: part.audioUrl || undefined },
      answer,
    }];
  }));
}

function readingItems(sourceId: string, section: { passages?: VstepReadingPassage[] } | undefined, answerKey: Record<string, { correctIndex: number }>): MixedPracticeItem[] {
  return (section?.passages ?? []).flatMap((passage) => passage.questions.flatMap((question) => {
    const answer = answerFor(question, answerKey);
    if (!answer || !question.prompt || question.options.length < 2) return [];
    return [{
      id: `${sourceId}:reading:${question.id}`,
      type: "CLOZE_READING" as const,
      prompt: question.prompt,
      instruction: `Reading · ${passage.title}`,
      payload: { passage: passage.text, options: question.options },
      answer,
    }];
  }));
}

function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

/** Builds an ephemeral mixed session from published VSTEP Listening/Reading banks. */
export async function getMixedPracticeItems(limit = 10): Promise<MixedPracticeItem[]> {
  const papers = await prisma.examPaper.findMany({
    where: { programme: "VSTEP", status: "PUBLISHED" },
    select: {
      id: true,
      slug: true,
      title: true,
      sections: true,
      questions: true,
      parts: {
        where: { catalog: { in: ["LISTENING", "READING"] } },
        select: { catalog: true, sections: true, questions: true },
      },
    },
  });

  const candidates = papers.flatMap((paper) => {
    const storedPaper = readStoredPaper(paper.sections);
    const fallbackSections = sectionValue(storedPaper);
    const fallbackAnswerKey = readPrivateData(paper.questions).answerKey;
    const listeningPart = paper.parts.find((part) => part.catalog === "LISTENING");
    const readingPart = paper.parts.find((part) => part.catalog === "READING");
    const listeningSource = sectionValue(listeningPart?.sections)?.listening ?? fallbackSections?.listening;
    const readingSource = sectionValue(readingPart?.sections)?.reading ?? fallbackSections?.reading;
    const listeningPartAnswerKey = readPrivateData(listeningPart?.questions).answerKey;
    const readingPartAnswerKey = readPrivateData(readingPart?.questions).answerKey;
    const listeningAnswerKey = Object.keys(listeningPartAnswerKey).length ? listeningPartAnswerKey : fallbackAnswerKey;
    const readingAnswerKey = Object.keys(readingPartAnswerKey).length ? readingPartAnswerKey : fallbackAnswerKey;
    return [
      ...listeningItems(`${paper.id}:${paper.slug}`, paper.title, listeningSource, listeningAnswerKey),
      ...readingItems(`${paper.id}:${paper.slug}`, readingSource, readingAnswerKey),
    ];
  });

  const safeLimit = Math.max(0, limit);
  if (safeLimit < 2) return shuffle(candidates).slice(0, safeLimit);
  const listening = shuffle(candidates.filter((item) => item.type === "LISTENING_FILL"));
  const reading = shuffle(candidates.filter((item) => item.type === "CLOZE_READING"));
  const selected = [listening.shift(), reading.shift()].filter((item): item is MixedPracticeItem => Boolean(item));
  const remaining = shuffle([...listening, ...reading]).slice(0, Math.max(0, safeLimit - selected.length));
  return shuffle([...selected, ...remaining]);
}

export async function getExamPapers(programme: Programme) {
  return prisma.examPaper.findMany({ where: { programme }, orderBy: { sortOrder: "asc" } });
}

export async function getExamBySlug(programme: Programme, slug: string) {
  return prisma.examPaper.findUnique({ where: { programme_slug: { programme, slug } } });
}
