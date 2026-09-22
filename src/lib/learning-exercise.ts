export type LearningExerciseQuestion = {
  id: string;
  number: number;
  prompt: string;
  options: string[];
  answerIndex: number | null;
  explanation: string;
  evidence: string;
  distractors: string;
};

export type LearningExercise = {
  skill: "LISTENING" | "READING" | "WRITING" | "SPEAKING";
  durationMinutes: number;
  sourceText: string;
  transcript: string;
  questions: LearningExerciseQuestion[];
  prompt: string;
  writingInstructions: string[];
  vocabulary: string[];
  sample: string;
  sampleAnalysis: string;
  checklist: string[];
  preparationSeconds: number | null;
  speakingSeconds: number | null;
  speakingQuestions: string[];
  strategy: string;
};

type Section = { heading: string; body: string };

function sectionList(source: string): Section[] {
  const matches = [...source.replace(/\r\n?/g, "\n").matchAll(/^##\s+(.+)$/gm)];
  return matches.map((match, index) => ({
    heading: match[1].trim(),
    body: source.slice(match.index! + match[0].length, matches[index + 1]?.index ?? source.length).trim(),
  }));
}

function sectionBody(sections: Section[], prefix: string) {
  return sections.find((section) => section.heading.startsWith(prefix))?.body ?? "";
}

function fieldValue(source: string, label: string) {
  const match = new RegExp(`^\\s*-?\\s*${escapeRegExp(label)}:\\s*(.+)$`, "im").exec(source);
  return match?.[1]?.trim() ?? "";
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function cleanQuoted(value: string) {
  return value.trim().replace(/^[“"]|[”"]$/g, "").trim();
}

function optionalDistractors(value: string) {
  return /^không có thông tin hỗ trợ\.?$/i.test(value.trim()) ? "" : value;
}

function blockValue(source: string, label: string, nextLabels: string[]) {
  const next = nextLabels.map(escapeRegExp).join("|");
  const match = new RegExp(`(?:^|\\n)\\s*-?\\s*${escapeRegExp(label)}:\\s*([\\s\\S]*?)(?=\\n\\s*-?\\s*(?:${next}):|\\n##|\\n###|$)`, "i").exec(source);
  return cleanQuoted(match?.[1] ?? "");
}

function sharedText(source: string) {
  return (blockValue(source, "Đoạn văn / tình huống", ["File audio", "Transcript", "Nguồn và quyền sử dụng"])
    || blockValue(source, "Đoạn cần sửa", ["File audio", "Transcript", "Nguồn và quyền sử dụng"]))
    .replace(/^Đoạn cần sửa:\s*/i, "")
    .trim();
}

function transcriptValue(source: string, sourceText: string) {
  const transcript = fieldValue(source, "Transcript");
  if (!transcript || /^không áp dụng/i.test(transcript)) return sourceText;
  if (/^(đoạn|dùng transcript)/i.test(transcript)) return sourceText;
  return cleanQuoted(transcript);
}

function questionBlocks(source: string) {
  const matches = [...source.matchAll(/^###\s+Q(\d+)\s*$/gm)];
  return matches.map((match, index) => ({
    number: Number(match[1]),
    body: source.slice(match.index! + match[0].length, matches[index + 1]?.index ?? source.length).trim(),
  }));
}

function optionList(source: string) {
  return [...source.matchAll(/^([A-H])\.\s+(.+)$/gm)].map((match) => ({ letter: match[1], value: match[2].trim() }));
}

function answerIndex(source: string, options: { letter: string }[]) {
  const answer = fieldValue(source, "Đáp án đúng").toUpperCase().match(/[A-H]/)?.[0];
  if (!answer) return null;
  const index = options.findIndex((option) => option.letter === answer);
  return index < 0 ? null : index;
}

function untilNext(source: string, label: string, nextLabels: string[]) {
  return blockValue(source, label, nextLabels);
}

function parseQuestion(body: string, number: number): LearningExerciseQuestion {
  const options = optionList(body);
  return {
    id: `q-${number}`,
    number,
    prompt: fieldValue(body, "Yêu cầu hiển thị") || fieldValue(body, "Đề viết") || "Hoàn thành hoạt động theo hướng dẫn.",
    options: options.map((option) => option.value),
    answerIndex: answerIndex(body, options),
    explanation: untilNext(body, "Giải thích tiếng Việt", ["Bằng chứng trong audio", "Bằng chứng trong bài đọc", "Vì sao các phương án khác sai", "Checklist tự đánh giá", "Yêu cầu sửa và viết lại"]),
    evidence: untilNext(body, "Bằng chứng trong audio", ["Bằng chứng trong bài đọc", "Vì sao các phương án khác sai", "Checklist tự đánh giá"])
      || untilNext(body, "Bằng chứng trong bài đọc", ["Vì sao các phương án khác sai", "Checklist tự đánh giá"]),
    distractors: optionalDistractors(untilNext(body, "Vì sao các phương án khác sai", ["Checklist tự đánh giá", "Yêu cầu sửa và viết lại"])),
  };
}

function numberedList(source: string) {
  return [...source.matchAll(/^\s*(?:\d+\.|[-*])\s+(.+)$/gm)].map((match) => match[1].trim());
}

function listAfter(source: string, label: string, nextLabels: string[]) {
  return numberedList(blockValue(source, label, nextLabels));
}

function splitHints(value: string) {
  return value
    .split(/\s*(?:→|->|,|;|\|)\s*/)
    .map((item) => item.trim().replace(/[.,:;]+$/, ""))
    .filter((item) => item.length > 1 && item.length < 80);
}

function vocabularyHints(activity: string, question: string) {
  const explicit = blockValue(activity, "Từ vựng gợi ý", ["Bài mẫu", "Phân tích bài mẫu", "Checklist tự đánh giá", "Yêu cầu sửa và viết lại"]);
  const strategy = fieldValue(question, "Gợi ý triển khai ý") || fieldValue(activity, "Gợi ý triển khai ý");
  const values = [...splitHints(explicit), ...splitHints(strategy)];
  return [...new Set(values)];
}

function durationMinutes(source: string, skill: LearningExercise["skill"], questionCount: number) {
  const planned = Number(fieldValue(source, "Thời lượng dự kiến").match(/\d+/)?.[0] ?? 0);
  if (skill === "READING" || skill === "LISTENING") {
    if (questionCount === 5) return 7;
    if (questionCount === 10) return 10;
  }
  if (skill === "WRITING") return 10;
  return planned || 10;
}

function secondsValue(source: string, label: string) {
  const value = fieldValue(source, label).match(/\d+/)?.[0];
  return value ? Number(value) : null;
}

function speakingQuestions(sourceText: string) {
  return sourceText.split("\n").map((line) => line.trim()).filter((line) => /^\d+[.)]\s+/.test(line)).map((line) => line.replace(/^\d+[.)]\s+/, ""));
}

export function parseLearningExercise(source: string, skill: string): LearningExercise | null {
  if (!["LISTENING", "READING", "WRITING", "SPEAKING"].includes(skill)) return null;
  const normalized = source.replace(/\r\n?/g, "\n");
  const typedSkill = skill as LearningExercise["skill"];
  const sections = sectionList(normalized);
  const shared = sectionBody(sections, "B.") || normalized;
  const activity = sectionBody(sections, "C.") || normalized;
  const sourceText = sharedText(shared);
  const blocks = questionBlocks(activity);
  const questions = blocks.map((block) => parseQuestion(block.body, block.number));
  const firstQuestion = blocks[0]?.body ?? activity;
  const sample = typedSkill === "SPEAKING"
    ? transcriptValue(shared, sourceText)
    : untilNext(firstQuestion, "Bài mẫu", ["Phân tích bài mẫu", "Checklist tự đánh giá", "Yêu cầu sửa và viết lại", "Không cấp điểm"]);
  const sampleAnalysis = untilNext(firstQuestion, "Phân tích bài mẫu bằng tiếng Việt", ["Checklist tự đánh giá", "Yêu cầu sửa và viết lại", "Không cấp điểm"])
    || untilNext(firstQuestion, "Phân tích bằng tiếng Việt", ["Checklist tự đánh giá", "Yêu cầu sửa và viết lại", "Không cấp điểm"]);
  const prompt = fieldValue(firstQuestion, "Đề viết") || fieldValue(firstQuestion, "Câu hỏi / tình huống") || sourceText;
  const writingInstructions = listAfter(firstQuestion, "Các ý cần đáp ứng", ["Bài mẫu", "Checklist tự đánh giá", "Yêu cầu sửa và viết lại"]);
  const checklist = listAfter(firstQuestion, "Checklist tự đánh giá", ["Yêu cầu sửa và viết lại", "Không cấp điểm"]);
  const strategy = fieldValue(firstQuestion, "Gợi ý triển khai ý");
  const hints = vocabularyHints(activity, firstQuestion);
  return {
    skill: typedSkill,
    durationMinutes: durationMinutes(normalized, typedSkill, questions.length),
    sourceText,
    transcript: transcriptValue(shared, sourceText),
    questions,
    prompt,
    writingInstructions,
    vocabulary: [...new Set([...hints, ...writingInstructions])],
    sample: cleanQuoted(sample),
    sampleAnalysis,
    checklist,
    preparationSeconds: secondsValue(firstQuestion, "Thời gian chuẩn bị"),
    speakingSeconds: secondsValue(firstQuestion, "Thời gian nói mục tiêu"),
    speakingQuestions: speakingQuestions(sourceText),
    strategy,
  };
}
