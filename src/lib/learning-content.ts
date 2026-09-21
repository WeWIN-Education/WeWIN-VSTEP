export const CONTENT_KINDS = ["SKILL", "EXERCISE"] as const;
export type ContentKind = (typeof CONTENT_KINDS)[number];
export const CONTENT_SKILLS = ["LISTENING", "READING", "WRITING", "SPEAKING"] as const;
export const CONTENT_LEVELS = ["B1", "B2", "B1-B2", "C1"] as const;
export type ContentInput = {
  kind: ContentKind; code: string; title: string; skill: string; level: string; body: string; published: boolean;
};
export type ContentRecord = ContentInput & { id: string; updatedAt: string; audioKey?: string | null; audioName?: string | null };
export const MAX_CONTENT_BYTES = 2 * 1024 * 1024;

export function validateContent(value: unknown): ContentInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Nội dung không hợp lệ.");
  const v = value as Record<string, unknown>;
  const str = (key: string) => typeof v[key] === "string" ? (v[key] as string).trim() : "";
  const kind = str("kind") as ContentKind;
  const code = str("code");
  const title = str("title");
  const skill = str("skill");
  const level = str("level");
  let body = str("body");
  if (!CONTENT_KINDS.includes(kind)) throw new Error("Chọn mục Kỹ năng hoặc Bài tập.");
  if (!/^[A-Z0-9_-]{1,80}$/.test(code)) throw new Error("Mã bài gồm 1–80 chữ in hoa, số, dấu gạch ngang hoặc gạch dưới.");
  if (!title || title.length > 200) throw new Error("Tên bài cần từ 1 đến 200 ký tự.");
  if (!CONTENT_SKILLS.includes(skill as typeof CONTENT_SKILLS[number])) throw new Error("Kỹ năng không hợp lệ.");
  if (!CONTENT_LEVELS.includes(level as typeof CONTENT_LEVELS[number])) throw new Error("Mức độ không hợp lệ.");
  if (body.length < 20 || body.length > 120000) throw new Error("Nội dung cần từ 20 đến 120.000 ký tự.");
  if (typeof v.published !== "boolean") throw new Error("Trạng thái mở bài không hợp lệ.");
  const metadata = { [kind === "SKILL" ? "Mã bài" : "Mã bộ"]: code, [kind === "SKILL" ? "Tên bài" : "Tên bộ"]: title, "Kỹ năng": skill, "Mức độ hướng tới": level };
  for (const [label, value] of Object.entries(metadata)) {
    body = body.replace(new RegExp(`^- ${label}:.*$`, "m"), () => `- ${label}: ${value}`);
  }
  return { kind, code, title, skill, level, body, published: v.published };
}

/** Read the supplied WEWIN text templates; reject the whole import on a malformed section. */
export function parseContentFile(source: string, kind: ContentKind): ContentInput[] {
  if (new TextEncoder().encode(source).length > MAX_CONTENT_BYTES) throw new Error("File tối đa 2 MB.");
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const starts = [...normalized.matchAll(/^# (?:BÀI \d+\s*[—–-]|P_[A-Z0-9_]+\s*[—–-])/gm)].map(m => m.index!);
  const sections = starts.length ? starts.map((start, i) => normalized.slice(start, starts[i + 1] ?? normalized.length).trim()) : [normalized.trim()];
  if (sections.length > 100) throw new Error("Mỗi lần nhập tối đa 100 bài.");
  const seen = new Set<string>();
  return sections.map((body, i) => {
    const field = (name: string) => body.match(new RegExp(`^- ${name}:\\s*(.+)$`, "m"))?.[1]?.trim() ?? "";
    if (kind === "EXERCISE" && field("Mã bài")) throw new Error(`Bài ${i + 1}: đây là mẫu Kỹ năng, hãy đổi mục nhập.`);
    try {
      const item = validateContent({ kind, code: field(kind === "SKILL" ? "Mã bài" : "Mã bộ"), title: field(kind === "SKILL" ? "Tên bài" : "Tên bộ"), skill: field("Kỹ năng"), level: field("Mức độ hướng tới").replace(/[–—]/g, "-"), body, published: false });
      if (seen.has(item.code)) throw new Error(`Trùng mã ${item.code} trong file.`);
      seen.add(item.code);
      return item;
    } catch (error) {
      throw new Error(`Bài ${i + 1}: ${error instanceof Error ? error.message : "Không đọc được nội dung."}`);
    }
  });
}

export function contentTemplate(kind: ContentKind) {
  return `# ${kind === "SKILL" ? "BÀI 1 — Bài học mới" : "P_R001 — Bộ bài mới"}\n\n## A. Thông tin\n- ${kind === "SKILL" ? "Mã bài" : "Mã bộ"}: ${kind === "SKILL" ? "R_LESSON_001" : "P_R001"}\n- ${kind === "SKILL" ? "Tên bài" : "Tên bộ"}: Bài học mới\n- Kỹ năng: READING\n- Mức độ hướng tới: B1\n\n## B. ${kind === "SKILL" ? "Mục tiêu" : "Ngữ liệu dùng chung"}\nĐiền nội dung tại đây.\n\n## C. ${kind === "SKILL" ? "Hướng dẫn" : "Câu hỏi / hoạt động"}\nĐiền câu hỏi, đáp án và lời giải tại đây.\n`;
}
