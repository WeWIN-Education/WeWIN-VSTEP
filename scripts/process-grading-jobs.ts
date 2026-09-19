import "dotenv/config";

import { prisma } from "../src/lib/prisma";
import { gradeAttempt } from "../src/lib/grading-service";
import {
  LostGradingLeaseError,
  checkWorkerHealth,
  claimNextJob,
  completeClaimedJob,
  configuredMaxConcurrentJobs,
  failClaimedJob,
  runWorkerBatch,
  startJobLeaseHeartbeat,
  startWorkerHeartbeat,
  touchWorker,
  type ClaimedGradingJob,
} from "../src/lib/grading-jobs";

const LOOP_DELAY_MS = 1_000;
const IDLE_DELAY_MS = 5_000;

function resultComplete(value: unknown) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).complete === true);
}

function safeErrorCode(error: unknown) {
  const value = error && typeof error === "object" && typeof (error as Record<string, unknown>).code === "string"
    ? String((error as Record<string, unknown>).code).toUpperCase()
    : "WORKER_ERROR";
  return /^[A-Z][A-Z0-9_]{0,63}$/.test(value) ? value : "WORKER_ERROR";
}

const leaseAwareGradeAttempt = gradeAttempt as unknown as (
  attemptId: string,
  options: { jobId: string; leaseToken: string; pipelineVersion: string },
) => Promise<unknown>;

async function processClaimedJob(job: ClaimedGradingJob) {
  const lease = startJobLeaseHeartbeat(job);
  try {
    const result = await leaseAwareGradeAttempt(job.attemptId, {
      jobId: job.id,
      leaseToken: job.leaseToken,
      pipelineVersion: job.pipelineVersion,
    });
    if (lease.isLost()) throw lease.lastError() ?? new LostGradingLeaseError();
    await completeClaimedJob(job, resultComplete(result) ? "GRADED" : "PARTIAL");
    console.log(JSON.stringify({ processed: true, jobId: job.id, attemptId: job.attemptId, status: resultComplete(result) ? "GRADED" : "PARTIAL", pipelineVersion: job.pipelineVersion }));
  } catch (error) {
    // A reclaimed lease means another worker owns the job. Do not retry or
    // settle it here, because either operation could overwrite the new owner.
    if (lease.isLost() || error instanceof LostGradingLeaseError || (error && typeof error === "object" && (error as Record<string, unknown>).code === "LEASE_LOST")) {
      console.error(JSON.stringify({ processed: false, jobId: job.id, attemptId: job.attemptId, status: "LEASE_LOST" }));
      return;
    }
    try {
      const failure = await failClaimedJob(job, error);
      // `failure.code` is already the sanitized code returned by failClaimedJob.
      // Wrap it so the log does not collapse every failure into WORKER_ERROR.
      console.error(JSON.stringify({ processed: true, jobId: job.id, attemptId: job.attemptId, status: failure.retry ? "RETRY_QUEUED" : "FAILED", errorCode: safeErrorCode({ code: failure.code }) }));
    } catch (settleError) {
      if (settleError instanceof LostGradingLeaseError) {
        console.error(JSON.stringify({ processed: false, jobId: job.id, attemptId: job.attemptId, status: "LEASE_LOST" }));
        return;
      }
      console.error(JSON.stringify({ processed: false, jobId: job.id, attemptId: job.attemptId, status: "SETTLE_FAILED", errorCode: safeErrorCode(settleError) }));
    }
  } finally {
    lease.stop();
  }
}

async function runOnce() {
  return runWorkerBatch({
    claim: () => claimNextJob(),
    process: processClaimedJob,
    maxConcurrent: configuredMaxConcurrentJobs(),
  });
}

async function delay(milliseconds: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}

async function main() {
  const health = await checkWorkerHealth();
  console.log(JSON.stringify({ worker: "grading", health }));
  if (!health.ok) {
    process.exitCode = 1;
    return;
  }

  try {
    await touchWorker();
  } catch (error) {
    console.error(JSON.stringify({ worker: "grading", status: "WORKER_HEARTBEAT_FAILED", errorCode: safeErrorCode(error) }));
    process.exitCode = 1;
    return;
  }

  const heartbeat = startWorkerHeartbeat();
  try {
    if (!process.argv.includes("--loop")) {
      await runOnce();
      return;
    }
    while (true) {
      const processed = await runOnce();
      await delay(processed ? LOOP_DELAY_MS : IDLE_DELAY_MS);
    }
  } finally {
    heartbeat.stop();
  }
}

main()
  .catch((error) => {
    process.exitCode = 1;
    console.error(JSON.stringify({ worker: "grading", status: "FATAL", errorCode: safeErrorCode(error) }));
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
