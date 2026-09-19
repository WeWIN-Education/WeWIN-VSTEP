import { describe, expect, it, vi } from "vitest";

import {
  JOB_LEASE_MS,
  MAX_GRADING_ATTEMPTS,
  checkWorkerHealth,
  configuredMaxConcurrentJobs,
  configuredPipelineVersion,
  LostGradingLeaseError,
  buildGradingProgress,
  claimNextJob,
  completeClaimedJob,
  failClaimedJob,
  publicGrading,
  runWorkerBatch,
  type ClaimedGradingJob,
  type GradingJobsDatabase,
} from "../src/lib/grading-jobs";

function job(overrides: Partial<ClaimedGradingJob> = {}): ClaimedGradingJob {
  const now = new Date("2026-09-19T00:00:00.000Z");
  return {
    id: "job-1",
    attemptId: "attempt-1",
    status: "PROCESSING",
    attempts: 1,
    availableAt: now,
    lockedAt: now,
    startedAt: now,
    finishedAt: null,
    errorCode: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
    leaseToken: "lease-1",
    leaseExpiresAt: new Date(now.getTime() + JOB_LEASE_MS),
    pipelineVersion: "v2",
    ...overrides,
  };
}

type MockDelegate = {
  findFirst: ReturnType<typeof vi.fn>;
  findUnique: ReturnType<typeof vi.fn>;
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  updateMany: ReturnType<typeof vi.fn>;
  upsert: ReturnType<typeof vi.fn>;
};

type MockDatabase = GradingJobsDatabase & {
  examGradingJob: MockDelegate;
  examGradingPart: MockDelegate;
  gradingWorker: MockDelegate;
};

function db(overrides: Partial<GradingJobsDatabase> = {}): MockDatabase {
  return {
    examGradingJob: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    examGradingPart: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    gradingWorker: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    ...overrides,
  } as unknown as MockDatabase;
}

describe("grading job leases", () => {
  it("atomically allows one claimant when two workers race", async () => {
    const queued = {
      id: "job-1",
      attemptId: "attempt-1",
      status: "QUEUED",
      attempts: 0,
      availableAt: new Date("2026-09-19T00:00:00.000Z"),
      lockedAt: null,
      startedAt: null,
      finishedAt: null,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date("2026-09-18T23:00:00.000Z"),
      updatedAt: new Date("2026-09-18T23:00:00.000Z"),
      leaseToken: null,
      leaseExpiresAt: null,
      pipelineVersion: "v2",
    };
    let claimed = false;
    const jobs = db();
    jobs.examGradingJob.findFirst.mockResolvedValue(queued);
    jobs.examGradingJob.updateMany.mockImplementation(async () => {
      if (claimed) return { count: 0 };
      claimed = true;
      return { count: 1 };
    });

    const now = new Date("2026-09-19T00:00:00.000Z");
    const [first, second] = await Promise.all([
      claimNextJob({ db: jobs, now }),
      claimNextJob({ db: jobs, now }),
    ]);

    expect([first, second].filter(Boolean)).toHaveLength(1);
    expect(first?.leaseToken || second?.leaseToken).toEqual(expect.any(String));
    expect(jobs.examGradingJob.updateMany).toHaveBeenCalledTimes(2);
  });

  it("upgrades an untouched queued v1 job during worker claim", async () => {
    const queued = {
      id: "legacy-job",
      attemptId: "legacy-attempt",
      status: "QUEUED",
      attempts: 0,
      availableAt: new Date("2026-09-19T00:00:00.000Z"),
      lockedAt: null,
      startedAt: null,
      finishedAt: null,
      errorCode: null,
      errorMessage: null,
      createdAt: new Date("2026-09-18T23:00:00.000Z"),
      updatedAt: new Date("2026-09-18T23:00:00.000Z"),
      leaseToken: null,
      leaseExpiresAt: null,
      pipelineVersion: "v1",
    };
    const jobs = db();
    jobs.examGradingJob.findFirst.mockResolvedValue(queued);
    jobs.examGradingJob.updateMany.mockResolvedValue({ count: 1 });
    vi.stubEnv("GRADING_PIPELINE", "v2");

    try {
      const claimed = await claimNextJob({ db: jobs, now: new Date("2026-09-19T00:00:00.000Z") });
      expect(claimed?.pipelineVersion).toBe("v2");
      expect(jobs.examGradingJob.updateMany.mock.calls[0][0]).toEqual(expect.objectContaining({
        data: expect.objectContaining({ pipelineVersion: "v2" }),
      }));
      expect(jobs.examGradingJob.updateMany).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("uses v1 for rollback configuration without changing the default", () => {
    expect(configuredPipelineVersion({ GRADING_PIPELINE: "v1" })).toBe("v1");
    expect(configuredPipelineVersion({ GRADING_PIPELINE: "unexpected" })).toBe("v2");
  });

  it("fences terminal writes after the lease is lost", async () => {
    const jobs = db();
    jobs.examGradingJob.updateMany.mockResolvedValue({ count: 0 });

    await expect(completeClaimedJob(job(), "GRADED", { db: jobs })).rejects.toBeInstanceOf(LostGradingLeaseError);
    expect(jobs.examGradingJob.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ leaseToken: "lease-1", status: "PROCESSING" }),
    }));
  });

  it("does not multiply exhausted engine retries at the worker level", async () => {
    const jobs = db();
    jobs.examGradingJob.updateMany.mockResolvedValue({ count: 1 });

    await failClaimedJob(job(), { code: "TIMEOUT", retryable: true, attemptsExhausted: true }, { db: jobs });

    const call = jobs.examGradingJob.updateMany.mock.calls[0][0] as { data: { status: string } };
    expect(call.data.status).toBe("FAILED");
    expect(MAX_GRADING_ATTEMPTS).toBe(3);
  });

  it("retries a transient recording availability failure", async () => {
    const jobs = db();
    jobs.examGradingJob.updateMany.mockResolvedValue({ count: 1 });

    const result = await failClaimedJob(job(), { code: "RECORDING_UNAVAILABLE", retryable: true }, { db: jobs });

    expect(result.retry).toBe(true);
    expect(jobs.examGradingJob.updateMany.mock.calls[0][0]).toEqual(expect.objectContaining({
      data: expect.objectContaining({ status: "QUEUED", errorCode: "RECORDING_UNAVAILABLE" }),
    }));
  });

  it("requeues typed transient failures with backoff while attempts remain", async () => {
    const jobs = db();
    jobs.examGradingJob.updateMany.mockResolvedValue({ count: 1 });

    const result = await failClaimedJob(job({ attempts: 2 }), { code: "RATE_LIMITED", retryable: true, retryAfterSeconds: 45 }, { db: jobs });

    const call = jobs.examGradingJob.updateMany.mock.calls[0][0] as { data: { status: string; availableAt: Date } };
    expect(result.retry).toBe(true);
    expect(call.data.status).toBe("QUEUED");
    expect(call.data.availableAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("learner grading output", () => {
  it("removes pipelines, checkpoints, and internal reports recursively", () => {
    const result = publicGrading({
      writing: [{ id: "task-1", task_score: 6, feedback: "Tốt", pipelines: { raw: true }, checkpoint: { state: "x" }, reviewerReport: { private: true } }],
      pipelines: { task: { secret: true } },
      speakingSummary: { score: 5, model: "private-model", comment: "Giữ nhịp nói." },
    });

    expect(result).toEqual({
      writing: [{ id: "task-1", task_score: 6, feedback: "Tốt" }],
      speakingSummary: { score: 5, comment: "Giữ nhịp nói." },
    });
  });

  it("drops objects beyond the sanitizer depth limit", () => {
    let nested: Record<string, unknown> = { secret: "hidden" };
    for (let index = 0; index < 14; index += 1) nested = { nested };

    const result = publicGrading({ nested });
    expect(JSON.stringify(result)).not.toContain("hidden");
  });

  it("reports completed and in-flight parts with learner-safe statuses", () => {
    const progress = buildGradingProgress(
      job(),
      [
        { partId: "writing-task-1", pipelineVersion: "v2", status: "GRADED", updatedAt: new Date() },
        { partId: "speaking-part-1", pipelineVersion: "v2", status: "REVIEWING", updatedAt: new Date() },
      ],
      [
        { id: "writing-task-1", skill: "WRITING" },
        { id: "speaking-part-1", skill: "SPEAKING" },
      ],
      false,
    );

    expect(progress).toEqual({
      completed: 1,
      total: 2,
      parts: [
        { id: "writing-task-1", skill: "WRITING", status: "GRADED" },
        { id: "speaking-part-1", skill: "SPEAKING", status: "REVIEWING" },
      ],
    });
  });

  it("does not count failed or missing parts as completed results", () => {
    const progress = buildGradingProgress(
      job(),
      [
        { partId: "writing-task-1", pipelineVersion: "v2", status: "FAILED", updatedAt: new Date() },
        { partId: "speaking-part-1", pipelineVersion: "v2", status: "MISSING", updatedAt: new Date() },
      ],
      [
        { id: "writing-task-1", skill: "WRITING" },
        { id: "speaking-part-1", skill: "SPEAKING" },
      ],
      false,
    );

    expect(progress.completed).toBe(0);
    expect(progress.parts.map((part) => part.status)).toEqual(["FAILED", "MISSING"]);
  });
});

describe("worker concurrency", () => {
  it("bounds configured concurrency and defaults to two", () => {
    expect(configuredMaxConcurrentJobs({})).toBe(2);
    expect(configuredMaxConcurrentJobs({ GRADING_MAX_CONCURRENT_JOBS: "0" })).toBe(1);
    expect(configuredMaxConcurrentJobs({ GRADING_MAX_CONCURRENT_JOBS: "99" })).toBe(8);
  });

  it("runs at most two claimed jobs concurrently", async () => {
    const jobs = [job({ id: "job-1" }), job({ id: "job-2" })];
    let active = 0;
    let maximum = 0;
    const processed: string[] = [];
    const result = await runWorkerBatch({
      maxConcurrent: 2,
      claim: async () => jobs.shift() ?? null,
      process: async (item) => {
        active += 1;
        maximum = Math.max(maximum, active);
        await new Promise((resolve) => setTimeout(resolve, 5));
        processed.push(item.id);
        active -= 1;
      },
    });

    expect(result).toBe(2);
    expect(maximum).toBe(2);
    expect(processed).toEqual(["job-1", "job-2"]);
  });
});

describe("worker startup health", () => {
  it("probes Blob access with a read-only metadata listing", async () => {
    const blobProbe = vi.fn().mockResolvedValue({ blobs: [], hasMore: false });
    const health = await checkWorkerHealth({
      env: { NODE_ENV: "production", DATABASE_URL: "db", OPENAI_API_KEY: "key", BLOB_READ_WRITE_TOKEN: "token" },
      ffmpegPath: "ffmpeg",
      blobProbe,
    });

    expect(blobProbe).toHaveBeenCalledTimes(1);
    expect(health.storage).toEqual({ ok: true, provider: "blob" });
    expect(health.ok).toBe(true);
  });

  it("fails startup when the Blob metadata probe cannot authenticate", async () => {
    const health = await checkWorkerHealth({
      env: { NODE_ENV: "production", DATABASE_URL: "db", OPENAI_API_KEY: "key", BLOB_READ_WRITE_TOKEN: "token" },
      ffmpegPath: "ffmpeg",
      blobProbe: async () => { throw new Error("secret connection detail"); },
    });

    expect(health.storage).toEqual({ ok: false, provider: "blob" });
    expect(health.ok).toBe(false);
  });
});
