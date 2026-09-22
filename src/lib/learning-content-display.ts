/** Remove import-only fields without changing the saved source document. */
export function learningDisplaySource(source: string) {
  let hiddenSection = false;
  let skipTechnicalContinuation = false;
  const output: string[] = [];
  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const section = /^##\s+(?:[A-Z]\.\s*)?(.+)$/.exec(line);
    if (section) {
      hiddenSection = /^(Thông tin(?: bài học| bộ)?|Nguồn và quyền sử dụng|Thông tin phát hành)/i.test(section[1]);
      if (!hiddenSection) output.push(`## ${section[1]}`);
      continue;
    }
    if (hiddenSection || /^#\s/.test(line) || /^\s*---\s*$/.test(line)) continue;
    if (/^(?:-\s*)?(?:File audio(?: mẫu)?|Audio(?: mẫu)?):/i.test(line)) { skipTechnicalContinuation = true; continue; }
    if (skipTechnicalContinuation) {
      if (!line.trim()) continue;
      skipTechnicalContinuation = false;
      if (/^(?:\[?audio\/|https?:\/\/|.*audio-manifest)/i.test(line.trim())) continue;
    }
    if (/^\s*-?\s*(?:Mã ngữ liệu(?: liên quan)?|Mã bài|Mã bộ|Tên bài|Tên bộ|Thứ tự|Dạng|File audio(?: mẫu)?|Audio(?: mẫu)?|Transcript(?: bài mẫu| tương ứng)?|Nguồn và quyền sử dụng|Nguồn|URL nguồn|Trang hoặc mục được sử dụng|Quyền sử dụng(?: và phân phối trên website)?|Bằng chứng|Người biên soạn|Người duyệt|Trạng thái(?: phát hành)?|Phân loại|Yêu cầu QA|Không cấp điểm[^:]*):/i.test(line)) continue;
    if (/^\s*(?:\[?audio\/|audio-manifest\b|https?:\/\/.*\.(?:mp3|wav|m4a)(?:\?.*)?)\s*\]?\s*$/i.test(line.trim())) continue;
    output.push(line.replace(/^- Yêu cầu hiển thị:\s*/, "").replace(/^### Q0*(\d+)\s*$/, "### Câu $1"));
  }
  return output.join("\n").trim();
}

export function learningDisplayBlocks(source: string) {
  return learningDisplaySource(source).split(/(?=^#{2,3} )/m).filter(s => s.trim()).map(block => {
    const index = block.search(/^(?:Đáp án đúng:|Bài mẫu:|Transcript bài mẫu:)/m);
    return { content: index < 0 ? block : block.slice(0, index), answer: index < 0 ? null : block.slice(index) };
  });
}
