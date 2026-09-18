import { prisma } from "@/lib/prisma";
import { aggregateSpeaking, gradeSpeaking, gradeWriting, PROMPT_VERSION } from "@/lib/openai-grading";
import { dataUrlFromBuffer, readObject } from "@/lib/storage";
import { object, savedAnswers } from "@/lib/exam-submission";
import { resolveCatalogExamData, scoreExam } from "@/lib/exam-scoring";
import type { Prisma } from "@prisma/client";

export class GradingServiceError extends Error {
  code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "GradingServiceError";
    this.code = code;
  }
}

async function recordingAudioData(attemptId: string, partId: string, metadata: Record<string, unknown>, fallback: Record<string, unknown> | undefined) {
  if (typeof metadata.audioData === "string" && metadata.audioData) return metadata.audioData;
  const storageKey = typeof metadata.storageKey === "string" ? metadata.storageKey : "";
  if (!storageKey) return "";
  if (!storageKey.startsWith(`exam-recordings/${attemptId}/`)) throw new GradingServiceError("INVALID_RECORDING", `${partId}: bản ghi không thuộc lượt thi.`);
  const bytes = await readObject(storageKey);
  if (!bytes?.length) return "";
  const mimeType = typeof metadata.mimeType === "string" ? metadata.mimeType : typeof fallback?.mimeType === "string" ? fallback.mimeType : "audio/webm";
  return dataUrlFromBuffer(bytes, mimeType);
}

export async function gradeAttempt(attemptId: string, options: { jobId?: string } = {}) {
  const attempt = await prisma.examAttempt.findFirst({ where: { id: attemptId, status: "SUBMITTED" }, include: { examPaper: { select: { slug: true, sections: true, questions: true } }, paperPart: { select: { sections: true, questions: true } } } });
  if (!attempt) throw new GradingServiceError("ATTEMPT_NOT_FOUND", "Lượt thi chưa nộp hoặc không tồn tại.");
  const exam = resolveCatalogExamData({ slug: attempt.examPaper.slug, sections: attempt.examPaper.sections, questions: attempt.examPaper.questions, catalog: attempt.catalog, partSections: attempt.paperPart?.sections, partQuestions: attempt.paperPart?.questions });
  if (!exam) throw new GradingServiceError("INVALID_EXAM", "Nội dung đề không hợp lệ.");
  const cached = object(attempt.grading);
  if (cached.complete) return cached;
  if (!process.env.OPENAI_API_KEY) throw new GradingServiceError("MISSING_OPENAI_KEY", "Dịch vụ chấm điểm chưa được cấu hình.");

  const lease = new Date();
  const claimed = await prisma.examAttempt.updateMany({ where: { id: attemptId, OR: [{ gradingStartedAt: null }, { gradingStartedAt: { lt: new Date(Date.now() - 15 * 60_000) } }] }, data: { gradingStartedAt: lease } });
  if (!claimed.count) throw new GradingServiceError("GRADING_IN_PROGRESS", "Bài đang được chấm. Vui lòng đợi rồi xem lại.");

  const writing = Array.isArray(cached.writing) ? cached.writing as Record<string, unknown>[] : [];
  const speaking = Array.isArray(cached.speaking) ? cached.speaking as Record<string, unknown>[] : [];
  const pipelines = object(cached.pipelines);
  const recordingFiles = await prisma.examRecording.findMany({ where: { attemptId, status: "SAVED" }, select: { partId: true, storageKey: true, mimeType: true } });
  const recordingFileMap = new Map(recordingFiles.map((recording) => [recording.partId, recording]));

  async function checkpoint() {
    await prisma.examAttempt.updateMany({ where: { id: attemptId, gradingStartedAt: lease }, data: { grading: { writing, speaking, pipelines, prompt_version: PROMPT_VERSION, complete: false } as unknown as Prisma.InputJsonObject } });
  }

  try {
    const saved = savedAnswers(attempt.answers);
    for (const [index, task] of exam.paper.writing.entries()) {
      if (writing.some((result) => result.id === task.id)) continue;
      const response = saved.writingAnswers[task.id];
      if (typeof response !== "string" || !response.trim()) continue;
      const prompt = task.prompt + (task.bullets ? `\n${task.bullets.join("\n")}` : "");
      writing.push({ id: task.id, ...await gradeWriting(index === 0 ? "task1" : "task2", prompt, response, object(pipelines[task.id]), async (state) => { pipelines[task.id] = state; await checkpoint(); }) });
      await checkpoint();
    }

    const recordings = object(attempt.recordings);
    for (const part of exam.paper.speaking.parts) {
      if (speaking.some((result) => result.id === part.id)) continue;
      const metadata = object(recordings[part.id]);
      const file = recordingFileMap.get(part.id);
      const audioData = await recordingAudioData(attemptId, part.id, metadata, file ? { mimeType: file.mimeType } : undefined);
      if (!audioData) continue;
      speaking.push({ id: part.id, ...await gradeSpeaking(part.id.replace("speaking-", "part"), `${part.prompt}\n${part.questions.join("\n")}`, audioData, object(pipelines[part.id]), async (state) => { pipelines[part.id] = state; await checkpoint(); }) });
      await checkpoint();
    }

    const score = (items: Record<string, unknown>[], id: string) => {
      const item = items.find((value) => value.id === id);
      return item && typeof item.task_score === "number" ? item.task_score : null;
    };
    const writingValues = exam.paper.writing.map((task) => score(writing, task.id));
    const speakingValues = exam.paper.speaking.parts.map((part) => score(speaking, part.id));
    const writingComplete = exam.paper.writing.length === 0 || (writingValues.length === exam.paper.writing.length && writingValues.every((value): value is number => typeof value === "number"));
    const scoredWritingValues = writingValues.filter((value): value is number => typeof value === "number");
    const writingScore = writingComplete && scoredWritingValues.length === 2 ? Math.round((scoredWritingValues[0] + 2 * scoredWritingValues[1]) / 3 * 2) / 2 : null;
    let speakingSummary = object(cached.speakingSummary);
    const speakingComplete = exam.paper.speaking.parts.length === 0 || (speakingValues.length === exam.paper.speaking.parts.length && speakingValues.every((value): value is number => typeof value === "number"));
    if (speakingComplete && !Object.keys(speakingSummary).length) speakingSummary = await aggregateSpeaking(speaking);
    const speakingScore = typeof speakingSummary.speaking_estimated_score === "number" ? speakingSummary.speaking_estimated_score : null;
    const objective = scoreExam(exam.paper, exam.privateData, saved.answers as Record<string, string>);
    const allScores = [objective.listening.score, objective.reading.score, writingScore, speakingScore];
    const overallScore = allScores.every((value): value is number => typeof value === "number") ? Math.round(allScores.reduce((sum, value) => sum + value, 0) / allScores.length * 10) / 10 : null;
    const complete = writingComplete && speakingComplete;
    const result = { writing, speaking, writingScore, speakingScore, overallScore, speakingSummary, pipelines, prompt_version: PROMPT_VERSION, writingStatus: writingComplete ? "GRADED" : writing.length ? "PARTIAL" : "NOT_STARTED", speakingStatus: speakingComplete ? "GRADED" : speaking.length ? "PARTIAL" : "NOT_STARTED", complete };
    await prisma.examAttempt.updateMany({ where: { id: attemptId, gradingStartedAt: lease }, data: { grading: result as unknown as Prisma.InputJsonObject, gradingStartedAt: null, writingStatus: result.writingStatus, speakingStatus: result.speakingStatus } });
    if (options.jobId) await prisma.examGradingJob.update({ where: { id: options.jobId }, data: { status: complete ? "GRADED" : "PARTIAL", finishedAt: new Date(), lockedAt: null, errorCode: null, errorMessage: null } });
    return result;
  } catch (error) {
    await prisma.examAttempt.updateMany({ where: { id: attemptId, gradingStartedAt: lease }, data: { gradingStartedAt: null } });
    if (options.jobId) await prisma.examGradingJob.update({ where: { id: options.jobId }, data: { status: "FAILED", finishedAt: new Date(), lockedAt: null, errorCode: error instanceof GradingServiceError ? error.code : "GRADING_FAILED", errorMessage: error instanceof Error ? error.message : "Không thể chấm." } }).catch(() => undefined);
    throw error;
  }
}
