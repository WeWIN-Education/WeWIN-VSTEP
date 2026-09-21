import { beforeEach, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { contentTemplate, parseContentFile } from "../src/lib/learning-content";
const mocks = vi.hoisted(() => ({ actor: vi.fn(), findMany: vi.fn(), create: vi.fn(), createMany: vi.fn(), updateMany: vi.fn(), deleteMany: vi.fn() }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mocks.actor }));
vi.mock("@/lib/prisma", () => ({ prisma: { learningContent: mocks } }));
import { GET, POST, PUT, DELETE } from "../src/app/api/manage/learning-content/route";
const url = "https://example.com/api/manage/learning-content?kind=SKILL";
const request = (method: string, body?: unknown, origin = "https://example.com") => new Request(url, { method, headers: { origin }, ...(body ? { body: JSON.stringify(body) } : {}) });
beforeEach(() => { vi.resetAllMocks(); mocks.actor.mockResolvedValue({ role: "ADMIN" }); });
it("denies guests and learners for every operation", async () => {
  for (const [actor, status] of [[null, 401], [{ role: "LEARNER" }, 403]] as const) {
    mocks.actor.mockResolvedValue(actor);
    for (const [method, handler] of [["GET", GET], ["POST", POST], ["PUT", PUT], ["DELETE", DELETE]] as const) expect((await handler(request(method))).status).toBe(status);
  }
  expect(mocks.findMany).not.toHaveBeenCalled(); expect(mocks.deleteMany).not.toHaveBeenCalled();
});
it("rejects cross-origin mutations", async () => {
  expect((await POST(request("POST", {}, "https://other.example"))).status).toBe(403);
});
it("previews without writing, then imports hidden entries atomically", async () => {
  const data = { kind: "SKILL", source: contentTemplate("SKILL") };
  expect((await POST(request("POST", { ...data, action: "preview" }))).status).toBe(200);
  expect(mocks.createMany).not.toHaveBeenCalled();
  mocks.createMany.mockResolvedValue({ count: 1 });
  expect((await POST(request("POST", { ...data, action: "import" }))).status).toBe(201);
  expect(mocks.createMany).toHaveBeenCalledWith({ data: [expect.objectContaining({ published: false, code: "R_LESSON_001" })] });
});
it("rejects duplicate imports without overwriting existing content", async () => {
  mocks.createMany.mockRejectedValue(new Prisma.PrismaClientKnownRequestError("duplicate", { code: "P2002", clientVersion: "6" }));
  expect((await POST(request("POST", { action: "import", kind: "SKILL", source: contentTemplate("SKILL") }))).status).toBe(409);
  expect(mocks.updateMany).not.toHaveBeenCalled();
});
it("checks optimistic versions for edits and permanent deletion", async () => {
  const input = { ...parseContentFile(contentTemplate("SKILL"), "SKILL")[0], id: "lesson", updatedAt: "2026-09-21T00:00:00.000Z" };
  mocks.updateMany.mockResolvedValue({ count: 0 });
  expect((await PUT(request("PUT", input))).status).toBe(409);
  mocks.updateMany.mockResolvedValue({ count: 1 });
  expect((await PUT(request("PUT", input))).status).toBe(200);
  mocks.deleteMany.mockResolvedValue({ count: 1 });
  expect((await DELETE(request("DELETE", input))).status).toBe(200);
  expect(mocks.deleteMany).toHaveBeenCalledWith({ where: { id: "lesson", kind: "SKILL", updatedAt: new Date(input.updatedAt) } });
});
it("returns bounded uncached pages and a stable cursor", async () => {
  mocks.findMany.mockResolvedValue(Array.from({ length: 21 }, (_, i) => ({ id: `id${i}` })));
  const response = await GET(request("GET"));
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  const data = await response.json();
  expect(data.items).toHaveLength(20); expect(data.nextCursor).toBe("id19"); expect(data.hasMore).toBe(true);
});
