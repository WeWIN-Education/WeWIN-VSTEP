import { afterEach, beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ papers: vi.fn(), users: vi.fn(), current: vi.fn(), count: vi.fn(), transaction: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: {
  examPaper: { findMany: db.papers },
  user: { findMany: db.users, findFirst: db.current, count: db.count },
  $transaction: db.transaction,
} }));
import { getMixedPracticeItems } from "../src/lib/practice";
import { getLeaderboard } from "../src/lib/gamification";

type Learner = { id: string; name: string | null; xp: number; createdAt: Date; role: string; isActive: boolean };
const learner = (i: number): Learner => ({ id: `u${String(i).padStart(5, "0")}`, name: i % 3 ? `Learner ${i}` : null, xp: Math.floor(i / 3), createdAt: new Date(1700000000000 + i % 5), role: "LEARNER", isActive: true });
function ranked(data: Learner[], userId?: string) {
  const sorted = data.filter(u => u.role === "LEARNER" && u.isActive).sort((a, b) => b.xp - a.xp || +a.createdAt - +b.createdAt || a.id.localeCompare(b.id));
  const all = sorted.map(({ id, name, xp }) => ({ id, name, xp, rank: sorted.findIndex(u => u.xp === xp) + 1, isCurrentUser: id === userId }));
  const currentUser = all.find(u => u.id === userId) ?? null;
  const entries = all.slice(0, 10);
  if (currentUser && !entries.some(u => u.id === userId)) entries.push(currentUser);
  return { entries, currentUser };
}
function mockLearners(data: Learner[]) {
  const metrics = { rows: 0, bytes: 0, reads: 0 };
  const filtered = () => data.filter(u => u.role === "LEARNER" && u.isActive);
  function measure<T>(value: T, rows: number) { metrics.rows += rows; metrics.bytes += Buffer.byteLength(JSON.stringify(value)); metrics.reads++; return value; }
  db.users.mockImplementation(async ({ take, where, orderBy, select }) => {
    expect(where).toEqual({ role: "LEARNER", isActive: true });
    expect(orderBy).toEqual([{ xp: "desc" }, { createdAt: "asc" }, { id: "asc" }]);
    expect(select).toEqual({ id: true, name: true, xp: true });
    const sorted = filtered().sort((a, b) => b.xp - a.xp || +a.createdAt - +b.createdAt || a.id.localeCompare(b.id));
    const rows = (take ? sorted.slice(0, take) : sorted).map(({ id, name, xp }) => ({ id, name, xp }));
    return measure(rows, rows.length);
  });
  db.current.mockImplementation(async ({ where }) => {
    expect(where.role).toBe("LEARNER"); expect(where.isActive).toBe(true);
    const found = filtered().find(u => u.id === where.id);
    return measure(found ? { id: found.id, name: found.name, xp: found.xp } : null, found ? 1 : 0);
  });
  db.count.mockImplementation(async ({ where }) => {
    expect(where.role).toBe("LEARNER"); expect(where.isActive).toBe(true);
    return measure(filtered().filter(u => u.xp > where.xp.gt).length, 0);
  });
  return metrics;
}
function paper(i: number, listeningCount = 40, readingCount = 40) {
  const question = (skill: string, j: number) => ({ id: `${skill}${j}`, prompt: `Question ${j}: ${"context ".repeat(10)}`, options: ["correct", "wrong", "third"] });
  const listening = { parts: [{ title: "Listening", audioUrl: "/fixture.mp3", questions: Array.from({ length: listeningCount }, (_, j) => question("l", j)) }] };
  const reading = { passages: [{ title: "Reading", text: "Passage ".repeat(200), questions: Array.from({ length: readingCount }, (_, j) => question("r", j)) }] };
  const questions = { answerKey: Object.fromEntries([...listening.parts[0].questions, ...reading.passages[0].questions].map(q => [q.id, { correctIndex: 0 }])) };
  return { id: `p${String(i).padStart(5, "0")}`, slug: `paper-${i}`, title: `Paper ${i}`, programme: "VSTEP", status: "PUBLISHED", sections: { version: 1, slug: `paper-${i}`, title: "Paper", listening, reading, writing: [], speaking: {} }, questions,
    parts: [{ catalog: "LISTENING", sections: { listening }, questions }, { catalog: "READING", sections: { reading }, questions }] };
}
function mockPapers(data: ReturnType<typeof paper>[]) {
  const metrics = { reads: 0, rows: 0, peakRows: 0, bytes: 0, peakBytes: 0 };
  db.papers.mockImplementation(async ({ where, take, orderBy }) => {
    expect(where.programme).toBe("VSTEP"); expect(where.status).toBe("PUBLISHED");
    if (take) expect(orderBy).toEqual({ id: "asc" });
    const eligible = data.filter(row => row.programme === where.programme && row.status === where.status && (!where.id?.gt || row.id > where.id.gt)).sort((a, b) => a.id.localeCompare(b.id));
    const rows = (take ? eligible.slice(0, take) : eligible).map(({ id, slug, title, sections, questions, parts }) => ({ id, slug, title, sections, questions, parts }));
    const bytes = Buffer.byteLength(JSON.stringify(rows));
    metrics.reads++; metrics.rows += rows.length; metrics.peakRows = Math.max(metrics.peakRows, rows.length); metrics.bytes += bytes; metrics.peakBytes = Math.max(metrics.peakBytes, bytes);
    return rows;
  });
  return metrics;
}
beforeEach(() => {
  vi.resetAllMocks();
  db.transaction.mockImplementation(async fn => fn({ examPaper: { findMany: db.papers }, user: { findMany: db.users, findFirst: db.current, count: db.count } }));
});
afterEach(() => vi.restoreAllMocks());

it.each([0, 1, 7, 10, 11, 100, 1000])("matches original global ranking with %i learners", async size => {
  const data = Array.from({ length: size }, (_, i) => learner(i));
  data.push({ ...learner(9000), isActive: false }, { ...learner(9001), role: "ADMIN" });
  mockLearners(data);
  for (const id of [undefined, "u00000", "u00005", "u09000", "u09001", "missing"]) {
    expect(await getLeaderboard(id)).toEqual(ranked(data, id));
  }
});
it("preserves competition ranks and deterministic display order for all-equal scores", async () => {
  const data = Array.from({ length: 100 }, (_, i) => ({ ...learner(i), xp: 100 }));
  mockLearners(data);
  expect(await getLeaderboard("u00099")).toEqual(ranked(data, "u00099"));
});
it("reports controlled leaderboard result size", async () => {
  const metrics = mockLearners(Array.from({ length: 1000 }, (_, i) => learner(i)));
  await getLeaderboard("u00000");
  expect(metrics.rows).toBe(11); expect(metrics.reads).toBe(3);
  expect(db.transaction.mock.lastCall![1]).toMatchObject({ isolationLevel: "RepeatableRead" });
  console.info("phase3-fixture-leaderboard", JSON.stringify(metrics));
});
it("reports controlled mixed-practice batch size", async () => {
  const metrics = mockPapers(Array.from({ length: 200 }, (_, i) => paper(i)));
  const result = await getMixedPracticeItems(10);
  expect(result).toHaveLength(10); expect(new Set(result.map(q => q.id)).size).toBe(10);
  expect(new Set(result.map(q => q.type)).size).toBe(2);
  expect(metrics.peakRows).toBe(20);
  expect(db.transaction.mock.lastCall![1]).toMatchObject({ isolationLevel: "RepeatableRead" });
  console.info("phase3-fixture-practice", JSON.stringify(metrics));
});

it.each([0, 1, 2, 10, 50])("keeps limits and uniqueness for a small mixed bank (limit %i)", async limit => {
  mockPapers([paper(0, 2, 4), paper(1, 1, 1)]);
  const items = await getMixedPracticeItems(limit);
  expect(items).toHaveLength(Math.min(limit, 8));
  expect(new Set(items.map(item => item.id)).size).toBe(items.length);
  if (limit >= 2) expect(new Set(items.map(item => item.type)).size).toBe(2);
  if (!limit) expect(db.papers).not.toHaveBeenCalled();
});
it.each([[0, 0], [1, 0], [0, 1], [0, 80], [80, 0]])("handles listening=%i reading=%i without inventing questions", async (l, r) => {
  mockPapers([paper(0, l, r)]);
  expect(await getMixedPracticeItems()).toHaveLength(Math.min(10, l + r));
});
it("keeps part precedence, legacy fallback, validity rules and audio/passage content", async () => {
  const row = paper(0, 3, 3);
  row.sections.listening.parts[0].questions[0].prompt = "legacy prompt";
  // Use detached part JSON to mirror the actual stored format.
  row.parts = structuredClone(row.parts);
  row.parts[0].sections.listening!.parts[0].questions[0].prompt = "part prompt";
  row.parts[0].questions.answerKey.l0.correctIndex = 1;
  row.parts[0].sections.listening!.parts[0].questions[1].prompt = "";
  row.parts[0].questions.answerKey.l2.correctIndex = 99;
  row.parts = row.parts.slice(0, 1);
  mockPapers([row]);
  const items = await getMixedPracticeItems(50);
  expect(items).toHaveLength(4);
  const listening = items.find(item => item.type === "LISTENING_FILL")!;
  expect(listening.prompt).toBe("part prompt"); expect(listening.answer).toBe("wrong");
  expect(listening.payload.audioUrl).toBe("/fixture.mp3");
  expect(items.filter(item => item.type === "CLOZE_READING").every(item => item.payload.passage === row.sections.reading.passages[0].text)).toBe(true);
});
it("does not cache publication, edits or removal between mixed sessions", async () => {
  const rows = [paper(0, 1, 1), { ...paper(1, 1, 1), status: "SAMPLE" }, { ...paper(2), programme: "OTHER" }];
  mockPapers(rows);
  expect((await getMixedPracticeItems(50)).every(item => item.id.startsWith("p00000:"))).toBe(true);
  rows[0].status = "SAMPLE"; rows[1].status = "PUBLISHED";
  rows[1].parts[0].sections.listening!.parts[0].questions[0].prompt = "edited";
  const next = await getMixedPracticeItems(50);
  expect(next).toHaveLength(2); expect(next.some(item => item.prompt === "edited")).toBe(true);
  rows.splice(1, 1);
  expect(await getMixedPracticeItems()).toEqual([]);
});
it("does not cache ranking across score/activity changes or accounts", async () => {
  const rows = Array.from({ length: 30 }, (_, i) => learner(i));
  const metrics = mockLearners(rows);
  expect(await getLeaderboard("u00000")).toEqual(ranked(rows, "u00000"));
  rows[0].xp = 900; rows[29].isActive = false;
  expect(await getLeaderboard("u00000")).toEqual(ranked(rows, "u00000"));
  expect(await getLeaderboard("u00029")).toEqual(ranked(rows, "u00029"));
  expect(metrics.reads).toBeGreaterThan(3);
});
it("matches the original selection distribution on a seeded unequal-skill bank", async () => {
  mockPapers([paper(0, 2, 4)]);
  let seed = 1729;
  vi.spyOn(Math, "random").mockImplementation(() => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  });
  const shuffle = <T,>(values: T[]) => {
    const result = [...values];
    for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
    return result;
  };
  const oldCounts = new Map<string, number>(), newCounts = new Map<string, number>();
  const rounds = 12000;
  for (let i = 0; i < rounds; i++) {
    const listening = shuffle(["l0", "l1"]), reading = shuffle(["r0", "r1", "r2", "r3"]);
    const anchors = [listening.shift()!, reading.shift()!];
    const old = shuffle([...anchors, ...shuffle([...listening, ...reading]).slice(0, 1)]);
    const next = await getMixedPracticeItems(3);
    for (const id of old) oldCounts.set(id, (oldCounts.get(id) ?? 0) + 1);
    for (const item of next) { const id = item.id.split(":").at(-1)!; newCounts.set(id, (newCounts.get(id) ?? 0) + 1); }
  }
  for (const id of ["l0", "l1", "r0", "r1", "r2", "r3"]) {
    const observed = newCounts.get(id)! / rounds;
    expect(Math.abs(observed - oldCounts.get(id)! / rounds)).toBeLessThan(0.025);
    expect(Math.abs(observed - (id.startsWith("l") ? 0.625 : 0.4375))).toBeLessThan(0.025);
  }
});
