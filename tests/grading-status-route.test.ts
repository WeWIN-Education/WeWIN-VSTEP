import { beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ findFirst: vi.fn(), readStatus: vi.fn(), owner: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { examAttempt: { findFirst: mocks.findFirst } } }));
vi.mock("@/lib/exam-attempt-access", () => ({ getAttemptOwner: mocks.owner, ownerWhere: () => ({ userId: "owner" }) }));
vi.mock("@/lib/guest-exams", () => ({ consumeGuestRateLimit: vi.fn(), guestRateLimitResponse: vi.fn() }));
vi.mock("@/lib/exam-scoring", () => ({ resolveCatalogExamData: () => null }));
vi.mock("@/lib/grading-jobs", () => ({ readGradingStatus: mocks.readStatus, ensureGradingJob: vi.fn() }));

import { GET, POST } from "../src/app/api/exams/attempts/[attemptId]/grade/route";

beforeEach(() => { vi.resetAllMocks(); mocks.owner.mockResolvedValue({ kind: "user", userId: "owner" }); });

it.each([GET, POST])("keeps authorization failures private for %s", async handler => {
  for (const owner of [null, { kind: "invalid" }, { kind: "user", userId: "owner" }]) {
    mocks.owner.mockResolvedValue(owner);
    mocks.findFirst.mockResolvedValue(null);
    const response = await handler(new Request("http://localhost/api/exams/attempts/attempt/grade"), { params: Promise.resolve({ attemptId: "attempt" }) });
    expect(response.status).toBe(owner?.kind === "user" ? 404 : 401);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.readStatus).not.toHaveBeenCalled();
  }
});

it("refreshes attempt results when the worker finishes between attempt and job reads", async () => {
  const base = { id: "attempt", examPaper: { slug: "test" }, paperPart: null };
  const finalGrading = { complete: true, writingScore: 8, writing: [{ task_score: 8 }] };
  mocks.findFirst.mockResolvedValueOnce({ ...base, grading: {} }).mockResolvedValueOnce({ ...base, grading: finalGrading });
  mocks.readStatus.mockImplementation(async ({ grading }) => ({ status: "GRADED", grading }));
  const response = await GET(new Request("http://localhost/api/exams/attempts/attempt/grade"), { params: Promise.resolve({ attemptId: "attempt" }) });
  expect((await response.json()).grading).toEqual(finalGrading);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(mocks.findFirst).toHaveBeenCalledTimes(2);
  expect(mocks.findFirst.mock.calls[1][0].where.userId).toBe("owner");
});

it("does not add a second attempt read while the job is still processing", async () => {
  mocks.findFirst.mockResolvedValue({ id: "attempt", grading: {}, examPaper: { slug: "test" }, paperPart: null });
  mocks.readStatus.mockResolvedValue({ status: "PROCESSING", grading: {} });
  const response = await GET(new Request("http://localhost/api/exams/attempts/attempt/grade"), { params: Promise.resolve({ attemptId: "attempt" }) });
  expect((await response.json()).status).toBe("PROCESSING");
  expect(mocks.findFirst).toHaveBeenCalledTimes(1);
});
