import type { VideoTranscript } from "@/lib/video-config";

export function parseTimestamp(value: string) {
  const normalized = value.trim().replace(",", ".");
  const parts = normalized.split(":").map(Number);
  if (parts.some((part) => !Number.isFinite(part))) return -1;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts.length === 1 ? parts[0] : -1;
}

export function formatTimestamp(seconds: number) {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
}

function segment(id: string, startSeconds: number, endSeconds: number | undefined, en: string, ipa = "", vi = ""): VideoTranscript {
  return { id, start: formatTimestamp(startSeconds), startSeconds, ...(endSeconds !== undefined ? { endSeconds } : {}), en: en.trim(), vi: vi.trim(), ...(ipa.trim() ? { ipa: ipa.trim() } : {}) };
}

function cueText(lines: string[]) {
  const values: Record<"en" | "ipa" | "vi", string[]> = { en: [], ipa: [], vi: [] };
  let field: "en" | "ipa" | "vi" = "en";
  let labeled = false;
  for (const raw of lines) {
    const line = raw.replace(/<[^>]+>/g, "").trim();
    const label = line.match(/^(EN|ENGLISH|IPA|VI|VN|VIETNAMESE)\s*:\s*(.*)$/i);
    if (label) {
      labeled = true;
      field = /^(IPA)$/i.test(label[1]) ? "ipa" : /^(VI|VN|VIETNAMESE)$/i.test(label[1]) ? "vi" : "en";
      if (label[2]) values[field].push(label[2]);
      continue;
    }
    values[field].push(line);
  }
  return { labeled, en: values.en.join(" ").trim(), ipa: labeled ? values.ipa.join(" ").trim() : "", vi: labeled ? values.vi.join(" ").trim() : "" };
}

/** Accepts SRT, WebVTT, or one plain English sentence per line. */
export function parseTranscriptText(source: string): VideoTranscript[] {
  const text = source.replace(/^\uFEFF/, "").replace(/\r/g, "").trim();
  if (!text) return [];
  const blocks = text.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  const timed: VideoTranscript[] = [];
  for (const [index, block] of blocks.entries()) {
    const lines = block.split("\n").map((line) => line.trim()).filter(Boolean);
    const timingIndex = lines.findIndex((line) => line.includes("-->") || /^\[?\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?\]?\s+/.test(line));
    if (timingIndex < 0) continue;
    const timing = lines[timingIndex];
    const match = timing.match(/\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)\]?\s*(?:-->\s*\[?(\d{1,2}:\d{2}(?::\d{2})?(?:[.,]\d+)?)\]?)?/);
    if (!match) continue;
    const startSeconds = parseTimestamp(match[1]);
    if (startSeconds < 0) continue;
    const endSeconds = match[2] ? parseTimestamp(match[2]) : undefined;
    const cue = cueText(lines.slice(timingIndex + 1));
    if (cue.en) timed.push(segment(`v${index + 1}`, startSeconds, endSeconds, cue.en, cue.ipa, cue.vi));
  }
  if (timed.length) return addMissingEnds(timed);
  return text.split("\n").map((line) => line.replace(/^[-*]\s+/, "").trim()).filter(Boolean).map((en, index) => segment(`v${index + 1}`, -1, undefined, en));
}

export function addMissingEnds(items: VideoTranscript[], duration?: number) {
  return items.map((item, index) => ({
    ...item,
    ...(item.endSeconds !== undefined ? { endSeconds: item.endSeconds } : items[index + 1]?.startSeconds !== undefined && items[index + 1].startSeconds >= 0 ? { endSeconds: items[index + 1].startSeconds } : duration !== undefined ? { endSeconds: duration } : {}),
  }));
}

export function normalizeTranscript(value: unknown): VideoTranscript[] {
  if (!Array.isArray(value)) return [];
  const parsed = value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const en = typeof row.en === "string" ? row.en.trim() : "";
    const startSeconds = typeof row.startSeconds === "number" ? row.startSeconds : typeof row.start === "string" ? parseTimestamp(row.start) : -1;
    if (!en) return [];
    const endSeconds = typeof row.endSeconds === "number" ? row.endSeconds : undefined;
    return [{ id: typeof row.id === "string" ? row.id : `v${index + 1}`, start: startSeconds >= 0 ? formatTimestamp(startSeconds) : "—", startSeconds, ...(endSeconds !== undefined ? { endSeconds } : {}), en, vi: typeof row.vi === "string" ? row.vi : "", ...(typeof row.ipa === "string" && row.ipa ? { ipa: row.ipa } : {}) }];
  });
  return addMissingEnds(parsed);
}
