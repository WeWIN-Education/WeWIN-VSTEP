import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ entry: { findMany: vi.fn(), findFirst: vi.fn() }, saved: { findMany: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() }, personal: { findMany: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() }, user: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { vocabularyEntry: mocks.entry, vocabularyProgress: mocks.saved, personalVocabulary: mocks.personal } }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mocks.user }));
import { getVocabularyPage, notebookCounts } from "../src/lib/vocabulary-page";
import { GET } from "../src/app/api/vocabulary/entries/route";

type Data = Record<string, unknown>;
function matches(row: Data, where: Data): boolean {
  return Object.entries(where).every(([key, value]) => {
    if (key === "AND") return (value as Data[]).every(w => matches(row, w));
    if (key === "OR") return (value as Data[]).some(w => matches(row, w));
    if (value && typeof value === "object" && !(value instanceof Date)) {
      const v = value as Data; const actual = row[key] as string;
      if ("in" in v) return (v.in as unknown[]).includes(actual);
      if ("contains" in v) return String(actual ?? "").toLowerCase().includes(String(v.contains).toLowerCase());
      if ("lt" in v) return actual < (v.lt as string);
      if ("gt" in v) return actual > (v.gt as string);
      if ("lte" in v) return actual <= (v.lte as string);
      if ("gte" in v) return actual >= (v.gte as string);
      return matches((row[key] ?? {}) as Data, v);
    }
    return value instanceof Date ? +(row[key] as Date) === +value : row[key] === value;
  });
}
function reader(data: Data[]) {
  return async ({ where, orderBy, take }: { where: Data; orderBy: Data[]; take: number }) => data.filter(row => matches(row, where)).sort((a, b) => {
    for (const order of orderBy) {
      const [key, direction] = Object.entries(order)[0];
      const x = a[key] as string, y = b[key] as string;
      const compare = x < y ? -1 : x > y ? 1 : 0;
      if (compare) return direction === "desc" ? -compare : compare;
    } return 0;
  }).slice(0, take);
}
const entries = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `e${String(i).padStart(4, "0")}`, entryCode: String(Math.floor(i / 2)).padStart(4, "0"), term: "term", meaningVi: "meaning", exampleEn: "example", ipa: null, exampleVi: null, audioUrl: null, partOfSpeech: null, collection: { id: "C", kind: "VOCABULARY" }, progress: [] }));
beforeEach(() => { vi.clearAllMocks(); mocks.entry.findFirst.mockResolvedValue(null); mocks.saved.findFirst.mockResolvedValue(null); mocks.personal.findFirst.mockResolvedValue(null); mocks.saved.findMany.mockResolvedValue([]); mocks.personal.findMany.mockResolvedValue([]); });

it.each([0, 5, 30, 31])("returns %i entries with correct lookahead", async n => {
  mocks.entry.findMany.mockImplementation(reader(entries(n)));
  const page = await getVocabularyPage("A", { mode: "collection", collection: "C" });
  expect(page.items.length).toBe(Math.min(30, n)); expect(Boolean(page.nextCursor)).toBe(n > 30);
});
it("walks 603 entries with ties without duplicates and restores previous page", async () => {
  mocks.entry.findMany.mockImplementation(reader(entries(603)));
  let cursor: string | undefined; const ids: string[] = [];
  do {
    const page = await getVocabularyPage("A", { mode: "collection", collection: "C" }, cursor);
    ids.push(...page.items.map(i => i.id)); cursor = page.nextCursor ?? undefined;
    expect(ids.length).toBeLessThanOrEqual(603);
  } while (cursor);
  expect(ids).toEqual(entries(603).map(i => i.id));
  const first = await getVocabularyPage("A", { mode: "collection", collection: "C" });
  const second = await getVocabularyPage("A", { mode: "collection", collection: "C" }, first.nextCursor!);
  expect((await getVocabularyPage("A", { mode: "collection", collection: "C" }, second.previousCursor!, "prev")).items).toEqual(first.items);
  const last = await getVocabularyPage("A", { mode: "collection", collection: "C" }, undefined, "last");
  expect(last.items.at(-1)?.id).toBe("e0602"); expect(last.nextCursor).toBeNull(); expect(last.previousCursor).toBeTruthy();
});
it("isolates filters/collections/users and searches beyond the initial batch", async () => {
  const data = entries(600); data[599].term = "unique"; mocks.entry.findMany.mockImplementation(reader(data));
  const first = await getVocabularyPage("A", { mode: "collection", collection: "C" });
  const search = await getVocabularyPage("A", { mode: "collection", collection: "C", q: "unique" }, first.nextCursor!);
  expect(search.items.map(i => i.id)).toEqual(["e0599"]);
  expect((await getVocabularyPage("A", { mode: "collection", collection: "other" }, first.nextCursor!)).items).toEqual([]);
  await getVocabularyPage("B", { mode: "collection", collection: "C" }, first.nextCursor!);
  expect(mocks.entry.findMany.mock.lastCall![0].select.progress.where).toEqual({ userId: "B" });
  expect(mocks.entry.findMany.mock.lastCall![0].where.AND[1]).toEqual({});
});
it("preserves collocation ordering with identical terms/codes", async () => {
  const data = entries(90).map(row => ({ ...row, collection: { id: "C", kind: "COLLOCATION" } }));
  mocks.entry.findMany.mockImplementation(reader(data));
  const first = await getVocabularyPage("A", { mode: "collocations" });
  const second = await getVocabularyPage("A", { mode: "collocations" }, first.nextCursor!);
  expect(second.items[0].id).toBe("e0030");
  expect(mocks.entry.findMany.mock.lastCall![0].orderBy).toEqual([{ term: "asc" }, { entryCode: "asc" }, { id: "asc" }]);
});
it("preserves saved-then-personal notebook ordering across both streams", async () => {
  const shared = entries(105).map((entry, i) => ({ id: `s${String(i).padStart(3, "0")}`, userId: "A", entry, entryId: entry.id, status: "NEW", updatedAt: new Date("2026-09-21Z") }));
  const personal = entries(105).map((entry, i) => ({ ...entry, id: `p${String(i).padStart(3, "0")}`, userId: "A", status: "NEW", updatedAt: new Date("2026-09-21Z") }));
  mocks.saved.findMany.mockImplementation(reader(shared)); mocks.personal.findMany.mockImplementation(reader(personal));
  let cursor: string | undefined; const ids: string[] = [];
  do { const page = await getVocabularyPage("A", { mode: "notebook" }, cursor); ids.push(...page.items.map(i => i.id)); cursor = page.nextCursor ?? undefined; expect(ids.length).toBeLessThanOrEqual(210); } while(cursor);
  expect(ids).toEqual([...shared].reverse().map(r => r.entry.id).concat([...personal].reverse().map(r => r.id)));
  expect((await getVocabularyPage("B", { mode: "notebook" })).items).toEqual([]);
});
it("resumes using a fresh ID anchor, not a stale updatedAt", async () => {
  mocks.saved.findFirst.mockResolvedValue({ id: "saved", updatedAt: new Date("2026-09-22Z") });
  await getVocabularyPage("A", { mode: "notebook" }, undefined, "next", true, "entry");
  expect(mocks.saved.findFirst.mock.calls[0][0].where).toMatchObject({ userId: "A", entryId: "entry" });
  expect(mocks.saved.findMany.mock.calls[0][0].where.AND[1].OR[1]).toEqual({ updatedAt: new Date("2026-09-22Z"), id: { lte: "saved" } });
});
it("uses authorized full notebook counts including personal entries", async () => {
  mocks.saved.groupBy.mockResolvedValue([{ status: "NEW", _count: { _all: 110 } }]); mocks.personal.groupBy.mockResolvedValue([{ status: "MASTERED", _count: { _all: 3 } }]);
  expect(await notebookCounts("A")).toEqual({ ALL: 113, NEW: 110, LEARNING: 0, MASTERED: 3 });
  expect(mocks.personal.groupBy.mock.calls[0][0].where).toEqual({ userId: "A" });
});
it("denies guest requests without queries and keeps authenticated responses private", async () => {
  mocks.user.mockResolvedValue(null);
  expect((await GET(new Request("http://localhost/api/vocabulary/entries?mode=collocations"))).status).toBe(401);
  expect(mocks.entry.findMany).not.toHaveBeenCalled();
  mocks.user.mockResolvedValue({ id: "A" }); mocks.entry.findMany.mockResolvedValue([]);
  const response = await GET(new Request("http://localhost/api/vocabulary/entries?mode=collocations&userId=B"));
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(mocks.entry.findMany.mock.lastCall![0].select.progress.where.userId).toBe("A");
});

it("refreshes notebook counts without reading pages and ignores supplied user IDs", async () => {
  mocks.user.mockResolvedValue({ id: "A" });
  mocks.saved.groupBy.mockResolvedValue([{ status: "NEW", _count: { _all: 4 } }]);
  mocks.personal.groupBy.mockResolvedValue([{ status: "MASTERED", _count: { _all: 2 } }]);
  const request = () => new Request("http://localhost/api/vocabulary/entries?mode=notebook&countsOnly=1&userId=B");
  const response = await GET(request());
  expect(await response.json()).toEqual({ counts: { ALL: 6, NEW: 4, LEARNING: 0, MASTERED: 2 } });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  for (const model of [mocks.entry, mocks.saved, mocks.personal]) expect(model.findMany).not.toHaveBeenCalled();
  for (const model of [mocks.saved, mocks.personal]) {
    expect(model.groupBy).toHaveBeenCalledTimes(1);
    expect(model.groupBy.mock.lastCall![0].where).toEqual({ userId: "A" });
  }
  vi.clearAllMocks();
  mocks.user.mockResolvedValue(null);
  expect((await GET(request())).status).toBe(401);
  expect(mocks.saved.groupBy).not.toHaveBeenCalled();
  expect(mocks.personal.groupBy).not.toHaveBeenCalled();
});
