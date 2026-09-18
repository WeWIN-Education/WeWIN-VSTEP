import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { gradeAttempt } from "../src/lib/grading-service";

const LEASE_MINUTES = 15;
const MAX_ATTEMPTS = 3;

async function claimJob() {
  const now = new Date();
  const stale = new Date(now.getTime() - LEASE_MINUTES * 60_000);
  const candidate = await prisma.examGradingJob.findFirst({
    where: {
      OR: [
        { status: "QUEUED", availableAt: { lte: now } },
        { status: "PROCESSING", lockedAt: { lt: stale } },
      ],
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    select: { id: true, attemptId: true, status: true, attempts: true },
  });
  if (!candidate) return null;
  const claimed = await prisma.examGradingJob.updateMany({
    where: { id: candidate.id, status: candidate.status, ...(candidate.status === "PROCESSING" ? { lockedAt: { lt: stale } } : { availableAt: { lte: now } }) },
    data: { status: "PROCESSING", lockedAt: now, startedAt: now, attempts: { increment: 1 }, errorCode: null, errorMessage: null },
  });
  return claimed.count ? candidate : null;
}

async function processOne() {
  const job = await claimJob();
  if (!job) {
    console.log(JSON.stringify({ processed: false, reason: "NO_JOB" }));
    return false;
  }
  try {
    const result = await gradeAttempt(job.attemptId, { jobId: job.id });
    console.log(JSON.stringify({ processed: true, jobId: job.id, attemptId: job.attemptId, status: result.complete ? "GRADED" : "PARTIAL" }));
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể chấm.";
    const failed = await prisma.examGradingJob.findUnique({ where: { id: job.id }, select: { attempts: true } });
    if ((failed?.attempts ?? MAX_ATTEMPTS) < MAX_ATTEMPTS) {
      const delayMs = Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, (failed?.attempts ?? 1) - 1));
      await prisma.examGradingJob.update({ where: { id: job.id }, data: { status: "QUEUED", availableAt: new Date(Date.now() + delayMs), lockedAt: null, errorMessage: message } });
    }
    console.error(JSON.stringify({ processed: true, jobId: job.id, attemptId: job.attemptId, status: "FAILED", error: message }));
    process.exitCode = 1;
    return true;
  }
}

async function main() {
  if (!process.argv.includes("--loop")) {
    await processOne();
    return;
  }
  while (true) {
    process.exitCode = 0;
    const processed = await processOne();
    await new Promise((resolve) => setTimeout(resolve, processed ? 1000 : 5000));
  }
}

main().finally(async () => {
  await prisma.$disconnect();
});
