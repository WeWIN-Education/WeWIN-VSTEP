import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";

// The server-only marker is disabled by the react-server export condition in the worker script.
import { scanFile } from "../src/lib/classroom/files";
import { syncMeeting } from "../src/lib/classroom/zoom";
import { processEvents } from "../src/lib/classroom/events";
import { clearExpiredAttention } from "../src/lib/classroom/attention";
const db = new PrismaClient(),
  workerId = process.env.CLASSROOM_WORKER_ID || `classroom-${randomUUID()}`;
let stop = false,
  lastAttentionCleanup = 0;
process.on("SIGINT", () => {
  stop = true;
});
process.on("SIGTERM", () => {
  stop = true;
});
async function tick() {
  if (Date.now() - lastAttentionCleanup >= 60000) {
    await clearExpiredAttention();
    lastAttentionCleanup = Date.now();
  }
  await db.classroomWorker.upsert({
    where: { id: workerId },
    create: { id: workerId },
    update: { lastSeenAt: new Date() },
  });
  const token = randomUUID(),
    now = new Date();
  const row = await db.$transaction(async (tx) => {
    const jobs = await tx.$queryRaw<
      { id: string }[]
    >`SELECT "id" FROM "ClassroomJob" WHERE ("status" = 'QUEUED' AND "availableAt" <= ${now}) OR ("status" = 'RUNNING' AND "leaseExpiresAt" < ${now}) ORDER BY "availableAt" LIMIT 1 FOR UPDATE SKIP LOCKED`;
    if (!jobs.length) return null;
    return tx.classroomJob.update({
      where: { id: jobs[0].id },
      data: {
        status: "RUNNING",
        attempts: { increment: 1 },
        leaseToken: token,
        leaseExpiresAt: new Date(Date.now() + 120000),
      },
    });
  });
  if (!row) return false;
  const heartbeat = setInterval(() => {
    void db.classroomJob
      .updateMany({
        where: { id: row.id, leaseToken: token, status: "RUNNING" },
        data: { leaseExpiresAt: new Date(Date.now() + 120000) },
      })
      .catch(() => undefined);
  }, 20000);
  try {
    if (row.kind === "FILE_SCAN") await scanFile(row.entityId);
    else if (row.kind === "ZOOM_SYNC") await syncMeeting(row.entityId);
    else if (row.kind === "ZOOM_EVENT") await processEvents(row.entityId);
    else throw new Error("Loại tác vụ không hợp lệ.");
    await db.classroomJob.updateMany({
      where: { id: row.id, leaseToken: token },
      data: {
        status: "DONE",
        finishedAt: new Date(),
        error: null,
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Tác vụ thất bại";
    await db.classroomJob.updateMany({
      where: { id: row.id, leaseToken: token },
      data: {
        status: row.attempts >= 5 ? "FAILED" : "QUEUED",
        availableAt: new Date(
          Date.now() + Math.min(600000, 5000 * 2 ** row.attempts),
        ),
        error: message.slice(0, 500),
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
  } finally {
    clearInterval(heartbeat);
  }
  return true;
}
async function main() {
  if (process.env.CLASSROOM_ENABLED !== "true")
    throw new Error("CLASSROOM_ENABLED chưa bật cho worker.");
  do {
    const work = await tick();
    if (!process.argv.includes("--loop")) break;
    if (!work) await new Promise((resolve) => setTimeout(resolve, 2000));
  } while (!stop);
}
main()
  .catch(() => {
    console.error(
      "Classroom worker stopped. Check database/configuration; no credentials logged.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
