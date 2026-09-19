import { createHash } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { aggregateSpeaking, gradeSpeaking, gradeWriting, PROMPT_VERSION } from "@/lib/openai-grading";
import { GRADING_V2_PROMPT_VERSION } from "@/lib/grading-v2";
import { dataUrlFromBuffer, readObject } from "@/lib/storage";
import { object, savedAnswers } from "@/lib/exam-submission";
import { resolveCatalogExamData, scoreExam } from "@/lib/exam-scoring";

export class GradingServiceError extends Error {
  constructor(public code: string, message: string, public retryable = false) { super(message); this.name = "GradingServiceError"; }
}
type Value = Record<string, unknown>;
type Part = { id: string; skill: "writing" | "speaking"; status: string; state: Value; result?: Value; fingerprint: string; errorCode?: string };
type Options = { jobId?: string; leaseToken?: string; pipelineVersion?: string };
const json = (value: unknown) => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonObject;

async function recordingAudioData(attemptId: string, metadata: Value, fallback?: { storageKey: string; mimeType: string }) {
  if (typeof metadata.audioData === "string" && metadata.audioData) return metadata.audioData;
  const key = typeof metadata.storageKey === "string" ? metadata.storageKey : fallback?.storageKey;
  if (!key || !key.startsWith(`exam-recordings/${attemptId}/`)) throw new GradingServiceError("INVALID_RECORDING", "Bản ghi không thuộc lượt thi.");
  let bytes: Buffer | null;
  try {
    bytes = await readObject(key);
  } catch (error) {
    const status = Number(object(error).status || object(error).statusCode);
    const permanent = status === 401 || status === 403;
    throw new GradingServiceError(permanent ? "STORAGE_ACCESS_DENIED" : "RECORDING_UNAVAILABLE", permanent ? "Không có quyền đọc bản ghi đã lưu." : "Tạm thời chưa đọc được bản ghi đã lưu.", !permanent);
  }
  if (!bytes?.length) throw new GradingServiceError("RECORDING_UNAVAILABLE", "Chưa đọc được bản ghi đã lưu.", true);
  return dataUrlFromBuffer(bytes, typeof metadata.mimeType === "string" ? metadata.mimeType : fallback?.mimeType || "audio/webm");
}

export async function gradeAttempt(attemptId: string, options: Options = {}) {
  const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, status: "SUBMITTED" }, include: { examPaper: { select: { slug: true, sections: true, questions: true } }, paperPart: { select: { sections: true, questions: true } } } });
  if (!attempt) throw new GradingServiceError("ATTEMPT_NOT_FOUND", "Lượt thi chưa nộp hoặc không tồn tại.");
  const cached = object(attempt.grading);
  if (cached.complete) return cached;
  const exam = resolveCatalogExamData({ slug: attempt.examPaper.slug, sections: attempt.examPaper.sections, questions: attempt.examPaper.questions, catalog: attempt.catalog, partSections: attempt.paperPart?.sections, partQuestions: attempt.paperPart?.questions });
  if (!exam) throw new GradingServiceError("INVALID_EXAM", "Nội dung đề không hợp lệ.");
  const paper = exam.paper;
  const pipelineVersion = (options.pipelineVersion || process.env.GRADING_PIPELINE || "v2") === "v1" ? "v1" : "v2";
  const promptVersion = pipelineVersion === "v2" ? GRADING_V2_PROMPT_VERSION : PROMPT_VERSION;
  const lease = new Date();
  if (options.jobId && !options.leaseToken) throw new GradingServiceError("LEASE_LOST", "Phiên chấm không còn hiệu lực.");
  if (!options.jobId) {
    const claimed = await prisma.examAttempt.updateMany({ where: { id: attemptId, OR: [{ gradingStartedAt: null }, { gradingStartedAt: { lt: new Date(Date.now() - 15 * 60_000) } }] }, data: { gradingStartedAt: lease } });
    if (!claimed.count) throw new GradingServiceError("GRADING_IN_PROGRESS", "Bài đang được chấm.");
  }
  // Fence each result write in the same transaction that locks the owning job.
  async function fenced<T>(write: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(async tx => {
      const owned = options.jobId
        ? await tx.examGradingJob.updateMany({ where: { id: options.jobId, leaseToken: options.leaseToken, status: "PROCESSING", leaseExpiresAt: { gt: new Date() } }, data: { updatedAt: new Date() } })
        : await tx.examAttempt.updateMany({ where: { id: attemptId, gradingStartedAt: lease }, data: { updatedAt: new Date() } });
      if (!owned.count) throw new GradingServiceError("LEASE_LOST", "Phiên chấm đã được chuyển sang tiến trình khác.");
      return write(tx);
    });
  }
  try {
    const saved = savedAnswers(attempt.answers), recordings = object(attempt.recordings);
    const files = await prisma.examRecording.findMany({ where: { attemptId, status: "SAVED" }, select: { partId: true, storageKey: true, mimeType: true } });
    const fileMap = new Map(files.map(file => [file.partId, file]));
    const previous = await prisma.examGradingPart.findMany({ where: { attemptId, pipelineVersion } });
    const parts: Part[] = [], jobs: Array<() => Promise<void>> = [];
    const objective = scoreExam(exam.paper, exam.privateData, saved.answers as Record<string, string>);
    let queue: Promise<unknown> = Promise.resolve();
    function summary() {
      const writing = parts.filter(p => p.skill === "writing" && p.result).map(p => ({ ...p.result!, id: p.id }));
      const speaking = parts.filter(p => p.skill === "speaking" && p.result).map(p => ({ ...p.result!, id: p.id }));
      const score = (id: string): number | null => {
        const p = parts.find(p => p.id === id), value = p?.result?.task_score;
        return p?.status === "GRADED" && typeof value === "number" && Number.isFinite(value) ? value : null;
      };
      const w = paper.writing.map(p => score(p.id)), s = paper.speaking.parts.map(p => score(p.id));
      const writingScore = w.length === 2 && w.every((v): v is number => v !== null) ? Math.round((w[0] + 2 * w[1]) / 3 * 2) / 2 : null;
      const speakingScore = s.length === 3 && s.every((v): v is number => v !== null) ? Math.round(s.reduce((a,b) => a+b,0) / 3 * 2) / 2 : null;
      const skillStatus = (skill: Part["skill"]) => {
        const subset = parts.filter(p => p.skill === skill);
        return !subset.length ? "NOT_STARTED" : subset.every(p => p.status === "GRADED") ? "GRADED" : subset.some(p => p.result) ? "PARTIAL" : "NOT_GRADED";
      };
      const all = [objective.listening.score, objective.reading.score, writingScore, speakingScore];
      return { writing, speaking, writingScore, speakingScore,
        overallScore: attempt!.catalog === "FULL" && all.every((v): v is number => v !== null) ? Math.round(all.reduce((a,b)=>a+b,0) / 4 * 10) / 10 : null,
        speakingSummary: { speaking_estimated_score: speakingScore, method: "practice_part_mean" },
        writingStatus: skillStatus("writing"), speakingStatus: skillStatus("speaking"), complete: parts.every(p => p.status === "GRADED"), pipelineVersion, prompt_version: promptVersion,
        progress: { completed: parts.filter(p => ["GRADED","PARTIAL","MISSING","FAILED"].includes(p.status)).length, total: parts.length, parts: parts.map(({ id, skill, status }) => ({ id, skill, status })) } };
    }
    function persist(part?: Part) {
      const report = summary();
      const reportJson = json(report);
      const snapshot = part ? { ...part, state: json(part.state), result: part.result ? json(part.result) : undefined } : undefined;
      const operation = queue.then(() => fenced(async tx => {
        if (snapshot) await tx.examGradingPart.upsert({
          where: { attemptId_partId_pipelineVersion: { attemptId, partId: snapshot.id, pipelineVersion } },
          create: { attemptId, partId: snapshot.id, pipelineVersion, status: snapshot.status, checkpoint: json({ fingerprint: snapshot.fingerprint, state: snapshot.state }), ...(snapshot.result ? { result: snapshot.result } : {}), errorCode: snapshot.errorCode || null },
          update: { status: snapshot.status, checkpoint: json({ fingerprint: snapshot.fingerprint, state: snapshot.state }), result: snapshot.result || Prisma.JsonNull, errorCode: snapshot.errorCode || null },
        });
        await tx.examAttempt.update({ where: { id: attemptId }, data: { grading: reportJson, writingStatus: report.writingStatus, speakingStatus: report.speakingStatus } });
      }));
      queue = operation.catch(() => undefined);
      return operation;
    }
    function addPart(id: string, skill: Part["skill"], input: unknown, run: (state: Value, checkpoint: (state: Value) => Promise<void>) => Promise<Value>, missing: boolean) {
      const fingerprint = createHash("sha256").update(JSON.stringify({ input, pipelineVersion, prompt: promptVersion, model: skill === "writing" ? process.env.OPENAI_GRADING_MODEL || "gpt-4o-mini" : process.env.OPENAI_SPEAKING_MODEL || "gpt-audio-1.5", transcription: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1" })).digest("hex");
      const prior = previous.find(p => p.partId === id && object(p.checkpoint).fingerprint === fingerprint);
      const legacy = pipelineVersion === "v1" ? object(object(cached.pipelines)[id]) : {};
      const part: Part = { id, skill, fingerprint, status: missing ? "MISSING" : prior && ["GRADED","PARTIAL"].includes(prior.status) ? prior.status : "QUEUED", state: prior ? object(object(prior.checkpoint).state) : legacy, ...(prior?.result ? { result: object(prior.result) } : {}) };
      parts.push(part);
      jobs.push(async () => {
        if (missing || part.status === "GRADED" || part.status === "PARTIAL") { await persist(part); return; }
        part.status = "PROCESSING";
        await persist(part);
        try {
          part.result = await run(part.state, async state => { part.state = state; part.status = String(state.stage).toUpperCase() === "REVIEWING" ? "REVIEWING" : "PROCESSING"; await persist(part); });
          part.status = typeof part.result.task_score === "number" ? "GRADED" : "PARTIAL";
          await persist(part);
        } catch (error) {
          if (error instanceof GradingServiceError && error.code === "LEASE_LOST") throw error;
          part.status = "FAILED";
          part.errorCode = typeof object(error).code === "string" ? String(object(error).code) : "GRADING_FAILED";
          await persist(part);
          throw error;
        }
      });
    }
    for (const [index, task] of exam.paper.writing.entries()) {
      const answer = typeof saved.writingAnswers[task.id] === "string" ? String(saved.writingAnswers[task.id]) : "", prompt = task.prompt + (task.bullets ? `\n${task.bullets.join("\n")}` : "");
      addPart(task.id,"writing",{ prompt,answer },(state,checkpoint)=>gradeWriting(index===0 ? "task1" : "task2", prompt, answer, state, checkpoint, { pipelineVersion }).then((result) => result as unknown as Value),!answer.trim());
    }
    for (const part of exam.paper.speaking.parts) {
      const metadata = object(recordings[part.id]), file = fileMap.get(part.id), prompt = `${part.prompt}\n${part.questions.join("\n")}`;
      addPart(part.id,"speaking",{ prompt,metadata,file },async(state,checkpoint)=>gradeSpeaking(part.id.replace("speaking-","part"), prompt, await recordingAudioData(attemptId, metadata, file), state, checkpoint, { pipelineVersion }).then((result) => result as unknown as Value),!metadata.audioData && !metadata.storageKey && !file);
    }
    await persist();
    const outcomes = await Promise.allSettled(jobs.map(run=>run()));
    await queue;
    const failures = outcomes.filter((v): v is PromiseRejectedResult=>v.status==="rejected");
    const lost = failures.find(v=>v.reason instanceof GradingServiceError && v.reason.code==="LEASE_LOST");
    if (lost) throw lost.reason;
    const retry = failures.find(v=>object(v.reason).retryable===true);
    if (retry) throw retry.reason;
    if (failures.length) throw failures[0].reason;
    const result = summary();
    if (pipelineVersion === "v1" && result.speakingScore !== null) {
      const aggregate = await aggregateSpeaking(result.speaking, { pipelineVersion: "v1" });
      result.speakingSummary = { ...result.speakingSummary, ...aggregate };
      result.speakingScore = typeof aggregate.speaking_estimated_score === "number" ? aggregate.speaking_estimated_score : null;
      const scores = [objective.listening.score, objective.reading.score, result.writingScore, result.speakingScore];
      result.overallScore = attempt.catalog === "FULL" && scores.every((v): v is number => v !== null) ? Math.round(scores.reduce((a,b)=>a+b,0) / 4 * 10) / 10 : null;
    }
    await fenced(tx=>tx.examAttempt.update({ where:{id:attemptId}, data:{grading:json(result),gradingStartedAt:null,writingStatus:result.writingStatus,speakingStatus:result.speakingStatus} }));
    return result;
  } finally {
    if (!options.jobId) await prisma.examAttempt.updateMany({where:{id:attemptId,gradingStartedAt:lease},data:{gradingStartedAt:null}});
  }
}
