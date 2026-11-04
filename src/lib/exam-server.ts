import "server-only";
import { prisma } from "./prisma";
import type { ExamProgram, ExamFixture, ExamSkill } from "./exam-config";
import type { VstepTest1Public } from "./vstep-test-1-public";
import { fixtureForCatalog, fixtureFromRecord } from "./vstep-paper";
import type { ExamCatalog } from "@prisma/client";

export type ExamAccess =
  | { kind: "guest" }
  | { kind: "learner"; userId: string }
  | { kind: "admin"; userId: string };

export type ExamPaperForRun = NonNullable<Awaited<ReturnType<typeof prisma.examPaper.findUnique>>>;

function normalizedSlug(slug: string) {
  return slug === "vstep-sample-01" ? "vstep-test-1" : slug;
}

function programmeFor(program: ExamProgram) {
  return program.toUpperCase() as "VSTEP";
}

/** Return the stored paper only when its publication state permits the actor. */
export async function getExamPaperForAccess(program: ExamProgram, slug: string, access: ExamAccess) {
  const record = await prisma.examPaper.findUnique({
    where: { programme_slug: { programme: programmeFor(program), slug: normalizedSlug(slug) } },
  });
  if (!record) return undefined;

  if (access.kind === "guest") {
    if (record.status !== "PUBLISHED") return undefined;
  } else if (access.kind === "learner") {
    if (record.status !== "PUBLISHED") return undefined;
  } else if (!["READY", "SAMPLE", "PUBLISHED"].includes(record.status)) {
    return undefined;
  }

  return record;
}

/**
 * Resolve the public fixture after applying access control. The built-in
 * VSTEP fixture is used only as a representation of an existing database
 * paper whose public JSON predates the stored-paper envelope.
 */
export async function getExamForRun(program: ExamProgram, slug: string, access: ExamAccess = { kind: "learner", userId: "" }, catalog: ExamCatalog = "FULL") {
  const selectedCatalog = catalog === "FULL" ? "LISTENING" : catalog;
  const summary = await prisma.examPaper.findUnique({
    where: { programme_slug: { programme: programmeFor(program), slug: normalizedSlug(slug) } },
    select: { id: true, slug: true, title: true, subtitle: true, target: true, durationMin: true, questionCount: true, status: true,
      parts: { where: { catalog: { not: "FULL" } }, orderBy: { sortOrder: "asc" }, select: { catalog: true, skill: true, title: true, durationMin: true, questionCount: true } } },
  });
  if (!summary || (access.kind === "admin" ? !["READY", "SAMPLE", "PUBLISHED"].includes(summary.status) : summary.status !== "PUBLISHED")) return undefined;
  const part = await prisma.examPaperPart.findUnique({ where: { examPaperId_catalog: { examPaperId: summary.id, catalog: selectedCatalog } }, select: { sections: true } });
  const completeMetadata = ["LISTENING", "READING", "WRITING", "SPEAKING"].every(skill => summary.parts.some(row => row.catalog === skill && row.skill === skill));
  if (completeMetadata && part?.sections && typeof part.sections === "object" && !Array.isArray(part.sections)) {
    const skill = selectedCatalog.toLowerCase() as ExamSkill;
    const sections = part.sections as Partial<VstepTest1Public>;
    const content: VstepTest1Public = { slug: summary.slug, title: summary.title, subtitle: summary.subtitle || "", target: summary.target || "VSTEP",
      listening: { instructions: "", parts: [] }, reading: { instructions: "", passages: [] }, writing: [], speaking: { parts: [] },
      [skill]: sections[skill],
    };
    if (!content[skill]) return undefined;
    const fixture: ExamFixture = { slug: summary.slug, program, title: summary.title, subtitle: summary.subtitle || "", target: summary.target || "VSTEP",
      duration: `${summary.durationMin} phút`, questions: summary.questionCount, status: "ready", content, loadedSkills: [skill],
      parts: summary.parts.filter(p => p.skill).map(p => ({ id: p.skill!.toLowerCase(), skill: p.skill!.toLowerCase() as ExamSkill, title: p.title, duration: `${p.durationMin} phút`, questions: p.questionCount })),
    };
    return fixture;
  }
  // Older imports without per-skill rows still work; reimport to use bounded reads.
  const record = await getExamPaperForAccess(program, slug, access);
  if (!record) return undefined;
  const exam = fixtureFromRecord(record);
  return exam ? { ...fixtureForCatalog(exam, selectedCatalog), loadedSkills: [selectedCatalog.toLowerCase() as ExamSkill] } : undefined;
}
