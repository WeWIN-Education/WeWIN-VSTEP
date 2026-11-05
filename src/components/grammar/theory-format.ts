/** Keep imported wording intact; only divide it into smaller reading blocks. */
export function theorySentences(body: string) {
  const sentences: string[] = [];
  for (const { segment } of new Intl.Segmenter("vi", { granularity: "sentence" }).segment(body)) {
    const text = segment.trim();
    if (!text) continue;
    // “Look! và Keep silent! thường...” is one rule, not three fragments.
    if (sentences.length && /^\p{Ll}/u.test(text)) sentences[sentences.length - 1] += ` ${text}`;
    else sentences.push(text);
  }
  return sentences;
}

export function examplePair(example: string) {
  const parts = example.split("→").map(part => part.trim());
  return parts.length === 2 && parts.every(Boolean) ? { before: parts[0], after: parts[1] } : null;
}
