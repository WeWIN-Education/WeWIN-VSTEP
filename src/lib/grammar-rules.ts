export const QUESTION_TYPES = ["MCQ", "BINARY_CHOICE", "FILL_BLANK", "PASSAGE_CLOZE", "ERROR_CORRECTION", "WORD_ORDER", "SENTENCE_REWRITE"] as const;
export type QuestionType = typeof QUESTION_TYPES[number];
export type GrammarQuestion = {
  id: string; type: QuestionType; prompt: string; source: string; explanation: string;
  options?: { id: string; text: string }[];
  blanks?: { id: string; label: string; accepted: string[] }[];
  tokens?: { id: string; text: string }[];
  errorTokens?: string[]; errorIndexes?: number[];
  starter?: string; accepted?: string[]; correctOption?: string;
  ignoreCase?: boolean; ignoreFinalPunctuation?: boolean;
};
export type GrammarSet = { id: string; title: string; required: boolean; questions: GrammarQuestion[] };
export type GrammarContent = {
  slug: string; number: number; title: string; summary: string;
  source: { file: string; sha256: string; note: string };
  theory: { title: string; body: string; examples: string[] }[];
  sets: GrammarSet[];
};
export type PublicQuestion = Omit<GrammarQuestion, "accepted" | "correctOption" | "errorIndexes" | "explanation" | "blanks"> & { blanks?: { id: string; label: string }[] };
export type GrammarAnswer = string | { blanks: Record<string, string> } | { indexes: number[]; correction: string } | { tokenIds: string[] };
export type GrammarResult = { correct: number; total: number; passed: boolean; details: { id: string; correct: number; total: number; expected: string; explanation: string }[] };

export class GrammarError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
const fail = (message: string): never => { throw new GrammarError(message); };
const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : fail("Nội dung phải là một đối tượng.");
function text(value: unknown, label: string, max = 1000) {
  if (typeof value !== "string" || !value.trim() || value.length > max) fail(`${label}: thiếu nội dung hoặc vượt ${max} ký tự.`);
  return (value as string).trim().normalize("NFC");
}
function id(value: unknown) {
  const result = text(value, "Mã", 80);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result)) fail("Mã chỉ gồm chữ thường, số và dấu gạch nối.");
  return result;
}
function list(value: unknown, label: string, max: number): unknown[] {
  if (!Array.isArray(value) || !value.length || value.length > max) fail(`${label}: cần từ 1 đến ${max} mục.`);
  return value as unknown[];
}
function unique(values: string[]) {
  if (new Set(values).size !== values.length) fail("Có mã bị trùng trong nội dung.");
}
const accepted = (value: unknown) => list(value, "Đáp án", 64).map(v => text(v, "Đáp án", 500));

// Content is a strict, bounded format. Patterns are expanded and approved by the editor, never at submission time.
export function validateGrammarContent(value: unknown): GrammarContent {
  const input = object(value), source = object(input.source);
  if (!Number.isInteger(input.number) || Number(input.number) < 1 || Number(input.number) > 40) fail("Số chuyên đề phải từ 1 đến 40.");
  const checksum = text(source.sha256, "Checksum", 64);
  if (!/^[a-f0-9]{64}$/.test(checksum)) fail("Checksum nguồn phải là SHA-256.");
  const sets = list(input.sets, "Bài luyện", 6).map(value => {
    const set = object(value);
    if (typeof set.required !== "boolean") fail("Bài luyện phải xác định có bắt buộc hay không.");
    const questions = list(set.questions, "Câu hỏi", 15).map(value => {
      const q = object(value);
      if (!QUESTION_TYPES.includes(q.type as QuestionType)) fail("Dạng câu hỏi chưa được hỗ trợ.");
      const result: GrammarQuestion = { id: id(q.id), type: q.type as QuestionType, prompt: text(q.prompt, "Đề bài", 3000), source: text(q.source, "Vị trí nguồn", 300), explanation: text(q.explanation, "Giải thích", 2000) };
      for (const flag of ["ignoreCase", "ignoreFinalPunctuation"] as const) {
        if (q[flag] !== undefined && typeof q[flag] !== "boolean") fail("Quy tắc chuẩn hóa không hợp lệ.");
        if (typeof q[flag] === "boolean") result[flag] = q[flag];
      }
      if (result.type === "MCQ" || result.type === "BINARY_CHOICE") {
        result.options = list(q.options, "Lựa chọn", 6).map(v => { const option = object(v); return { id: id(option.id), text: text(option.text, "Lựa chọn", 500) }; });
        if (result.options.length < 2 || (result.type === "BINARY_CHOICE" && result.options.length !== 2)) fail("Số lựa chọn không đúng với dạng câu hỏi.");
        unique(result.options.map(v => v.id));
        result.correctOption = id(q.correctOption);
        if (!result.options.some(v => v.id === result.correctOption)) fail("Đáp án không nằm trong lựa chọn.");
      } else if (result.type === "PASSAGE_CLOZE") {
        result.blanks = list(q.blanks, "Ô trống", 10).map(v => { const blank = object(v); return { id: id(blank.id), label: text(blank.label, "Tên ô trống", 100), accepted: accepted(blank.accepted) }; });
        unique(result.blanks.map(v => v.id));
        const placeholders = Array.from(result.prompt.matchAll(/\{\{([a-z0-9-]+)\}\}/g), match => match[1]);
        if (placeholders.length !== result.blanks.length || result.blanks.some(v => placeholders.filter(p => p === v.id).length !== 1)) fail("Ô trống trong đoạn văn không khớp dữ liệu.");
      } else {
        result.accepted = accepted(q.accepted);
        if (result.type === "ERROR_CORRECTION") {
          result.errorTokens = list(q.errorTokens, "Từ trong câu", 100).map(v => text(v, "Từ", 100));
          if (!Array.isArray(q.errorIndexes) || !q.errorIndexes.length || q.errorIndexes.some(v => !Number.isInteger(v) || v < 0 || v >= result.errorTokens!.length) || new Set(q.errorIndexes).size !== q.errorIndexes.length) fail("Vị trí lỗi không hợp lệ.");
          result.errorIndexes = [...(q.errorIndexes as number[])].sort((a, b) => a - b);
        }
        if (result.type === "WORD_ORDER") {
          result.tokens = list(q.tokens, "Thẻ từ", 100).map(v => { const token = object(v); return { id: id(token.id), text: text(token.text, "Thẻ từ", 100) }; });
          unique(result.tokens.map(v => v.id));
        }
        if (result.type === "SENTENCE_REWRITE" && q.starter !== undefined) result.starter = text(q.starter, "Đầu câu", 150);
      }
      return result;
    });
    return { id: id(set.id), title: text(set.title, "Tên bài", 150), required: set.required as boolean, questions };
  });
  unique(sets.map(s => s.id)); unique(sets.flatMap(s => s.questions.map(q => q.id)));
  if (!sets.some(s => s.required)) fail("Cần ít nhất một bài bắt buộc.");
  if (sets.some(s => s.questions.reduce((n, q) => n + (q.blanks?.length ?? 1), 0) > 20)) fail("Mỗi bài tối đa 20 đơn vị chấm.");
  return { slug: id(input.slug), number: Number(input.number), title: text(input.title, "Tên chuyên đề", 150), summary: text(input.summary, "Mô tả", 500), source: { file: text(source.file, "Tệp nguồn", 500), sha256: checksum, note: text(source.note, "Ghi chú biên soạn", 1000) },
    theory: list(input.theory, "Lý thuyết", 10).map(v => { const section = object(v); return { title: text(section.title, "Tên mục", 150), body: text(section.body, "Lý thuyết", 3000), examples: list(section.examples, "Ví dụ", 8).map(v => text(v, "Ví dụ", 500)) }; }), sets };
}

export function publicQuestion(q: GrammarQuestion): PublicQuestion {
  return { id: q.id, type: q.type, prompt: q.prompt, source: q.source,
    ...(q.options ? { options: q.options } : {}), ...(q.tokens ? { tokens: q.tokens } : {}),
    ...(q.errorTokens ? { errorTokens: q.errorTokens } : {}), ...(q.starter ? { starter: q.starter } : {}),
    ...(q.blanks ? { blanks: q.blanks.map(({ id, label }) => ({ id, label })) } : {}) };
}

function normalized(value: string, q: GrammarQuestion) {
  let result = value.normalize("NFC").replace(/[’‘]/g, "'").trim().replace(/\s+/g, " ");
  if (q.ignoreCase) result = result.toLowerCase();
  if (q.ignoreFinalPunctuation) result = result.replace(/[.!?]+$/, "").trim();
  return result;
}
function match(value: string, variants: string[], q: GrammarQuestion) {
  if (!value.trim()) return false;
  return variants.some(answer => normalized(answer, q) === normalized(value, q));
}
function answerText(value: unknown): string {
  if (typeof value !== "string" || value.length > 500) fail("Câu trả lời phải là văn bản, tối đa 500 ký tự.");
  return value as string;
}
export function gradeQuestion(q: GrammarQuestion, answer: unknown) {
  let correct = 0, total = 1, expected = q.accepted?.[0] ?? "";
  if (q.type === "MCQ" || q.type === "BINARY_CHOICE") {
    const value = answerText(answer);
    if (value && !q.options!.some(o => o.id === value)) fail("Lựa chọn không hợp lệ.");
    correct = Number(value === q.correctOption); expected = q.options!.find(o => o.id === q.correctOption)!.text;
  } else if (q.type === "PASSAGE_CLOZE") {
    const blanks = object(object(answer).blanks);
    if (Object.keys(blanks).some(key => !q.blanks!.some(b => b.id === key))) fail("Ô trống không thuộc câu hỏi.");
    total = q.blanks!.length;
    for (const blank of q.blanks!) correct += Number(match(answerText(blanks[blank.id] ?? ""), blank.accepted, q));
    expected = q.blanks!.map(b => `${b.label}: ${b.accepted[0]}`).join("; ");
  } else if (q.type === "ERROR_CORRECTION") {
    const value = object(answer), indexes = value.indexes;
    if (!Array.isArray(indexes) || indexes.length > 100 || indexes.some(i => !Number.isInteger(i) || i < 0 || i >= q.errorTokens!.length) || new Set(indexes).size !== indexes.length) fail("Vị trí sửa lỗi không hợp lệ.");
    const same = [...(indexes as number[])].sort((a, b) => a - b).join(",") === q.errorIndexes!.join(",");
    const correction = answerText(value.correction);
    correct = Number(same && match(correction, q.accepted!, q));
    expected = `${q.errorIndexes!.map(i => q.errorTokens![i]).join(" ")} → ${expected}`;
  } else if (q.type === "WORD_ORDER") {
    const ids = object(answer).tokenIds;
    if (!Array.isArray(ids) || ids.length > q.tokens!.length || new Set(ids).size !== ids.length || ids.some(i => typeof i !== "string" || !q.tokens!.some(t => t.id === i))) fail("Thẻ từ không hợp lệ hoặc bị dùng nhiều lần.");
    const tokenIds = ids as string[];
    correct = Number(tokenIds.length === q.tokens!.length && match(tokenIds.map(i => q.tokens!.find(t => t.id === i)!.text).join(" "), q.accepted!, q));
  } else {
    const value = answerText(answer);
    const whole = q.starter && !normalized(value, q).startsWith(normalized(q.starter, q)) ? `${q.starter} ${value}` : value;
    correct = Number(match(whole, q.accepted!, q));
  }
  return { id: q.id, correct, total, expected, explanation: q.explanation };
}
export function gradeSet(questions: GrammarQuestion[], answers: Record<string, unknown>): GrammarResult {
  if (Object.keys(answers).length !== questions.length || questions.some(q => !Object.hasOwn(answers, q.id))) fail("Câu trả lời không khớp bài đang làm.");
  const filled = (value: unknown): boolean => typeof value === "string" ? Boolean(value.trim()) : Array.isArray(value) ? value.length > 0 : Boolean(value && typeof value === "object" && Object.values(value).some(filled));
  if (!Object.values(answers).some(filled)) fail("Hãy trả lời trước khi nộp bài.");
  const details = questions.map(q => gradeQuestion(q, answers[q.id]));
  const correct = details.reduce((n, d) => n + d.correct, 0), total = details.reduce((n, d) => n + d.total, 0);
  return { correct, total, passed: total > 0 && correct * 100 >= total * 80, details };
}
