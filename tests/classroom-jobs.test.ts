import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "node:crypto";
vi.mock("server-only", () => ({}));
vi.mock("@/lib/classroom/zoom", () => ({ syncMeeting: vi.fn() }));
vi.mock("@/lib/classroom/events", () => ({ processEvents: vi.fn() }));
import { syncMeeting } from "@/lib/classroom/zoom";
import { runClassroomJob } from "@/lib/classroom/jobs";
const enabled = process.env.CLASSROOM_DATABASE_QA === "1";
const db = new PrismaClient(),
  entityId = `qa-jobs-${randomUUID()}`;
beforeAll(() => {
  if (
    enabled &&
    !process.env.DATABASE_URL?.includes("localhost:5434/wewin_classroom_test")
  )
    throw new Error("Refusing job QA outside isolated database.");
});
afterAll(async () => {
  if (enabled) await db.classroomJob.deleteMany({ where: { entityId } });
  await db.$disconnect();
});
it.skipIf(!enabled)(
  "claims one meeting job across simultaneous web/worker calls, retries failures and recovers expired leases",
  async () => {
    const target = { kind: "ZOOM_SYNC" as const, entityId };
    const create = (key: string, data = {}) =>
      db.classroomJob.create({
        data: {
          key: `${entityId}:${key}`,
          kind: target.kind,
          entityId,
          // Avoid depending on millisecond clock differences between Node and PostgreSQL.
          availableAt: new Date(0),
          ...data,
        },
      });
    // Two queued revisions must not create two provider requests at once.
    const first = await create("first"),
      second = await create("second");
    let release!: () => void;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    vi.mocked(syncMeeting).mockImplementationOnce(async () => {
      started();
      await pending;
    });
    const running = runClassroomJob(target);
    await ready;
    expect(await runClassroomJob(target)).toBe(false);
    release();
    await running;
    expect(syncMeeting).toHaveBeenCalledTimes(1);
    vi.mocked(syncMeeting).mockRejectedValueOnce(
      new Error("Temporary provider failure"),
    );
    await runClassroomJob(target);
    const failed = await db.classroomJob.findUniqueOrThrow({
      where: { id: second.id },
    });
    expect(failed).toMatchObject({
      status: "QUEUED",
      attempts: 1,
      leaseToken: null,
      error: "Temporary provider failure",
    });
    expect(+failed.availableAt).toBeGreaterThan(Date.now());
    expect(await runClassroomJob(target)).toBe(false);
    await db.classroomJob.update({
      where: { id: second.id },
      data: {
        status: "RUNNING",
        leaseToken: "expired",
        leaseExpiresAt: new Date(0),
      },
    });
    await runClassroomJob(target);
    expect(
      await db.classroomJob.findUniqueOrThrow({ where: { id: second.id } }),
    ).toMatchObject({
      status: "DONE",
      attempts: 2,
      leaseToken: null,
      error: null,
    });
    expect(
      await db.classroomJob.findUniqueOrThrow({ where: { id: first.id } }),
    ).toMatchObject({ status: "DONE" });
    // Web jobs cannot claim a file scan or another meeting's job.
    await create("file", { kind: "FILE_SCAN" });
    expect(await runClassroomJob(target)).toBe(false);
    await create("final-attempt", { attempts: 4 });
    vi.mocked(syncMeeting).mockRejectedValueOnce(new Error("Unavailable"));
    await runClassroomJob(target);
    expect(
      await db.classroomJob.findUniqueOrThrow({
        where: { key: `${entityId}:final-attempt` },
      }),
    ).toMatchObject({
      status: "FAILED",
      attempts: 5,
    });
  },
);
