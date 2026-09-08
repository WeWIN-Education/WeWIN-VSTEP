import { prisma } from "@/lib/prisma";
import type { PracticeType } from "@prisma/client";

export const PRACTICE_TYPES = [
  {
    slug: "word-order",
    type: "WORD_ORDER" as PracticeType,
    title: "Sắp xếp từ thành câu hoàn chỉnh",
    description:
      "Ghép các từ xáo trộn lại thành một câu tiếng Anh đúng ngữ pháp.",
  },
  {
    slug: "fill-blank",
    type: "FILL_BLANK" as PracticeType,
    title: "Điền từ vào chỗ trống",
    description:
      "Chọn từ đúng để điền vào chỗ trống trong câu, dựa theo nghĩa và ngữ cảnh.",
  },
  {
    slug: "listening-fill",
    type: "LISTENING_FILL" as PracticeType,
    title: "Nghe điền từ còn thiếu",
    description: "Nghe cả câu rồi chọn đúng từ đã bị lược khỏi câu.",
  },
  {
    slug: "listening-order",
    type: "LISTENING_ORDER" as PracticeType,
    title: "Nghe và sắp xếp nội dung theo thứ tự",
    description: "Nghe từng lượt thoại rồi sắp xếp lại đúng thứ tự hội thoại.",
  },
  {
    slug: "cloze-reading",
    type: "CLOZE_READING" as PracticeType,
    title: "Đọc hiểu và suy đoán điền từ",
    description:
      "Đọc cả đoạn văn rồi đoán từ khoá còn thiếu dựa vào mạch nghĩa xung quanh.",
  },
] as const;

export type PracticeSlug = (typeof PRACTICE_TYPES)[number]["slug"];

export function getPracticeMeta(slug: string) {
  return PRACTICE_TYPES.find((t) => t.slug === slug) ?? null;
}

export async function getPracticeItems(type: PracticeType, level = 1) {
  return prisma.practiceItem.findMany({
    where: { type, level },
    orderBy: { sortOrder: "asc" },
  });
}

export async function getExamPapers(level: number) {
  return prisma.examPaper.findMany({
    where: { level },
    orderBy: [{ difficulty: "asc" }, { sortOrder: "asc" }],
  });
}

export async function getExamBySlugs(level: number, slug: string) {
  return prisma.examPaper.findUnique({
    where: { level_slug: { level, slug } },
  });
}
