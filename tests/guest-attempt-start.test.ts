import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), existing: vi.fn(), count: vi.fn(), createUse: vi.fn(), updateUse: vi.fn(), createAttempt: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/access", () => ({ getAuthState: mocks.auth }));
vi.mock("@/lib/guest-exams", () => ({ consumeGuestRateLimit: async () => ({ allowed: true }), ensureGuestSession: async () => ({ id: "guest" }), guestRateLimitResponse: () => ({}) }));
vi.mock("@/lib/exam-server", () => ({ getExamPaperForAccess: async () => ({ id: "paper", durationMin: 179 }) }));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction } }));
import { POST } from "../src/app/api/exams/attempts/route";

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ kind: "anonymous" });
  mocks.count.mockResolvedValue(2);
  mocks.createAttempt.mockImplementation(async ({ data }) => ({ id: "fresh", expiresAt: data.expiresAt }));
  mocks.transaction.mockImplementation(async run => run({
    guestAttemptUse: { findUnique: mocks.existing, count: mocks.count, create: mocks.createUse, update: mocks.updateUse },
    examAttempt: { create: mocks.createAttempt },
  }));
});
const start = () => POST(new Request("http://localhost/api/exams/attempts", { method: "POST", body: JSON.stringify({ program: "vstep", slug: "paper", catalog: "FULL" }) }));
const expired = { id: "old", expiresAt: new Date(0), status: "SUBMITTED", answers: {}, recordings: {} };
it("replaces an empty submitted trial within its existing quota slot", async () => {
  mocks.existing.mockResolvedValue({ id: "use", attempt: expired });
  const response = await start();
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.id).toBe("fresh");
  expect(Date.parse(body.expiresAt)).toBeGreaterThan(Date.now());
  expect(mocks.createUse).not.toHaveBeenCalled();
  expect(mocks.updateUse).toHaveBeenCalledWith({ where: { id: "use" }, data: { attemptId: "fresh" } });
});
it("resumes a live trial without resetting the clock or creating another attempt", async () => {
  mocks.existing.mockResolvedValue({ id: "use", attempt: { ...expired, status: "IN_PROGRESS", expiresAt: new Date(Date.now() + 60_000) } });
  expect((await (await start()).json()).id).toBe("old");
  expect(mocks.createAttempt).not.toHaveBeenCalled();
});
it("keeps submitted answers and does not silently open results from a new-start link", async () => {
  mocks.existing.mockResolvedValue({ id: "use", attempt: { ...expired, answers: { answers: { q1: "A" } } } });
  const response = await start();
  expect(response.status).toBe(409);
  expect((await response.json()).code).toBe("GUEST_ATTEMPT_FINISHED");
  expect(mocks.createAttempt).not.toHaveBeenCalled();
});
it("does not grant a third different paper", async () => {
  mocks.existing.mockResolvedValue(null);
  expect((await start()).status).toBe(403);
  expect(mocks.createAttempt).not.toHaveBeenCalled();
});
