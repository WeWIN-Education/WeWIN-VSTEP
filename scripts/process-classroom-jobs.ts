import { randomUUID } from "node:crypto";
import { prisma as db } from "../src/lib/prisma";

// The server-only marker is disabled by the react-server export condition in the worker script.
import { runClassroomJob } from "../src/lib/classroom/jobs";
import { clearExpiredAttention } from "../src/lib/classroom/attention";
import { clearEndedPresentations } from "../src/lib/classroom/presentation";
import { queueMissingPreviews } from "../src/lib/classroom/file-preview";
import { scannerHealth } from "../src/lib/classroom/files";
const workerId = process.env.CLASSROOM_WORKER_ID || `classroom-${randomUUID()}`;
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
    await clearEndedPresentations();
    await queueMissingPreviews();
    const scannerOk = await scannerHealth();
    await db.classroomWorker.upsert({
      where: { id: workerId },
      create: { id: workerId, scannerOk, scannerCheckedAt: new Date() },
      update: { scannerOk, scannerCheckedAt: new Date() },
    });
    lastAttentionCleanup = Date.now();
  }
  await db.classroomWorker.upsert({
    where: { id: workerId },
    create: { id: workerId },
    update: { lastSeenAt: new Date() },
  });
  return runClassroomJob();
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
