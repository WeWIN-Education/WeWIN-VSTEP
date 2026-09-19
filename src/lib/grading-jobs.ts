import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { access } from "node:fs/promises";
import os from "node:os";
import { list } from "@vercel/blob";

import { prisma } from "./prisma";

export const CURRENT_PIPELINE_VERSION = "v2";
export const LEGACY_PIPELINE_VERSION = "v1";
export const MAX_GRADING_ATTEMPTS = 3;
export const WORKER_HEARTBEAT_MS = 15_000;
export const WORKER_STALE_MS = 60_000;
export const JOB_LEASE_MS = 90_000;
export const DEFAULT_MAX_CONCURRENT_JOBS = 2;
export const MAX_ALLOWED_CONCURRENT_JOBS = 8;

export const GRADING_PART_STATUSES = ["QUEUED", "PROCESSING", "REVIEWING", "GRADED", "PARTIAL", "FAILED", "MISSING"] as const;
export type GradingPartStatus = (typeof GRADING_PART_STATUSES)[number];
export type GradingSkill = "WRITING" | "SPEAKING" | "UNKNOWN";
export type GradingJobStatus = GradingPartStatus | "NOT_STARTED";

export type GradingJobRecord = {
  id: string;
  attemptId: string;
  status: GradingJobStatus;
  attempts: number;
  availableAt: Date | null;
  lockedAt: Date | null;
  startedAt: Date | null;
  finishedAt: Date | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  leaseToken: string | null;
  leaseExpiresAt: Date | null;
  pipelineVersion: string;
};

export type ClaimedGradingJob = GradingJobRecord & {
  status: "PROCESSING";
  leaseToken: string;
  leaseExpiresAt: Date;
};

export type ExpectedGradingPart = {
  id: string;
  skill: Exclude<GradingSkill, "UNKNOWN">;
};

export type GradingProgressPart = {
  id: string;
  skill: GradingSkill;
  status: GradingPartStatus;
};

export type GradingProgress = {
  completed: number;
  total: number;
  parts: GradingProgressPart[];
};

export type PublicGradingStatus = {
  status: GradingJobStatus;
  grading: Record<string, unknown>;
  progress: GradingProgress;
  workerAvailable: boolean;
  retryable: boolean;
  updatedAt: string;
};

type QueryArgs = Record<string, unknown>;
type Delegate = {
  findFirst(args?: QueryArgs): Promise<unknown>;
  findUnique(args?: QueryArgs): Promise<unknown>;
  findMany(args?: QueryArgs): Promise<unknown>;
  create(args: QueryArgs): Promise<unknown>;
  update(args: QueryArgs): Promise<unknown>;
  updateMany(args: QueryArgs): Promise<{ count: number }>;
  upsert(args: QueryArgs): Promise<unknown>;
};

export type GradingJobsDatabase = {
  examGradingJob: Delegate;
  examGradingPart: Delegate;
  gradingWorker: Delegate;
};

export type GradingJobPartRecord = {
  partId: string;
  pipelineVersion: string;
  status: GradingPartStatus;
  updatedAt: Date | null;
};

const JOB_SELECT = {
  id: true,
  attemptId: true,
  status: true,
  attempts: true,
  availableAt: true,
  lockedAt: true,
  startedAt: true,
  finishedAt: true,
  errorCode: true,
  errorMessage: true,
  createdAt: true,
  updatedAt: true,
  leaseToken: true,
  leaseExpiresAt: true,
  pipelineVersion: true,
};

const PART_SELECT = {
  partId: true,
  pipelineVersion: true,
  status: true,
  updatedAt: true,
};

const INTERNAL_GRADING_KEYS = new Set([
  "pipeline",
  "pipelines",
  "pipelinestate",
  "checkpoint",
  "checkpoints",
  "prompt",
  "prompts",
  "internal",
  "internalreport",
  "internalreports",
  "examiner",
  "examiners",
  "adjudication",
  "adjudicator",
  "reviewerreport",
  "raw",
  "rawresponse",
  "request",
  "response",
  "messages",
  "model",
  "trace",
  "debug",
  "audiodata",
  "audiobase64",
]);

const TRANSIENT_ERROR_CODES = new Set([
  "AI_TRANSIENT",
  "CONNECTION_RESET",
  "ECONNRESET",
  "EAI_AGAIN",
  "GRADING_IN_PROGRESS",
  "NETWORK_ERROR",
  "OPENAI_429",
  "OPENAI_5XX",
  "RATE_LIMITED",
  "RECORDING_UNAVAILABLE",
  "RETRYABLE",
  "SERVICE_UNAVAILABLE",
  "STORAGE_UNAVAILABLE",
  "TIMEOUT",
  "TOO_MANY_REQUESTS",
  "TRANSIENT",
  "TRANSIENT_ERROR",
  "UPSTREAM_429",
  "UPSTREAM_5XX",
  "UPSTREAM_TIMEOUT",
]);

let defaultWorkerId: string | undefined;

type WorkerEnvironment = Record<string, string | undefined>;

export function configuredPipelineVersion(env: WorkerEnvironment = process.env) {
  return env.GRADING_PIPELINE?.trim() === LEGACY_PIPELINE_VERSION ? LEGACY_PIPELINE_VERSION : CURRENT_PIPELINE_VERSION;
}

export function configuredMaxConcurrentJobs(env: WorkerEnvironment = process.env) {
  const parsed = Number.parseInt(env.GRADING_MAX_CONCURRENT_JOBS ?? "", 10);
  if (!Number.isFinite(parsed)) return DEFAULT_MAX_CONCURRENT_JOBS;
  return Math.min(MAX_ALLOWED_CONCURRENT_JOBS, Math.max(1, parsed));
}

function database(client: unknown = prisma): GradingJobsDatabase {
  return client as GradingJobsDatabase;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function dateValue(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date;
  }
  return null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeJobStatus(value: unknown): GradingJobStatus {
  return typeof value === "string" && ([...GRADING_PART_STATUSES, "NOT_STARTED"] as string[]).includes(value)
    ? value as GradingJobStatus
    : "QUEUED";
}

function normalizePartStatus(value: unknown): GradingPartStatus {
  return typeof value === "string" && (GRADING_PART_STATUSES as readonly string[]).includes(value)
    ? value as GradingPartStatus
    : "QUEUED";
}

function normalizePipelineVersion(value: unknown, fallback = LEGACY_PIPELINE_VERSION) {
  return typeof value === "string" && value.trim() ? value : fallback;
}

function normalizeJob(value: unknown): GradingJobRecord | null {
  const item = record(value);
  const id = stringValue(item.id);
  const attemptId = stringValue(item.attemptId);
  if (!id || !attemptId) return null;
  return {
    id,
    attemptId,
    status: normalizeJobStatus(item.status),
    attempts: Math.max(0, Math.floor(numberValue(item.attempts))),
    availableAt: dateValue(item.availableAt),
    lockedAt: dateValue(item.lockedAt),
    startedAt: dateValue(item.startedAt),
    finishedAt: dateValue(item.finishedAt),
    errorCode: stringValue(item.errorCode),
    errorMessage: stringValue(item.errorMessage),
    createdAt: dateValue(item.createdAt),
    updatedAt: dateValue(item.updatedAt),
    leaseToken: stringValue(item.leaseToken),
    leaseExpiresAt: dateValue(item.leaseExpiresAt),
    pipelineVersion: normalizePipelineVersion(item.pipelineVersion),
  };
}

function normalizePart(value: unknown): GradingJobPartRecord | null {
  const item = record(value);
  const partId = stringValue(item.partId);
  if (!partId) return null;
  return {
    partId,
    pipelineVersion: normalizePipelineVersion(item.pipelineVersion),
    status: normalizePartStatus(item.status),
    updatedAt: dateValue(item.updatedAt),
  };
}

function normalizeDateForQuery(value: Date | undefined) {
  return value ?? new Date();
}

function isUniqueViolation(error: unknown) {
  return record(error).code === "P2002";
}

function errorRecord(error: unknown) {
  return error && typeof error === "object" ? error as Record<string, unknown> : {};
}

export function errorCode(error: unknown) {
  return stringValue(errorRecord(error).code) ?? "GRADING_FAILED";
}

export function errorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : stringValue(errorRecord(error).message);
  return (message || "Không thể chấm.").slice(0, 1000);
}

export function isTransientErrorCode(code: unknown) {
  return typeof code === "string" && TRANSIENT_ERROR_CODES.has(code.trim().toUpperCase());
}

export function isTransientGradingError(error: unknown) {
  const item = errorRecord(error);
  return item.transient === true || item.retryable === true || isTransientErrorCode(item.code);
}

export function isAttemptExhausted(error: unknown) {
  const item = errorRecord(error);
  const code = typeof item.code === "string" ? item.code.toUpperCase() : "";
  return item.attemptsExhausted === true
    || item.retryExhausted === true
    || item.retry_exhausted === true
    || code === "GRADING_RETRIES_EXHAUSTED"
    || code === "ENGINE_RETRIES_EXHAUSTED"
    || code === "RETRY_EXHAUSTED"
    || code === "MAX_RETRIES_EXCEEDED"
    || code.endsWith("_RETRIES_EXHAUSTED");
}

export function retryDelayMs(attempts: number, error?: unknown) {
  const item = errorRecord(error);
  const retryAfterMs = numberValue(item.retryAfterMs, 0);
  const retryAfterSeconds = numberValue(item.retryAfterSeconds, 0) * 1000;
  const exponential = Math.min(15 * 60_000, 30_000 * 2 ** Math.max(0, Math.floor(attempts) - 1));
  return Math.min(60 * 60_000, Math.max(exponential, retryAfterMs, retryAfterSeconds));
}

function leaseWhere(jobId: string, leaseToken: string, now: Date) {
  return { id: jobId, status: "PROCESSING", leaseToken, leaseExpiresAt: { gt: now } };
}

export class LostGradingLeaseError extends Error {
  code = "LEASE_LOST";

  constructor() {
    super("Grading job lease is no longer owned by this worker.");
    this.name = "LostGradingLeaseError";
  }
}

export async function readGradingJob(attemptId: string, options: { db?: GradingJobsDatabase } = {}) {
  const db = options.db ?? database();
  const value = await db.examGradingJob.findUnique({ where: { attemptId }, select: JOB_SELECT });
  return normalizeJob(value);
}

export async function ensureGradingJob(
  attemptId: string,
  options: { db?: GradingJobsDatabase; now?: Date; retryFailed?: boolean } = {},
) {
  const db = options.db ?? database();
  const now = normalizeDateForQuery(options.now);
  let job = await readGradingJob(attemptId, { db });

  if (!job) {
    try {
      const created = await db.examGradingJob.create({
        data: {
          attemptId,
          status: "QUEUED",
          availableAt: now,
          pipelineVersion: configuredPipelineVersion(),
        },
        select: JOB_SELECT,
      });
      job = normalizeJob(created);
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
      job = await readGradingJob(attemptId, { db });
    }
  }

  if (!job) throw new Error("Không thể tạo hàng đợi chấm điểm.");

  // A never-started legacy queue is safe to move to v2. Claimed, retried, and
  // completed v1 jobs remain pinned to their original pipeline.
  const targetPipelineVersion = configuredPipelineVersion();
  if (job.status === "QUEUED" && job.attempts === 0 && job.pipelineVersion === LEGACY_PIPELINE_VERSION && targetPipelineVersion !== LEGACY_PIPELINE_VERSION) {
    await db.examGradingJob.updateMany({
      where: { id: job.id, status: "QUEUED", attempts: 0, pipelineVersion: LEGACY_PIPELINE_VERSION },
      data: { pipelineVersion: targetPipelineVersion },
    });
    job = await readGradingJob(attemptId, { db });
    if (!job) throw new Error("Không thể đọc hàng đợi chấm điểm.");
  }

  if (options.retryFailed !== false && job.status === "FAILED" && job.attempts < MAX_GRADING_ATTEMPTS && isTransientErrorCode(job.errorCode)) {
    await db.examGradingJob.updateMany({
      where: { id: job.id, status: "FAILED", attempts: job.attempts, leaseToken: job.leaseToken },
      data: {
        status: "QUEUED",
        availableAt: now,
        lockedAt: null,
        leaseToken: null,
        leaseExpiresAt: null,
        finishedAt: null,
      },
    });
    job = await readGradingJob(attemptId, { db });
    if (!job) throw new Error("Không thể đọc hàng đợi chấm điểm.");
  }

  return job;
}

export async function claimNextJob(options: { db?: GradingJobsDatabase; now?: Date } = {}): Promise<ClaimedGradingJob | null> {
  const db = options.db ?? database();
  const now = normalizeDateForQuery(options.now);
  const staleBefore = new Date(now.getTime() - WORKER_STALE_MS);
  const candidateValue = await db.examGradingJob.findFirst({
    where: {
      OR: [
        { status: "QUEUED", availableAt: { lte: now } },
        {
          status: "PROCESSING",
          OR: [
            { leaseExpiresAt: { lte: now } },
            { leaseExpiresAt: null, lockedAt: { lt: staleBefore } },
          ],
        },
      ],
    },
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    select: JOB_SELECT,
  });
  const candidate = normalizeJob(candidateValue);
  if (!candidate || (candidate.status !== "QUEUED" && candidate.status !== "PROCESSING")) return null;

  const targetPipelineVersion = configuredPipelineVersion();
  const upgradeLegacy = candidate.status === "QUEUED"
    && candidate.attempts === 0
    && candidate.pipelineVersion === LEGACY_PIPELINE_VERSION
    && targetPipelineVersion !== LEGACY_PIPELINE_VERSION;

  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + JOB_LEASE_MS);
  const claimWhere = candidate.status === "QUEUED"
    ? {
        id: candidate.id,
        status: "QUEUED",
        availableAt: { lte: now },
        pipelineVersion: upgradeLegacy ? LEGACY_PIPELINE_VERSION : candidate.pipelineVersion,
      }
    : {
        id: candidate.id,
        status: "PROCESSING",
        pipelineVersion: candidate.pipelineVersion,
        OR: [
          { leaseExpiresAt: { lte: now } },
          { leaseExpiresAt: null, lockedAt: { lt: staleBefore } },
        ],
      };
  const claimed = await db.examGradingJob.updateMany({
    where: claimWhere,
    data: {
      status: "PROCESSING",
      ...(upgradeLegacy ? { pipelineVersion: targetPipelineVersion } : {}),
      leaseToken,
      leaseExpiresAt,
      lockedAt: now,
      startedAt: candidate.startedAt ?? now,
      finishedAt: null,
      attempts: { increment: 1 },
      errorCode: null,
      errorMessage: null,
    },
  });
  if (!claimed.count) return null;

  return {
    ...candidate,
    pipelineVersion: upgradeLegacy ? targetPipelineVersion : candidate.pipelineVersion,
    status: "PROCESSING",
    attempts: candidate.attempts + 1,
    leaseToken,
    leaseExpiresAt,
    lockedAt: now,
    startedAt: candidate.startedAt ?? now,
    finishedAt: null,
    errorCode: null,
    errorMessage: null,
  };
}

export async function renewJobLease(jobId: string, leaseToken: string, options: { db?: GradingJobsDatabase; now?: Date } = {}) {
  const db = options.db ?? database();
  const now = normalizeDateForQuery(options.now);
  const result = await db.examGradingJob.updateMany({
    where: leaseWhere(jobId, leaseToken, now),
    data: { leaseExpiresAt: new Date(now.getTime() + JOB_LEASE_MS), lockedAt: now },
  });
  return result.count > 0;
}

export async function completeClaimedJob(
  job: Pick<ClaimedGradingJob, "id" | "leaseToken">,
  status: "GRADED" | "PARTIAL",
  options: { db?: GradingJobsDatabase; now?: Date } = {},
) {
  const db = options.db ?? database();
  const now = normalizeDateForQuery(options.now);
  const result = await db.examGradingJob.updateMany({
    where: leaseWhere(job.id, job.leaseToken, now),
    data: {
      status,
      finishedAt: now,
      lockedAt: null,
      leaseToken: null,
      leaseExpiresAt: null,
      errorCode: null,
      errorMessage: null,
    },
  });
  if (!result.count) throw new LostGradingLeaseError();
}

export async function failClaimedJob(
  job: Pick<ClaimedGradingJob, "id" | "attempts" | "leaseToken">,
  error: unknown,
  options: { db?: GradingJobsDatabase; now?: Date } = {},
) {
  const db = options.db ?? database();
  const now = normalizeDateForQuery(options.now);
  const transient = isTransientGradingError(error);
  const causeCode = errorCode(error);
  // The grading engine already retries individual network calls. An exhausted
  // engine error must become terminal here instead of multiplying retries at
  // the job level (3 engine attempts x 3 worker attempts).
  const retry = transient && !isAttemptExhausted(error) && job.attempts < MAX_GRADING_ATTEMPTS;
  // Keep exhausted engine retries terminal. Mapping them to a non-transient
  // code prevents POST from silently requeueing an already exhausted step.
  const code = isAttemptExhausted(error) ? "GRADING_RETRIES_EXHAUSTED" : causeCode;
  const message = errorMessage(error);
  const data = retry
    ? {
        status: "QUEUED",
        availableAt: new Date(now.getTime() + retryDelayMs(job.attempts, error)),
        finishedAt: null,
        lockedAt: null,
        leaseToken: null,
        leaseExpiresAt: null,
        errorCode: code,
        errorMessage: message,
      }
    : {
        status: "FAILED",
        finishedAt: now,
        lockedAt: null,
        leaseToken: null,
        leaseExpiresAt: null,
        errorCode: code,
        errorMessage: message,
      };
  const result = await db.examGradingJob.updateMany({
    where: leaseWhere(job.id, job.leaseToken, now),
    data,
  });
  if (!result.count) throw new LostGradingLeaseError();
  return { retry, code, message, causeCode };
}

export function workerId() {
  if (defaultWorkerId) return defaultWorkerId;
  const configured = process.env.GRADING_WORKER_ID?.trim();
  defaultWorkerId = configured || `${os.hostname()}-${process.pid}-${randomUUID().slice(0, 8)}`;
  return defaultWorkerId;
}

export async function touchWorker(options: { db?: GradingJobsDatabase; id?: string; now?: Date } = {}) {
  const db = options.db ?? database();
  const id = options.id ?? workerId();
  const now = normalizeDateForQuery(options.now);
  await db.gradingWorker.upsert({
    where: { id },
    create: { id, lastSeenAt: now },
    update: { lastSeenAt: now },
  });
  return id;
}

export function startWorkerHeartbeat(options: { db?: GradingJobsDatabase; id?: string; intervalMs?: number } = {}) {
  const db = options.db ?? database();
  const id = options.id ?? workerId();
  const intervalMs = options.intervalMs ?? WORKER_HEARTBEAT_MS;
  let stopped = false;
  let lastError: unknown;
  const pulse = async () => {
    if (stopped) return;
    try {
      await touchWorker({ db, id });
      lastError = undefined;
    } catch (error) {
      lastError = error;
    }
  };
  void pulse();
  const timer = setInterval(() => void pulse(), intervalMs);
  timer.unref?.();
  return {
    id,
    stop() {
      stopped = true;
      clearInterval(timer);
    },
    lastError() {
      return lastError;
    },
  };
}

export function startJobLeaseHeartbeat(
  job: Pick<ClaimedGradingJob, "id" | "leaseToken">,
  options: { db?: GradingJobsDatabase; intervalMs?: number } = {},
) {
  const db = options.db ?? database();
  const intervalMs = options.intervalMs ?? WORKER_HEARTBEAT_MS;
  let stopped = false;
  let lost = false;
  let lastError: unknown;
  let inFlight: Promise<void> | null = null;
  const pulse = async () => {
    if (stopped || lost || inFlight) return;
    inFlight = (async () => {
      try {
        if (!await renewJobLease(job.id, job.leaseToken, { db })) {
          lost = true;
          lastError = new LostGradingLeaseError();
        }
      } catch (error) {
        lost = true;
        lastError = error;
      } finally {
        inFlight = null;
      }
    })();
    await inFlight;
  };
  const timer = setInterval(() => void pulse(), intervalMs);
  timer.unref?.();
  return {
    pulse,
    isLost() {
      return lost;
    },
    lastError() {
      return lastError;
    },
    stop() {
      stopped = true;
      clearInterval(timer);
    },
  };
}

export async function workerAvailable(options: { db?: GradingJobsDatabase; now?: Date } = {}) {
  const db = options.db ?? database();
  const now = normalizeDateForQuery(options.now);
  try {
    const worker = await db.gradingWorker.findFirst({
      where: { lastSeenAt: { gte: new Date(now.getTime() - WORKER_STALE_MS) } },
      select: { id: true },
    });
    return Boolean(worker);
  } catch {
    return false;
  }
}

function internalKey(key: string) {
  const normalized = key.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  return INTERNAL_GRADING_KEYS.has(normalized)
    || normalized.includes("pipeline")
    || normalized.includes("checkpoint")
    || normalized.includes("prompt")
    || normalized.includes("adjudicat")
    || normalized.includes("examiner")
    || normalized.includes("rawresponse")
    || (normalized.includes("audio") && normalized.includes("base64"))
    || normalized.startsWith("internal")
    || normalized.startsWith("debug");
}

function sanitizeGrading(value: unknown, depth = 0): unknown {
  if (depth > 12) return undefined;
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.slice(0, 100).map((item) => sanitizeGrading(item, depth + 1));
  if (typeof value !== "object") return undefined;
  const output: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (internalKey(key)) continue;
    const safe = sanitizeGrading(child, depth + 1);
    if (safe !== undefined) output[key] = safe;
  }
  return output;
}

export function publicGrading(value: unknown): Record<string, unknown> {
  const sanitized = sanitizeGrading(value);
  return record(sanitized);
}

export function inferGradingSkill(partId: string): GradingSkill {
  const normalized = partId.toLowerCase();
  if (normalized.includes("writing") || normalized.includes("task")) return "WRITING";
  if (normalized.includes("speaking") || normalized.includes("part")) return "SPEAKING";
  return "UNKNOWN";
}

function fallbackPartStatus(job: GradingJobRecord | null, gradingComplete: boolean) {
  if (gradingComplete) return "GRADED" as const;
  if (!job) return "QUEUED" as const;
  if (job.status === "FAILED") return "FAILED" as const;
  if (job.status === "GRADED" || job.status === "PARTIAL") return "MISSING" as const;
  return job.status === "NOT_STARTED" ? "QUEUED" as const : job.status as GradingPartStatus;
}

function maxDate(...values: Array<Date | null | undefined>) {
  const dates = values.filter((value): value is Date => value instanceof Date && !Number.isNaN(value.getTime()));
  return dates.length ? new Date(Math.max(...dates.map((value) => value.getTime()))) : new Date(0);
}

export function buildGradingProgress(
  job: GradingJobRecord | null,
  rows: GradingJobPartRecord[],
  expectedParts: ExpectedGradingPart[],
  gradingComplete: boolean,
): GradingProgress {
  const expected = new Map<string, GradingSkill>();
  for (const part of expectedParts) expected.set(part.id, part.skill);
  for (const row of rows) if (!expected.has(row.partId)) expected.set(row.partId, inferGradingSkill(row.partId));

  const rowMap = new Map(rows.map((row) => [row.partId, row]));
  const parts = [...expected.entries()].map(([id, skill]) => {
    const row = rowMap.get(id);
    return {
      id,
      skill,
      status: row?.status ?? fallbackPartStatus(job, gradingComplete),
    };
  });
  // Failed or missing parts are terminal, but they do not have a learner-visible result.
  const completed = parts.filter((part) => part.status === "GRADED" || part.status === "PARTIAL").length;
  return { completed, total: parts.length, parts };
}

export async function readGradingStatus(options: {
  attemptId: string;
  grading: unknown;
  writingStatus?: unknown;
  speakingStatus?: unknown;
  updatedAt?: Date | string | null;
  expectedParts?: ExpectedGradingPart[];
  db?: GradingJobsDatabase;
  now?: Date;
}): Promise<PublicGradingStatus> {
  const db = options.db ?? database();
  const now = normalizeDateForQuery(options.now);
  const job = await readGradingJob(options.attemptId, { db });
  const pipelineVersion = job?.pipelineVersion ?? configuredPipelineVersion();
  const partValues = await db.examGradingPart.findMany({
    where: { attemptId: options.attemptId, pipelineVersion },
    orderBy: { updatedAt: "asc" },
    select: PART_SELECT,
  });
  const rows = (Array.isArray(partValues) ? partValues : []).map(normalizePart).filter((row): row is GradingJobPartRecord => Boolean(row));
  const grading = publicGrading(options.grading);
  const gradingComplete = record(options.grading).complete === true;
  const partial = [options.writingStatus, options.speakingStatus].some((value) => value === "PARTIAL");
  const status = gradingComplete
    ? "GRADED"
    : job?.status ?? (partial ? "PARTIAL" : "NOT_STARTED");
  const progress = buildGradingProgress(job, rows, options.expectedParts ?? [], gradingComplete);
  const updatedAt = maxDate(
    dateValue(options.updatedAt),
    job?.updatedAt,
    ...rows.map((row) => row.updatedAt),
  );
  return {
    status,
    grading,
    progress,
    workerAvailable: await workerAvailable({ db, now }),
    retryable: Boolean(job && job.status === "FAILED" && job.attempts < MAX_GRADING_ATTEMPTS && isTransientErrorCode(job.errorCode)),
    updatedAt: updatedAt.toISOString(),
  };
}

export async function runWorkerBatch(options: {
  claim?: () => Promise<ClaimedGradingJob | null>;
  process: (job: ClaimedGradingJob) => Promise<void>;
  maxConcurrent?: number;
}) {
  const claim = options.claim ?? (() => claimNextJob());
  const maxConcurrent = Math.max(1, Math.floor(options.maxConcurrent ?? 2));
  const jobs: ClaimedGradingJob[] = [];
  for (let index = 0; index < maxConcurrent; index += 1) {
    const job = await claim();
    if (!job) break;
    jobs.push(job);
    if (jobs.length < maxConcurrent) await Promise.resolve();
  }
  await Promise.all(jobs.map((job) => options.process(job)));
  return jobs.length;
}

function executable(path: string) {
  return new Promise<boolean>((resolve) => {
    const child = spawn(path, ["-version"], { stdio: "ignore", windowsHide: true });
    child.once("error", () => resolve(false));
    child.once("exit", (code) => resolve(code === 0));
  });
}

export type WorkerHealth = {
  ok: boolean;
  configuration: { ok: boolean; missing: string[] };
  ffmpeg: { ok: boolean; path: string };
  storage: { ok: boolean; provider: "blob" | "local" | "missing" };
};

export async function checkWorkerHealth(options: { env?: WorkerEnvironment; ffmpegPath?: string; blobProbe?: () => Promise<unknown> } = {}): Promise<WorkerHealth> {
  const env = options.env ?? process.env;
  const missing = ["DATABASE_URL", "OPENAI_API_KEY"].filter((key) => !env[key]?.trim());
  const ffmpegPath = options.ffmpegPath ?? env.FFMPEG_PATH?.trim() ?? "ffmpeg";
  const ffmpegOk = await executable(ffmpegPath);
  const blobEnabled = Boolean(env.BLOB_READ_WRITE_TOKEN?.trim());
  let storageOk = true;
  let provider: WorkerHealth["storage"]["provider"] = blobEnabled ? "blob" : "local";
  if (env.NODE_ENV === "production" && !blobEnabled) {
    storageOk = false;
    provider = "missing";
  } else if (blobEnabled) {
    try {
      // Listing metadata is a read-only authenticated probe; it never reads
      // or logs candidate audio payloads.
      await (options.blobProbe ?? (() => list({ prefix: "exam-recordings/", limit: 1 })))();
    } catch {
      storageOk = false;
    }
  } else {
    try {
      await access(process.cwd());
    } catch {
      storageOk = false;
    }
  }
  return {
    ok: missing.length === 0 && ffmpegOk && storageOk,
    configuration: { ok: missing.length === 0, missing },
    ffmpeg: { ok: ffmpegOk, path: ffmpegPath },
    storage: { ok: storageOk, provider },
  };
}
