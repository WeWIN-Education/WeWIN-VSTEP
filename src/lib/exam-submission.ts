import type { VstepTest1Public } from "./vstep-test-1-public";
export function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
export function savedAnswers(value: unknown) {
  const data = object(value);
  return { answers: object(data.answers ?? data), writingAnswers: object(data.writingAnswers ?? data.writing) };
}
export function validateSubmission(body: Record<string, unknown>, previous: unknown, previousRecordings: unknown, paper: VstepTest1Public, attemptId?: string) {
  const saved = savedAnswers(previous);
  const answers = { ...saved.answers, ...object(body.answers) };
  const writingAnswers = { ...saved.writingAnswers, ...object(body.writingAnswers) };
  const recordings = { ...object(previousRecordings), ...object(body.recordings) };
  delete answers.writing; delete answers.writingAnswers;
  for (const [id, answer] of Object.entries(answers)) {
    const question=[...paper.listening.parts.flatMap(part=>part.questions),...paper.reading.passages.flatMap(passage=>passage.questions)].find(item=>item.id===id);
    if (!question || typeof answer !== "string" || !/^[A-Z]$/.test(answer) || answer.charCodeAt(0)-65 >= question.options.length) throw new Error("Đáp án không hợp lệ.");
  }
  for (const [id, answer] of Object.entries(writingAnswers)) {
    if (!paper.writing.some(t => t.id === id) || typeof answer !== "string" || answer.length > 30000) throw new Error("Bài viết không hợp lệ hoặc quá dài.");
  }
  for (const [id, value] of Object.entries(recordings)) {
    const recording = object(value);
    const isLegacyDataUrl = typeof recording.audioData === "string" && recording.audioData.length <= 20_000_000 && /^data:audio\/(webm|ogg|mp4|m4a|mpeg|wav|x-wav)(;codecs=[^;,]+)?;base64,[A-Za-z0-9+/]+=*$/.test(recording.audioData);
    const storageKey = typeof recording.storageKey === "string" ? recording.storageKey : "";
    const isStoredRecording = /^exam-recordings\/[^/]+\/[^/]+\.(webm|ogg|m4a|wav|mp3)$/i.test(storageKey) && (!attemptId || storageKey.startsWith(`exam-recordings/${attemptId}/`)) && Number(recording.sizeBytes || 0) > 0 && Number(recording.sizeBytes || 0) <= 20 * 1024 * 1024;
    if (!paper.speaking.parts.some(p => p.id === id) || (!isLegacyDataUrl && !isStoredRecording)) throw new Error("Bản ghi âm không hợp lệ hoặc vượt quá 20 MB.");
  }
  return { answers: answers as Record<string,string>, writingAnswers: writingAnswers as Record<string,string>, recordings };
}
