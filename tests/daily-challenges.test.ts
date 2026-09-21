import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";
import { dailyChallengeTasks, vietnamDay } from "../src/lib/daily-challenge-rules";

const mocks = vi.hoisted(() => ({ count: vi.fn(), groupBy: vi.fn(), find: vi.fn(), create: vi.fn(), update: vi.fn(), transaction: vi.fn(), actor: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/access", () => ({ getCurrentUser: mocks.actor }));
vi.mock("@/lib/prisma", () => ({ prisma: {
  vocabularyProgress: { count: mocks.count }, xpAward: { groupBy: mocks.groupBy },
  dailyChallengeReward: { findUnique: mocks.find }, $transaction: mocks.transaction,
} }));
import { claimDailyChallenge, getDailyChallenges } from "../src/lib/daily-challenges";
import { GET, POST } from "../src/app/api/daily-challenges/route";

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-21T10:00:00Z"));
  mocks.actor.mockResolvedValue({ id: "user-a" }); mocks.count.mockResolvedValue(30);
  mocks.groupBy.mockResolvedValue([]); mocks.find.mockResolvedValue(null);
  mocks.transaction.mockImplementation(async fn => fn({ vocabularyProgress: { count: mocks.count }, xpAward: { groupBy: mocks.groupBy }, dailyChallengeReward: { findUnique: mocks.find, create: mocks.create }, user: { update: mocks.update } }));
});
afterEach(() => { vi.useRealTimers(); });
it("resets at midnight Vietnam including month/year boundaries", () => {
  expect(vietnamDay(new Date("2026-12-31T16:59:59Z")).key).toBe("2026-12-31");
  const day = vietnamDay(new Date("2026-12-31T17:00:00Z"));
  expect(day.key).toBe("2027-01-01"); expect(day.end.toISOString()).toBe("2027-01-01T17:00:00.000Z");
});
it("rotates daily goals and caps progress", () => {
  const goals = ["2026-09-20", "2026-09-21", "2026-09-22", "2026-09-23", "2026-09-24", "2026-09-25", "2026-09-26"].map(day => dailyChallengeTasks(0, 0, day).map(task => task.goal));
  expect(goals.map(([words]) => words)).toEqual([30, 10, 15, 20, 15, 20, 25]);
  expect(goals.map(([, xp]) => xp)).toEqual([100, 50, 50, 75, 50, 75, 100]);
  expect(dailyChallengeTasks(99, 200, "2026-09-21", ["FULL"]).map(task => task.value)).toEqual([10, 50, 1]);
  expect(dailyChallengeTasks(-1, 0, "2026-09-21").map(task => task.value)).toEqual([0, 0, 0]);
  expect(dailyChallengeTasks(0, 0, "2026-09-22", ["LISTENING"]).at(-1)?.title).toBe("Nộp 1 bài Listening");
  expect(dailyChallengeTasks(0, 0, "2026-09-26", ["LISTENING", "READING"]).at(-1)?.value).toBe(2);
});
it("bounds progress and reads exam awards by catalog", async () => {
  mocks.groupBy.mockResolvedValue([{ catalog: "FULL", _sum: { amount: 150 } }]);
  const state = await getDailyChallenges("user-a");
  expect(state.claimed).toBe(false);
  expect(mocks.count).toHaveBeenCalledWith({ where: { userId: "user-a", lastReviewedAt: { gte: new Date("2026-09-20T17:00:00Z"), lt: new Date("2026-09-21T17:00:00Z") } } });
  expect(mocks.groupBy).toHaveBeenCalledWith({ by: ["catalog"], where: { userId: "user-a", createdAt: { gte: new Date("2026-09-20T17:00:00Z"), lt: new Date("2026-09-21T17:00:00Z") } }, _sum: { amount: true } });
  expect(state.tasks.map(task => task.value)).toEqual([10, 50, 1]);
});
it("requires every task and rejects yesterday's claim", async () => {
  mocks.count.mockResolvedValue(29);
  expect((await claimDailyChallenge("user-a", "2026-09-21")).status).toBe(409);
  expect((await claimDailyChallenge("user-a", "2026-09-20")).status).toBe(409);
  expect(mocks.create).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
});
it("awards 180 XP once in the same serializable transaction as the claim", async () => {
  mocks.groupBy.mockResolvedValue([{ catalog: "FULL", _sum: { amount: 150 } }]);
  expect((await claimDailyChallenge("user-a", "2026-09-21")).state?.claimed).toBe(true);
  expect(mocks.create.mock.calls[0][0].data).toEqual({ userId: "user-a", day: new Date("2026-09-21T00:00:00Z"), amount: 180 });
  expect(mocks.update).toHaveBeenCalledWith({ where: { id: "user-a" }, data: { xp: { increment: 180 } } });
  expect(mocks.transaction.mock.calls[0][1].isolationLevel).toBe("Serializable");
  mocks.find.mockResolvedValue({ amount: 180 });
  expect((await claimDailyChallenge("user-a", "2026-09-21")).state?.claimed).toBe(true);
  expect(mocks.update).toHaveBeenCalledTimes(1);
});
it("retries conflicting concurrent claims then returns the already claimed reward", async () => {
  mocks.transaction.mockRejectedValueOnce(new Prisma.PrismaClientKnownRequestError("conflict", { code: "P2034", clientVersion: "6" }));
  mocks.find.mockResolvedValue({ amount: 180 });
  expect((await claimDailyChallenge("user-a", "2026-09-21")).status).toBe(200);
  expect(mocks.transaction).toHaveBeenCalledTimes(2); expect(mocks.update).not.toHaveBeenCalled();
});
it("protects API access, origin, and private state", async () => {
  const request = (origin = "https://example.com", body = '{"day":"2026-09-21","userId":"other-user"}') => new Request("https://example.com/api/daily-challenges", { method: "POST", headers: { origin }, body });
  mocks.actor.mockResolvedValue(null);
  expect((await GET()).status).toBe(401); expect((await POST(request())).status).toBe(401);
  mocks.actor.mockResolvedValue({ id: "user-a" });
  expect((await POST(request("https://other.com"))).status).toBe(403);
  expect((await POST(request("https://example.com", "null"))).status).toBe(400);
  mocks.groupBy.mockResolvedValue([{ catalog: "FULL", _sum: { amount: 150 } }]);
  const response = await POST(request()); expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mocks.update.mock.calls[0][0].where.userId).toBeUndefined();
  expect(mocks.update.mock.calls[0][0].where.id).toBe("user-a");
});
