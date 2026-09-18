import "server-only";
import { prisma } from "./prisma";
import type { ExamProgram } from "./exam-config";
import { fixtureFromRecord } from "./vstep-paper";

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
export async function getExamForRun(program: ExamProgram, slug: string, access: ExamAccess = { kind: "learner", userId: "" }) {
  const record = await getExamPaperForAccess(program, slug, access);
  if (!record) return undefined;
  return fixtureFromRecord(record) || undefined;
}
