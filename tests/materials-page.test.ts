import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ findMany: vi.fn(), groupBy: vi.fn(), actor: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { learningMaterial: mock } }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mock.actor }));
import { getMaterialsPage } from "../src/lib/materials-page";
import { GET } from "../src/app/api/manage/materials/list/route";
beforeEach(() => { vi.clearAllMocks(); mock.groupBy.mockResolvedValue([{ skill: "READING", published: true, _count: { _all: 125 } }]); });
it.each([0, 8, 20, 21])("bounds page of %i and reports full totals", async n => {
  mock.findMany.mockResolvedValue(Array.from({ length: n }, (_, i) => ({ id: `m${i}`, createdAt: new Date("2026-09-21Z") })));
  const page = await getMaterialsPage(false);
  expect(page.items.length).toBe(Math.min(n, 20)); expect(Boolean(page.nextCursor)).toBe(n > 20);
  expect(page.total).toBe(125);
  expect(mock.findMany.mock.calls[0][0]).toMatchObject({ take: 21, where: { AND: [{ published: true, programme: "VSTEP" }] }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] });
});
it("keeps search in counts and cursor queries, resets changed filters", async () => {
  mock.findMany.mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ id: `m${i}`, createdAt: new Date("2026-09-21Z") })));
  const first = await getMaterialsPage(true, { q: "document", skill: "READING" });
  await getMaterialsPage(true, { q: "document", skill: "READING", cursor: first.nextCursor! });
  expect(mock.findMany.mock.lastCall![0].where.AND).toHaveLength(2);
  expect(mock.groupBy.mock.lastCall![0].where).toEqual(mock.findMany.mock.lastCall![0].where.AND[0]);
  await getMaterialsPage(true, { q: "new", cursor: first.nextCursor! });
  expect(mock.findMany.mock.lastCall![0].where.AND).toHaveLength(1);
});
it.each([null, { id: "A", role: "LEARNER" }])("denies unauthorized list API", async actor => {
  mock.actor.mockResolvedValue(actor);
  const response = await GET(new Request("http://localhost/api/manage/materials/list"));
  expect(response.status).toBe(actor ? 403 : 401); expect(mock.findMany).not.toHaveBeenCalled();
});
it("admin API uses fresh reads and private no-store", async () => {
  mock.actor.mockResolvedValue({ id: "A", role: "ADMIN" }); mock.findMany.mockResolvedValue([]);
  const response = await GET(new Request("http://localhost/api/manage/materials/list"));
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("walks 125 equal-timestamp documents, survives deletion and refreshes publication", async () => {
  let data = Array.from({ length: 125 }, (_, i) => ({ id: `m${String(124 - i).padStart(3, "0")}`, createdAt: new Date("2026-09-21Z"), published: true }));
  mock.findMany.mockImplementation(async ({ where, take }) => {
    const bound = where.AND[1]?.OR[1]?.id.lt;
    return data.filter(r => (!bound || r.id < bound) && (!where.AND[0].published || r.published)).slice(0, take);
  });
  const ids: string[] = []; let cursor: string | undefined;
  do { const page = await getMaterialsPage(false, { cursor }); ids.push(...page.items.map(i => i.id)); cursor = page.nextCursor ?? undefined; expect(ids.length).toBeLessThanOrEqual(125); } while(cursor);
  expect(new Set(ids).size).toBe(125);
  const first = await getMaterialsPage(false);
  data = data.filter(r => r.id !== first.items.at(-1)!.id);
  expect((await getMaterialsPage(false, { cursor: first.nextCursor! })).items[0].id).toBe("m104");
  data[0].published = false;
  expect((await getMaterialsPage(false)).items[0].id).toBe("m123");
});
