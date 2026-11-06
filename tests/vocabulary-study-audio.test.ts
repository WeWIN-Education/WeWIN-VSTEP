import { beforeEach, expect, it, vi } from "vitest";
const db = vi.hoisted(() => ({
  $transaction: vi.fn(), $queryRaw: vi.fn(),
  vocabularyStudy: { findUnique: vi.fn(), upsert: vi.fn() },
  vocabularyProgress: { findMany: vi.fn() },
  vocabularyEntry: { findMany: vi.fn() },
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: db }));
import { startStudy } from "../src/lib/vocabulary-study";

const entries = [
  { id: "assignment", entryCode: "A1_A2-A1_A2_EDUCATION_001", term: "assignment", audioUrl: null },
  { id: "airship", entryCode: "A1_A2-A1_A2_TRANSPORT_004", term: "airship", audioUrl: null },
];
beforeEach(() => {
  vi.resetAllMocks();
  db.$transaction.mockImplementation(async callback => callback(db));
  db.$queryRaw.mockResolvedValue([]);
  db.vocabularyStudy.findUnique.mockResolvedValue(null);
  db.vocabularyStudy.upsert.mockResolvedValue({ version: "session", isReview: false });
  db.vocabularyProgress.findMany.mockResolvedValue([]);
  db.vocabularyEntry.findMany.mockResolvedValue(entries);
});

it.each(["new", "resume", "review"])("attaches recordings and suppresses mismatched files for a %s daily lesson", async mode => {
  if (mode === "resume") db.vocabularyStudy.findUnique.mockResolvedValue({ version: "session", passedAt: null, isReview: false, entryIds: entries.map(e => e.id) });
  if (mode === "review") db.vocabularyProgress.findMany.mockResolvedValue(entries.map(e => ({ entryId: e.id })));
  const session = await startStudy("learner", 5);
  expect(session.entries[0].audioUrl).toMatch(/^\/audio\/vocabulary\/a1-a2\//);
  expect(session.entries[1]).toMatchObject({ audioUrl: null, pronunciationUnavailable: true });
  expect(db.vocabularyEntry.findMany).toHaveBeenCalledTimes(1);
});
