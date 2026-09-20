import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({ transaction: vi.fn(), findVisitUser: vi.fn(), createMany: vi.fn(), update: vi.fn(), findUser: vi.fn(), attempts: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({ prisma: { $transaction: mocks.transaction, user: { findUnique: mocks.findUser }, examAttempt: { findMany: mocks.attempts } } }));
import { getGamificationSummary } from "../src/lib/gamification";

const conflict = (code: string) => new Prisma.PrismaClientKnownRequestError("test conflict", { code, clientVersion: "6" });
beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-09-20T03:00:00Z"));
  mocks.transaction.mockImplementation(async fn => fn({ user: { findUnique: mocks.findVisitUser, update: mocks.update }, dailyActivity: { createMany: mocks.createMany } }));
  mocks.findVisitUser.mockResolvedValue({ streakDays: 4, lastActiveDate: new Date("2026-09-19T00:00:00Z") });
  mocks.findUser.mockResolvedValue({ vstepTarget: "B1", xp: 10, heartsReceived: 0, streakDays: 5 });
  mocks.attempts.mockResolvedValue([]);
});
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it("uses conflict-safe insertion and advances yesterday's streak once", async () => {
  const result = await getGamificationSummary("learner");
  expect(mocks.createMany).toHaveBeenCalledWith({ data: [{ userId: "learner", activityDate: new Date("2026-09-20T00:00:00Z") }], skipDuplicates: true });
  expect(mocks.update).toHaveBeenCalledWith({ where: { id: "learner" }, data: { streakDays: 5, lastActiveDate: new Date("2026-09-20T00:00:00Z") } });
  expect(result.streakDays).toBe(5);
});
it("does not write again for an already recorded day", async () => {
  mocks.findVisitUser.mockResolvedValue({ streakDays: 5, lastActiveDate: new Date("2026-09-20T00:00:00Z") });
  await getGamificationSummary("learner");
  expect(mocks.createMany).not.toHaveBeenCalled(); expect(mocks.update).not.toHaveBeenCalled();
});
it.each(["P2002", "P2034"])("retries the whole transaction for %s and reads the winning visit", async code => {
  mocks.transaction.mockRejectedValueOnce(conflict(code));
  mocks.findVisitUser.mockResolvedValue({ streakDays: 5, lastActiveDate: new Date("2026-09-20T00:00:00Z") });
  const result = getGamificationSummary("learner"); await vi.runAllTimersAsync(); await result;
  expect(mocks.transaction).toHaveBeenCalledTimes(2); expect(mocks.update).not.toHaveBeenCalled();
});
it("renders saved statistics after bounded conflict retries instead of crashing", async () => {
  const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.transaction.mockRejectedValue(conflict("P2034"));
  const result = getGamificationSummary("learner"); await vi.runAllTimersAsync();
  expect((await result).xp).toBe(10); expect(mocks.transaction).toHaveBeenCalledTimes(3);
  expect(warning).toHaveBeenCalledWith("Daily visit update deferred", { code: "P2034" });
});
it("keeps separate account queries when switching users", async () => {
  await getGamificationSummary("first"); await getGamificationSummary("second");
  expect(mocks.findUser.mock.calls.map(([query]) => query.where.id)).toEqual(["first", "second"]);
});
it("resets a broken streak and uses the Vietnam date after UTC midnight boundary", async () => {
  vi.setSystemTime(new Date("2026-09-19T18:00:00Z"));
  mocks.findVisitUser.mockResolvedValue({ streakDays: 4, lastActiveDate: new Date("2026-09-17T00:00:00Z") });
  await getGamificationSummary("learner");
  expect(mocks.update.mock.calls[0][0].data).toEqual({ streakDays: 1, lastActiveDate: new Date("2026-09-20T00:00:00Z") });
});
