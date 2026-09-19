import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function main() {
  const attemptId = process.argv[2];
  const [workers, queue] = await Promise.all([
    prisma.gradingWorker.count({ where: { lastSeenAt: { gt: new Date(Date.now() - 60_000) } } }),
    prisma.examGradingJob.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  console.log(JSON.stringify({ activeWorkers: workers, queue: queue.map(row => ({ status: row.status, count: row._count._all })) }));
  if (attemptId) {
    const job = await prisma.examGradingJob.findUnique({ where: { attemptId }, select: { status: true, attempts: true, pipelineVersion: true, startedAt: true, finishedAt: true, errorCode: true } });
    const parts = await prisma.examGradingPart.findMany({ where: { attemptId }, select: { partId: true, status: true, pipelineVersion: true, errorCode: true, updatedAt: true } });
    console.log(JSON.stringify({ job, parts }));
  }
  if (!workers) process.exitCode = 1;
}

main().catch(() => { console.error("Cannot read grading health. Check DATABASE_URL and migrations."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
