import type { ExamPaper } from "@prisma/client";
import type { ExamFixture, ExamProgram } from "./exam-config";
import type { VstepTest1Public } from "./vstep-test-1-public";

export type VstepAnswer = { correctIndex: number; explanation: string };
export type VstepPrivateData = { version: 1; answerKey: Record<string, VstepAnswer>; sourceName?: string };
export type StoredVstepPublic = VstepTest1Public & { version: 1; durationMinutes: number; questionCount: number };

export function readStoredPaper(value: unknown): StoredVstepPublic | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const paper = value as Partial<StoredVstepPublic>;
  if (paper.version !== 1 || !paper.slug || !paper.title || !paper.listening || !paper.reading || !Array.isArray(paper.writing) || !paper.speaking) return null;
  return paper as StoredVstepPublic;
}

export function readPrivateData(value: unknown): VstepPrivateData {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { version: 1, answerKey: {} };
  const data = value as Partial<VstepPrivateData>;
  return { version: 1, answerKey: data.answerKey && typeof data.answerKey === "object" ? data.answerKey : {}, sourceName: data.sourceName };
}

export function fixtureFromRecord(record: Pick<ExamPaper, "slug" | "programme" | "title" | "subtitle" | "target" | "durationMin" | "questionCount" | "sections">): ExamFixture | null {
  const content = readStoredPaper(record.sections);
  if (!content) return null;
  if (record.programme !== "VSTEP") return null;
  const program: ExamProgram = "vstep";
  const listeningCount = content.listening.parts.reduce((sum, part) => sum + part.questions.length, 0);
  const readingCount = content.reading.passages.reduce((sum, passage) => sum + passage.questions.length, 0);
  return {
    slug: record.slug, program, title: record.title, subtitle: record.subtitle || content.subtitle,
    target: record.target || content.target, duration: `${record.durationMin} phút`, questions: record.questionCount,
    status: "ready", content,
    parts: [
      { id: "listening", title: "Listening", duration: "47 phút", questions: listeningCount, skill: "listening" },
      { id: "reading", title: "Reading", duration: "60 phút", questions: readingCount, skill: "reading" },
      { id: "writing", title: "Writing", duration: "60 phút", questions: content.writing.length, skill: "writing" },
      { id: "speaking", title: "Speaking", duration: "12 phút", questions: content.speaking.parts.length, skill: "speaking" },
    ],
  };
}

export function publicQuestionMap(paper: VstepTest1Public) {
  return new Map([...paper.listening.parts.flatMap(part => part.questions), ...paper.reading.passages.flatMap(passage => passage.questions)].map(question => [question.id, question]));
}
