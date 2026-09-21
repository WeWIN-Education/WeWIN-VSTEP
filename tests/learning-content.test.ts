import { describe, expect, it } from "vitest";
import { contentTemplate, parseContentFile, validateContent } from "../src/lib/learning-content";

describe("WEWIN content import", () => {
  it("reads both templates with BOM and Windows newlines", () => {
    for (const kind of ["SKILL", "EXERCISE"] as const) {
      const items = parseContentFile("\uFEFF" + contentTemplate(kind).replace(/\n/g, "\r\n"), kind);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ kind, published: false, skill: "READING", level: "B1" });
    }
  });
  it("splits multi-lesson files and ignores their introduction", () => {
    const source = "# BỘ NỘI DUNG\nHướng dẫn\n" + contentTemplate("SKILL") + "\n---\n" + contentTemplate("SKILL").replace("BÀI 1", "BÀI 2").replace("R_LESSON_001", "R_LESSON_002");
    expect(parseContentFile(source, "SKILL").map(x => x.code)).toEqual(["R_LESSON_001", "R_LESSON_002"]);
  });
  it("rejects duplicate codes, wrong categories, placeholders and missing metadata", () => {
    const source = contentTemplate("SKILL");
    expect(() => parseContentFile(source + source, "SKILL")).toThrow("Trùng mã");
    expect(() => parseContentFile(source, "EXERCISE")).toThrow("mẫu Kỹ năng");
    expect(() => parseContentFile(contentTemplate("EXERCISE"), "SKILL")).toThrow("Mã bài");
    expect(() => parseContentFile(source.replace("READING", "OTHER"), "SKILL")).toThrow("Kỹ năng");
    expect(() => parseContentFile(source.replace("B1", "[B1 / B2]"), "SKILL")).toThrow("Mức độ");
  });
  it("bounds input and requires an explicit boolean publication flag", () => {
    const input = parseContentFile(contentTemplate("SKILL"), "SKILL")[0];
    expect(() => validateContent({ ...input, published: "false" })).toThrow("Trạng thái");
    expect(() => validateContent({ ...input, body: "x".repeat(120001) })).toThrow("120.000");
    expect(() => parseContentFile("x".repeat(2 * 1024 * 1024 + 1), "SKILL")).toThrow("2 MB");
  });
  it("keeps the document metadata aligned with edits without interpreting replacement syntax", () => {
    const input = parseContentFile(contentTemplate("SKILL"), "SKILL")[0];
    const result = validateContent({ ...input, title: "Title $&", code: "EDITED", skill: "WRITING", level: "B2" });
    expect(result.body).toContain("- Tên bài: Title $&");
    expect(result.body).toContain("- Mã bài: EDITED");
    expect(result.body).toContain("- Kỹ năng: WRITING");
    expect(result.body).toContain("- Mức độ hướng tới: B2");
  });
});
