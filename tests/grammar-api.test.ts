import { beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/access", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/grammar", () => ({ getGrammarExercise: vi.fn(), submitGrammar: vi.fn(), previewGrammar: vi.fn(), importGrammar: vi.fn(), transitionGrammar: vi.fn() }));
import { getCurrentUser } from "../src/lib/access";
import { submitGrammar, previewGrammar, transitionGrammar } from "../src/lib/grammar";
import { POST, GET } from "../src/app/api/grammar/route";
import { POST as managePost, GET as manageGet } from "../src/app/api/manage/grammar/route";

const actor = { id: "user", role: "LEARNER", email: "user@example.invalid", name: null, isActive: true, sessionVersion: 0 } as const;
const body = { submissionId: "11111111-1111-4111-8111-111111111111", lessonId: "lesson", version: "version", setId: "set", mode: "TEST", answers: { q: "answer" }, userId: "another-user", score: 100 };
const request = (value: unknown, origin = "http://localhost:3005") => new Request("http://localhost:3005/api/grammar", { method: "POST", headers: { origin, "Content-Type": "application/json" }, body: JSON.stringify(value) });
beforeEach(() => { vi.clearAllMocks(); vi.mocked(getCurrentUser).mockResolvedValue({ ...actor }); });
it("requires a live session and rejects cross-origin writes", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  expect((await POST(request(body))).status).toBe(401);
  expect((await GET(new Request("http://localhost:3005/api/grammar?lessonId=a&setId=b"))).status).toBe(401);
  expect((await POST(request(body, "https://other.example"))).status).toBe(403);
  expect(submitGrammar).not.toHaveBeenCalled();
});
it("derives the submitting user from auth and keeps replies private", async () => {
  vi.mocked(submitGrammar).mockResolvedValue({ correct: 0, total: 1, passed: false, details: [] });
  const response = await POST(request(body));
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toContain("no-store");
  expect(submitGrammar).toHaveBeenCalledWith(actor.id, expect.anything());
});
it("rejects malformed and oversized submissions and reports save failures", async () => {
  expect((await POST(request({ ...body, answers: [] }))).status).toBe(400);
  expect((await POST(request({ ...body, answers: { q: "a".repeat(33000) } }))).status).toBe(413);
  vi.mocked(submitGrammar).mockRejectedValue(new Error("private db detail"));
  const response = await POST(request(body));
  expect(response.status).toBe(503); expect(await response.text()).not.toContain("private db detail");
});
it("does not grant admin import or review to teachers and learners", async () => {
  expect((await managePost(request({ action: "import", content: {} }))).status).toBe(403);
  vi.mocked(getCurrentUser).mockResolvedValue({ ...actor, role: "TEACHER" });
  expect((await manageGet(new Request("http://localhost:3005/api/manage/grammar?pilot=danh-tu"))).status).toBe(403);
  expect(transitionGrammar).not.toHaveBeenCalled();
});
it("requires an explicit review confirmation and routes preview away from saved progress", async () => {
  vi.mocked(getCurrentUser).mockResolvedValue({ ...actor, role: "ADMIN" });
  expect((await managePost(request({ action: "review", id: "lesson" }))).status).toBe(400);
  vi.mocked(previewGrammar).mockResolvedValue({ correct: 0, total: 1, passed: false, details: [] });
  await POST(request({ ...body, preview: true }));
  expect(previewGrammar).toHaveBeenCalled(); expect(submitGrammar).not.toHaveBeenCalled();
});
it("only serves selected full-library content to admins and reports unknown topics", async () => {
  const url = "http://localhost:3005/api/manage/grammar?topic=lien-tu";
  expect((await manageGet(new Request(url))).status).toBe(403);
  vi.mocked(getCurrentUser).mockResolvedValue(null);
  expect((await manageGet(new Request(url))).status).toBe(403);
  vi.mocked(getCurrentUser).mockResolvedValue({ ...actor, role: "ADMIN" });
  const response = await manageGet(new Request(url));
  const topic = await response.json();
  expect(topic.number).toBe(40); expect(topic.sets).toHaveLength(2);
  expect(response.headers.get("cache-control")).toContain("no-store");
  expect((await manageGet(new Request("http://localhost:3005/api/manage/grammar?topic=unknown"))).status).toBe(404);
});
