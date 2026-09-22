import { prisma } from "@/lib/prisma";
import { Prisma, type PracticeType, type Programme, type ExamSkill } from "@prisma/client";
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
    groupId?: string;
    groupQuestions?: Array<{ id: string; prompt: string; options: string[]; answer: string }>;
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
  return (section?.parts ?? []).flatMap((part) => {
    const groupQuestions = part.questions.flatMap((question) => {
      const answer = answerFor(question, answerKey);
      if (!answer || !question.prompt || question.options.length < 2) return [];
      return [{ id: question.id, prompt: question.prompt, options: question.options, answer }];
    });
    return groupQuestions.map((question) => ({
      id: `${sourceId}:listening:${question.id}`,
      type: "LISTENING_FILL" as const,
      prompt: question.prompt,
      instruction: `Listening · ${part.title || title}`,
      payload: { options: question.options, audioUrl: part.audioUrl || undefined, groupId: `${sourceId}:listening:${part.id}`, groupQuestions },
      answer: question.answer,
    }));
  });
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

function paperItems(paper: { id: string; slug: string; title: string; sections: unknown; questions: unknown; parts: Array<{ catalog: string; sections: unknown; questions: unknown }> }) {
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
}

function sampleInto<T>(sample: T[], item: T, seen: number, size: number) {
  if (sample.length < size) sample.push(item);
  else {
    const index = Math.floor(Math.random() * seen);
    if (index < size) sample[index] = item;
  }
}

/** Uniform skill anchors + a uniform remainder, without retaining the full bank. */
export async function getMixedPracticeItems(limit = 10): Promise<MixedPracticeItem[]> {
  const safeLimit = Math.max(0, Math.floor(limit));
  if (!safeLimit) return [];
  return prisma.$transaction(async transaction => {
    const sample: MixedPracticeItem[] = [];
    const listening: MixedPracticeItem[] = [];
    const reading: MixedPracticeItem[] = [];
    let total = 0, listeningCount = 0, readingCount = 0;
    let after: string | undefined;
    // ponytail: JSON banks still require a full scan. Normalize only after staging evidence.
    while (true) {
      const papers = await transaction.examPaper.findMany({
        where: { programme: "VSTEP", status: "PUBLISHED", ...(after ? { id: { gt: after } } : {}) },
        orderBy: { id: "asc" }, take: 20,
        select: {
          id: true, slug: true, title: true, sections: true, questions: true,
          parts: { where: { catalog: { in: ["LISTENING", "READING"] } }, select: { catalog: true, sections: true, questions: true } },
        },
      });
      for (const paper of papers) for (const item of paperItems(paper)) {
        sampleInto(sample, item, ++total, safeLimit);
        if (safeLimit >= 2) {
          if (item.type === "LISTENING_FILL") sampleInto(listening, item, ++listeningCount, 1);
          else sampleInto(reading, item, ++readingCount, 1);
        }
      }
      if (papers.length < 20) break;
      after = papers.at(-1)!.id;
    }
    // Independent reservoirs make the anchors uniform within each skill and the
    // remainder uniform among non-anchors. At most two sample slots are excluded.
    const anchors = [...listening, ...reading];
    const remaining = shuffle(sample.filter(item => !anchors.includes(item))).slice(0, safeLimit - anchors.length);
    return shuffle([...anchors, ...remaining]);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
}

export async function getExamPapers(programme: Programme) {
  return prisma.examPaper.findMany({ where: { programme }, orderBy: { sortOrder: "asc" } });
}

export async function getExamBySlug(programme: Programme, slug: string) {
  return prisma.examPaper.findUnique({ where: { programme_slug: { programme, slug } } });
}
