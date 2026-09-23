import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ user: vi.fn(), command: vi.fn(), count: vi.fn(), history: vi.fn(), profile: vi.fn(), questions: vi.fn(), import: vi.fn() }));
vi.mock("@/lib/access", () => ({ getCurrentUser: mock.user }));
vi.mock("@/lib/battle-engine", () => ({ battleCommand: mock.command, BattleError: class extends Error { constructor(message: string, public status = 409) { super(message); } } }));
vi.mock("@/lib/prisma", () => ({ prisma: { battlePlayer: { count: mock.count, findMany: mock.history }, user: { findUnique: mock.profile }, battleQuestion: { findMany: mock.questions, createMany: mock.import } } }));
import { POST, GET } from "../src/app/api/battle/route";
import { POST as adminPOST, GET as adminGET } from "../src/app/api/manage/battle/route";
const req = (body: unknown, origin = "http://localhost") => new Request("http://localhost/api/battle", { method: "POST", headers: { origin }, body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mock.user.mockResolvedValue({ id: "learner", sessionVersion: 1, role: "LEARNER" }); mock.command.mockResolvedValue({ kind: "idle", xp: 0 }); });
it("rejects guests, cross-origin mutations and malformed answers before engine access", async () => {
  expect((await POST(req({ action: "join" }, "https://other.example"))).status).toBe(403);
  mock.user.mockResolvedValueOnce(null); expect((await POST(req({ action: "join" }))).status).toBe(401);
  for (const body of [null, {}, { action: "answer", choice: 0, turn: 0 }, { action: "answer", matchId: "m", choice: 4, turn: 0 }, { action: "answer", matchId: "m", choice: 0, turn: 30 }, { action: "state", heartbeat: "yes" }]) expect((await POST(req(body))).status).toBe(400);
  expect(mock.command).not.toHaveBeenCalled();
});
it("returns private non-cacheable state and only accepts validated payload", async () => {
  const response = await POST(req({ action: "state" }));
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(response.headers.get("vary")).toBe("Cookie");
});
it("history always scopes to current user and applies bounded database pagination", async () => {
  mock.count.mockResolvedValue(22); mock.history.mockResolvedValue([]); mock.profile.mockResolvedValue({ xp: 10 });
  const response = await GET(new Request("http://localhost/api/battle?page=2&userId=other"));
  expect(response.status).toBe(200);
  expect(mock.history).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: "learner", match: { status: { not: "ACTIVE" } } }, skip: 10, take: 10 }));
});
it("learners cannot read, create, import, edit or delete admin questions", async () => {
  expect((await adminGET(new Request("http://localhost/api/manage/battle"))).status).toBe(403);
  for (const action of ["import", "delete", "save"]) expect((await adminPOST(req({ action, id: "q" }))).status).toBe(403);
  expect(mock.questions).not.toHaveBeenCalled(); expect(mock.import).not.toHaveBeenCalled();
});
it("starter import skips existing source keys and admin validation rejects ambiguous choices", async () => {
  mock.user.mockResolvedValue({ id: "admin", role: "ADMIN" }); mock.import.mockResolvedValue({ count: 150 });
  expect((await adminPOST(req({ action: "import" }))).status).toBe(200);
  expect(mock.import).toHaveBeenCalledWith(expect.objectContaining({ skipDuplicates: true, data: expect.any(Array) }));
  expect(mock.import.mock.calls[0][0].data).toHaveLength(150);
  expect((await adminPOST(req({ prompt: "a" }))).status).toBe(400);
});
