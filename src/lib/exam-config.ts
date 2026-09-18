import type { VstepTest1Public } from "@/lib/vstep-test-1-public";

export type ExamProgram = "vstep";
export type ExamSkill = "listening" | "reading" | "writing" | "speaking";
export type ExamPart = { id: string; title: string; duration: string; questions: number; skill: ExamSkill };
export type ExamFixture = { slug: string; program: ExamProgram; title: string; subtitle: string; target: string; duration: string; questions: number; status: "sample" | "ready"; parts: ExamPart[]; content?: VstepTest1Public };

export const EXAM_PROGRAMS: Record<ExamProgram, { label: string; eyebrow: string; description: string; targets: string[]; color: string }> = {
  vstep: { label: "VSTEP", eyebrow: "LUYỆN THI VSTEP", description: "Luyện đủ bốn kỹ năng theo cấu trúc VSTEP.3–5 với bài mẫu, đề từng kỹ năng và full test.", targets: ["B1", "B2", "C1", "Đề tổng hợp"], color: "#1F7A4D" },
};
