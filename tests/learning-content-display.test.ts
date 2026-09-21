import { expect, it } from "vitest";
import { learningDisplayBlocks, learningDisplaySource } from "../src/lib/learning-content-display";

it("hides import metadata and audio paths but retains lesson instructions", () => {
  const text = learningDisplaySource("# BÀI 2\n## A. Thông tin bài học\n- Mã bài: TEST\n- Người duyệt: QTV\n## B. Mục tiêu\n1. Nghe ý chính\n## D. Ví dụ\nFile audio mẫu:\n\n[audio/skills/test.mp3]\nNội dung cần học\n## G. Nguồn và quyền sử dụng\nNội bộ");
  expect(text).not.toMatch(/QTV|Mã bài|audio\/|Nội bộ|# BÀI/);
  expect(text).toContain("## Mục tiêu"); expect(text).toContain("Nghe ý chính"); expect(text).toContain("Nội dung cần học");
});
it("keeps answers separate without swallowing the following section", () => {
  const blocks = learningDisplayBlocks("## C. Câu hỏi\n### Q001\n- Dạng: SINGLE_CHOICE\n- Yêu cầu hiển thị: Question?\nA. One\nĐáp án đúng: A\nGiải thích tiếng Việt: Vì đúng\n## D. Tự kiểm tra\n- Tự sửa lỗi");
  expect(blocks[1].content).toContain("### Câu 1");
  expect(blocks[1].content).not.toContain("SINGLE_CHOICE");
  expect(blocks[1].answer).toContain("Vì đúng");
  expect(blocks[1].answer).not.toContain("Tự kiểm tra");
  expect(blocks[2].content).toContain("Tự sửa lỗi");
});
