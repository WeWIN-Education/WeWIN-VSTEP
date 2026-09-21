/** Remove import-only fields without changing the saved source document. */
export function learningDisplaySource(source: string) {
  let hiddenSection = false;
  let skipAudioPath = false;
  const output: string[] = [];
  for (const line of source.replace(/\r\n?/g, "\n").split("\n")) {
    const section = /^##\s+(?:[A-Z]\.\s*)?(.+)$/.exec(line);
    if (section) {
      hiddenSection = /^(Thông tin (?:bài học|bộ)|Nguồn và quyền sử dụng|Thông tin phát hành)/i.test(section[1]);
      if (!hiddenSection) output.push(`## ${section[1]}`);
      continue;
    }
    if (hiddenSection || /^#\s/.test(line) || /^\s*---\s*$/.test(line)) continue;
    if (/^(?:-\s*)?File audio(?: mẫu)?:/i.test(line)) { skipAudioPath = true; continue; }
    if (skipAudioPath) {
      if (!line.trim()) continue;
      skipAudioPath = false;
      if (/^\[?audio\//.test(line.trim())) continue;
    }
    if (/^- (?:Mã ngữ liệu(?: liên quan)?|Thứ tự|Dạng|Nguồn và quyền sử dụng):/.test(line)) continue;
    if (/^- Transcript: (?:Đoạn .+ ở trên\.|Không áp dụng\.)$/.test(line)) continue;
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
