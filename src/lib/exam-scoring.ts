import type { VstepTest1Public } from "./vstep-test-1-public";
import { readPrivateData, readStoredPaper, type VstepPrivateData } from "./vstep-paper";

export type ExamCatalogCode = "FULL" | "LISTENING" | "READING" | "WRITING" | "SPEAKING";

function emptyListening(paper: VstepTest1Public) {
  return { instructions: paper.listening.instructions, parts: [] };
}

function emptyReading(paper: VstepTest1Public) {
  return { instructions: paper.reading.instructions, passages: [] };
}

export function selectCatalogPaper(paper: VstepTest1Public, catalog: ExamCatalogCode): VstepTest1Public {
  if (catalog === "FULL") return paper;
  return {
    ...paper,
    listening: catalog === "LISTENING" ? paper.listening : emptyListening(paper),
    reading: catalog === "READING" ? paper.reading : emptyReading(paper),
    writing: catalog === "WRITING" ? paper.writing : [],
    speaking: catalog === "SPEAKING" ? paper.speaking : { parts: [] },
  };
}

export function resolveExamData(_slug: string, sections: unknown, questions: unknown): { paper: VstepTest1Public; privateData: VstepPrivateData } | null {
  const imported = readStoredPaper(sections);
  if (imported) return { paper: imported, privateData: readPrivateData(questions) };
  return null;
}

export function resolveCatalogExamData({
  slug,
  sections,
  questions,
  catalog,
  partSections,
  partQuestions,
}: {
  slug: string;
  sections: unknown;
  questions: unknown;
  catalog: ExamCatalogCode;
  partSections?: unknown;
  partQuestions?: unknown;
}) {
  const full = resolveExamData(slug, sections, questions);
  if (!full || catalog === "FULL") return full;
  const partialSections = partSections && typeof partSections === "object" && !Array.isArray(partSections) ? partSections as Partial<VstepTest1Public> : {};
  const partPaper = { ...full.paper, ...partialSections } as VstepTest1Public;
  return {
    paper: selectCatalogPaper(partPaper, catalog),
    privateData: readPrivateData(partQuestions),
  };
}

function scoreSection(paper: VstepTest1Public, privateData: VstepPrivateData, answers: Record<string,string>, section: "listening"|"reading") {
  const questions = section === "listening" ? paper.listening.parts.flatMap(part=>part.questions) : paper.reading.passages.flatMap(passage=>passage.questions);
  const correct = questions.filter(question => answers[question.id] === String.fromCharCode(65 + (privateData.answerKey[question.id]?.correctIndex ?? -1))).length;
  return { correct, total: questions.length, score: questions.length ? Math.round(correct/questions.length*100)/10 : null };
}
export function scoreExam(paper: VstepTest1Public, privateData: VstepPrivateData, answers: Record<string,string>) {
  const listening=scoreSection(paper,privateData,answers,"listening"),reading=scoreSection(paper,privateData,answers,"reading");
  return {listening,reading,answered:Object.keys(answers).length,objectiveTotal:listening.total+reading.total};
}
