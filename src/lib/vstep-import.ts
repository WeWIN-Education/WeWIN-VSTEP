import "server-only";
import mammoth from "mammoth";
import type { VstepListeningPart, VstepQuestion, VstepReadingPassage, VstepWritingTask } from "./vstep-test-1-public";
import type { StoredVstepPublic, VstepPrivateData } from "./vstep-paper";

type DraftQuestion = Partial<VstepQuestion> & { options: string[]; answer?: string; explanation?: string };
type DraftSpeaking = { id?: string; title?: string; prompt?: string; questions: string[]; audio?: string; preparationSeconds?: number; speakingSeconds?: number };
export type ParsedVstep = { paper: StoredVstepPublic; privateData: VstepPrivateData; audioNames: string[]; warnings: string[] };

const numberValue = (value: string, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
function slug(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export async function parseVstepDocx(buffer: Buffer): Promise<ParsedVstep> {
  const extracted = await mammoth.extractRawText({ buffer });
  return parseVstepText(extracted.value);
}

export function parseVstepText(text: string): ParsedVstep {
  const lines = text.replace(/\u00a0/g, " ").split(/\r?\n/);
  const meta: Record<string, string> = {};
  let section = "", block = "", capture: "text" | "instructions" | null = null, captured: string[] = [], started = false;
  const listening: Array<Partial<VstepListeningPart> & { audio?: string; questions: VstepQuestion[] }> = [];
  const reading: Array<Partial<VstepReadingPassage> & { questions: VstepQuestion[] }> = [];
  const writing: Array<Partial<VstepWritingTask> & { bullets: string[] }> = [];
  const speaking: DraftSpeaking[] = [];
  let question: DraftQuestion | null = null;
  let listeningInstructions = "", readingInstructions = "";
  const errors: string[] = [], warnings: string[] = [];
  const finishQuestion = () => {
    if (!question) return;
    const list = section === "listening" ? listening.at(-1)?.questions : reading.at(-1)?.questions;
    if (!list) errors.push(`QUESTION ${question.id || "không mã"} nằm ngoài phần Nghe/Đọc.`);
    else list.push({ id: question.id || `${section}-${list.length + 1}`, number: question.number || list.length + 1, prompt: question.prompt || "", options: question.options });
    question = null;
  };
  const finishCapture = () => {
    const value = captured.filter((line, index, all) => line || (index > 0 && index < all.length - 1)).join("\n").trim();
    if (capture === "text" && reading.at(-1)) reading.at(-1)!.text = value;
    if (capture === "instructions") {
      if (section === "listening" && block === "section") listeningInstructions = value;
      else if (section === "reading" && block === "section") readingInstructions = value;
      else if (section === "listening" && listening.at(-1)) listening.at(-1)!.instructions = value;
    }
    capture = null; captured = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (capture) {
      const closingTag = capture === "text" ? "[/TEXT]" : "[/INSTRUCTIONS]";
      if (line.toUpperCase() === closingTag) { finishCapture(); continue; }
      captured.push(raw.trim()); continue;
    }
    const tag = line.match(/^\[([A-Z_]+)\]$/i)?.[1]?.toUpperCase();
    if (tag) {
      if(tag === "EXAM") { started=true; section=""; block="exam"; continue; }
      if(!started)continue;
      finishQuestion();
      if (tag === "TEXT" || tag === "INSTRUCTIONS") { capture = tag === "TEXT" ? "text" : "instructions"; continue; }
      if (tag === "LISTENING") { section = "listening"; block = "section"; }
      else if (tag === "LISTENING_PART") { section = "listening"; block = "part"; listening.push({ questions: [] }); }
      else if (tag === "READING") { section = "reading"; block = "section"; }
      else if (tag === "READING_PASSAGE") { section = "reading"; block = "passage"; reading.push({ questions: [] }); }
      else if (tag === "WRITING") { section = "writing"; block = "section"; }
      else if (tag === "WRITING_TASK") { section = "writing"; block = "task"; writing.push({ bullets: [] }); }
      else if (tag === "SPEAKING") { section = "speaking"; block = "section"; }
      else if (tag === "SPEAKING_PART") { section = "speaking"; block = "part"; speaking.push({ questions: [] }); }
      else if (tag === "QUESTION") { block = "question"; question = { options: [] }; }
      else warnings.push(`Bỏ qua thẻ [${tag}].`);
      continue;
    }
    if(!started)continue;
    if (!line || line.startsWith("#")) continue;
    const pair = line.match(/^([A-Za-z_]+)\s*:\s*(.*)$/);
    if (!pair) {
      // Word/Google Docs often keeps human-readable section headings beside the
      // machine tags. They are presentation text, not malformed fields.
      if (!/^(?:listening|reading|writing|speaking)(?:\s+(?:part|passage|task)\s+\d+)?$/i.test(line)) warnings.push(`Không đọc được dòng: ${line.slice(0, 80)}`);
      continue;
    }
    const key = pair[1].toLowerCase(), value = pair[2].trim();
    if (block === "question" && question) {
      if (/^[a-d]$/.test(key)) question.options[key.charCodeAt(0) - 97] = value;
      else if (key === "id") question.id = value;
      else if (key === "number") question.number = numberValue(value);
      else if (key === "prompt") question.prompt = value;
      else if (key === "answer") question.answer = value.toUpperCase();
      else if (key === "explanation") question.explanation = value;
      continue;
    }
    if (section === "listening" && block === "part" && listening.at(-1)) {
      const part = listening.at(-1)!;
      if (key === "id") part.id = value; else if (key === "title") part.title = value; else if (key === "audio") part.audio = value; else if (key === "duration_seconds") part.durationSeconds = numberValue(value); else if (key === "instructions") part.instructions = value;
    } else if (section === "reading" && block === "passage" && reading.at(-1)) {
      const passage = reading.at(-1)!; if (key === "id") passage.id = value; else if (key === "title") passage.title = value; else if (key === "text") passage.text = value;
    } else if (section === "writing" && block === "task" && writing.at(-1)) {
      const task = writing.at(-1)!; if (key === "id") task.id = value; else if (key === "title") task.title = value; else if (key === "duration_minutes") task.durationMinutes = numberValue(value); else if (key === "minimum_words") task.minimumWords = numberValue(value); else if (key === "prompt") task.prompt = value; else if (key === "bullet") task.bullets.push(value);
    } else if (section === "speaking" && block === "part" && speaking.at(-1)) {
      const part = speaking.at(-1)!; if (key === "id") part.id = value; else if (key === "title") part.title = value; else if (key === "prompt") part.prompt = value; else if (key === "question") part.questions.push(value); else if (key === "audio") part.audio = value; else if (key === "preparation_seconds") part.preparationSeconds = numberValue(value); else if (key === "speaking_seconds") part.speakingSeconds = numberValue(value);
    } else meta[key] = value;
  }
  finishCapture(); finishQuestion();
  const paperSlug = slug(meta.slug || meta.title || "");
  const audioNames = [...listening.map(part => part.audio), ...speaking.map(part => part.audio)].filter((name): name is string => Boolean(name));
  const answerKey: VstepPrivateData["answerKey"] = {};
  // Re-read answer lines in order from source because public question objects deliberately omit keys.
  let activeId = "";
  for (const raw of lines) {
    const tag = raw.trim().toUpperCase();
    if (tag === "[QUESTION]") activeId = "";
    const id = raw.trim().match(/^id\s*:\s*(.+)$/i)?.[1]?.trim(); if (id) activeId = id;
    const answer = raw.trim().match(/^answer\s*:\s*([A-D])$/i)?.[1]?.toUpperCase();
    const explanation = raw.trim().match(/^explanation\s*:\s*(.*)$/i)?.[1]?.trim();
    if (answer && activeId) answerKey[activeId] = { correctIndex: answer.charCodeAt(0) - 65, explanation: "" };
    if (explanation && activeId && answerKey[activeId]) answerKey[activeId].explanation = explanation;
  }
  const publicPaper: StoredVstepPublic = {
    version: 1, slug: paperSlug, title: meta.title || paperSlug, subtitle: meta.subtitle || "Bài luyện VSTEP bốn kỹ năng", target: meta.target || "B1–C1",
    durationMinutes: numberValue(meta.duration_minutes, 179), questionCount: listening.reduce((n,p)=>n+p.questions.length,0)+reading.reduce((n,p)=>n+p.questions.length,0)+writing.length+speaking.length,
    listening: { instructions: listeningInstructions, parts: listening.map((p,index)=>({id:p.id || `listening-part-${index+1}`,title:p.title || `Part ${index+1}`,audioUrl:p.audio || "",durationSeconds:p.durationSeconds || 0,instructions:p.instructions || "",questions:p.questions})) },
    reading: { instructions: readingInstructions, passages: reading.map((p,index)=>({id:p.id || `reading-passage-${index+1}`,title:p.title || `Passage ${index+1}`,text:p.text || "",questions:p.questions})) },
    writing: writing.map((t,index)=>({id:t.id || `writing-${index+1}`,title:t.title || `Task ${index+1}`,durationMinutes:t.durationMinutes || (index?40:20),minimumWords:t.minimumWords || (index?250:120),prompt:t.prompt || "",...(t.bullets.length?{bullets:t.bullets}: {})})),
    speaking: { parts: speaking.map((p,index)=>({id:p.id || `speaking-${index+1}`,title:p.title || `Part ${index+1}`,prompt:p.prompt || "",questions:p.questions,audioUrl:p.audio,preparationSeconds:p.preparationSeconds || (index?60:15),speakingSeconds:p.speakingSeconds || (index===2?240:180)})) },
  };
  const ids = [...publicPaper.listening.parts.flatMap(p=>p.questions),...publicPaper.reading.passages.flatMap(p=>p.questions)].map(q=>q.id);
  const allIds = [...ids,...publicPaper.writing.map(t=>t.id),...publicPaper.speaking.parts.map(p=>p.id)];
  if (!paperSlug) errors.push("Thiếu slug hoặc title trong [EXAM].");
  if (paperSlug.includes("xx") || /\[(điền|dien)|\{\{/i.test(meta.title || "")) errors.push("Hãy thay slug và title mẫu bằng thông tin đề thật.");
  if (new Set(allIds).size !== allIds.length) errors.push("Mã id bị trùng.");
  for (const q of [...publicPaper.listening.parts.flatMap(p=>p.questions),...publicPaper.reading.passages.flatMap(p=>p.questions)]) {
    if (!q.prompt || q.options.length !== 4 || q.options.some(option=>!option)) errors.push(`${q.id}: cần prompt và đủ A, B, C, D.`);
    if ([q.prompt,...q.options].some(value=>/\[(điền|dien)|\{\{/i.test(value))) errors.push(`${q.id}: còn nội dung mẫu chưa điền.`);
    if (!answerKey[q.id]) errors.push(`${q.id}: thiếu answer.`);
    else if (!answerKey[q.id].explanation || /\[(điền|dien)|\{\{/i.test(answerKey[q.id].explanation)) errors.push(`${q.id}: thiếu explanation thật.`);
  }
  for (const p of publicPaper.reading.passages) if (!p.text || /\[(điền|dien)|\{\{/i.test(p.text)) errors.push(`${p.id}: thiếu nội dung thật trong [TEXT].`);
  for (const t of publicPaper.writing) if (!t.prompt || [t.prompt,...(t.bullets||[])].some(value=>/\[(điền|dien)|\{\{/i.test(value))) errors.push(`${t.id}: còn prompt hoặc bullet mẫu.`);
  for (const p of publicPaper.speaking.parts) if (!p.prompt || [p.prompt,...p.questions].some(value=>/\[(điền|dien)|\{\{/i.test(value))) errors.push(`${p.id}: còn prompt hoặc câu hỏi mẫu.`);
  if ([publicPaper.listening.instructions,publicPaper.reading.instructions,...publicPaper.listening.parts.map(p=>p.instructions)].some(value=>/\[(điền|dien)|\{\{/i.test(value))) errors.push("Còn hướng dẫn mẫu chưa được thay.");
  if ((meta.strict_vstep || "true").trim().toLowerCase() !== "false") {
    const listeningCount = publicPaper.listening.parts.reduce((n,p)=>n+p.questions.length,0), readingCount = publicPaper.reading.passages.reduce((n,p)=>n+p.questions.length,0);
    if (publicPaper.listening.parts.length !== 3) errors.push(`VSTEP đầy đủ cần 3 phần Nghe; hiện có ${publicPaper.listening.parts.length}.`);
    if (listeningCount !== 35) errors.push(`VSTEP đầy đủ cần 35 câu Nghe; hiện có ${listeningCount}.`);
    const listeningShape=publicPaper.listening.parts.map(part=>part.questions.length).join("/");
    if (listeningShape !== "8/12/15") errors.push(`Số câu ba phần Nghe phải là 8/12/15; hiện là ${listeningShape || "trống"}.`);
    for (const part of publicPaper.listening.parts) {
      if (!part.audioUrl) errors.push(`${part.id}: thiếu audio.`);
      if (!(part.durationSeconds > 0)) errors.push(`${part.id}: duration_seconds phải lớn hơn 0.`);
    }
    if (publicPaper.reading.passages.length !== 4) errors.push(`VSTEP đầy đủ cần 4 bài Đọc; hiện có ${publicPaper.reading.passages.length}.`);
    if (readingCount !== 40) errors.push(`VSTEP đầy đủ cần 40 câu Đọc; hiện có ${readingCount}.`);
    if (publicPaper.reading.passages.some(passage=>passage.questions.length!==10)) errors.push("Mỗi bài Đọc phải có 10 câu.");
    if (publicPaper.writing.length !== 2) errors.push(`VSTEP đầy đủ cần 2 bài Viết; hiện có ${publicPaper.writing.length}.`);
    if (publicPaper.speaking.parts.length !== 3) errors.push(`VSTEP đầy đủ cần 3 phần Nói; hiện có ${publicPaper.speaking.parts.length}.`);
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { paper: publicPaper, privateData: { version: 1, answerKey }, audioNames: [...new Set(audioNames)], warnings };
}
