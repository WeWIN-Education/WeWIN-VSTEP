import { fetchTranscript, type TranscriptResult } from "youtube-transcript-plus";
import type { VideoQuestion, VideoTranscript } from "@/lib/video-config";
import { addMissingEnds, formatTimestamp, normalizeTranscript, parseTranscriptText } from "@/lib/video-transcript";

export function youtubeIdFromUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (!/(^|\.)youtube\.com$|(^|\.)youtu\.be$/.test(url.hostname)) return null;
    const id = url.hostname === "youtu.be" ? url.pathname.slice(1) : url.searchParams.get("v") || url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/)?.[1];
    return id && /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch {
    return null;
  }
}

export function durationLabel(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = safe % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}` : `${minutes}:${String(remainder).padStart(2, "0")}`;
}

export async function fetchYoutubeSource(youtubeId: string) {
  const result = await fetchTranscript(youtubeId, { videoDetails: true, lang: "en" });
  const { videoDetails, segments } = result as TranscriptResult;
  const transcript: VideoTranscript[] = addMissingEnds(segments.map((item, index) => ({ id: `yt${index + 1}`, start: formatTimestamp(item.offset), startSeconds: item.offset, endSeconds: item.offset + item.duration, en: item.text.trim(), vi: "" })));
  return { transcript, title: videoDetails.title, duration: durationLabel(videoDetails.lengthSeconds) };
}

function parseModelJson(value: string) {
  const cleaned = value.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(cleaned) as { segments?: unknown; questions?: unknown };
}

function validQuestions(value: unknown): VideoQuestion[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const options = Array.isArray(row.options) ? row.options.filter((option): option is string => typeof option === "string").slice(0, 4) : [];
    const correctIndex = Number(row.correctIndex);
    const atSeconds = Number(row.atSeconds);
    if (typeof row.prompt !== "string" || options.length < 2 || !Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length || !Number.isFinite(atSeconds)) return [];
    return [{ id: typeof row.id === "string" ? row.id : `q-${index + 1}`, atSeconds, prompt: row.prompt.trim(), options, correctIndex }];
  });
}

/** Enrichment is optional when no AI key is configured; the admin can still edit and publish the source transcript. */
export async function enrichVideoTranscript(transcript: VideoTranscript[], dialect = "en-US") {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key || !transcript.length) return { transcript, questions: [] as VideoQuestion[] };
  const source = transcript.map(({ id, startSeconds, en }) => ({ id, startSeconds, en })).slice(0, 300);
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: process.env.OPENAI_VIDEO_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Bạn là biên tập viên học liệu luyện thi VSTEP. Trả về đúng JSON, không markdown. Giữ nguyên id, startSeconds và en. Tạo IPA, bản dịch tiếng Việt tự nhiên và tối đa 3 câu hỏi trắc nghiệm kiểm tra nghe hiểu. Không bịa thêm lời thoại." },
        { role: "user", content: JSON.stringify({ dialect, segments: source, output: { segments: "[{id,startSeconds,en,ipa,vi}]", questions: "[{id,atSeconds,prompt,options,correctIndex}]" } }) },
      ],
    }),
  });
  if (!response.ok) throw new Error("AI không tạo được nội dung bổ trợ.");
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI trả về nội dung rỗng.");
  const generated = parseModelJson(content);
  const generatedSegments = normalizeTranscript(generated.segments);
  const byId = new Map(generatedSegments.map((item) => [item.id, item]));
  const enriched = transcript.map((item) => {
    const generatedItem = byId.get(item.id);
    return generatedItem ? { ...item, ...(item.ipa ? {} : generatedItem.ipa ? { ipa: generatedItem.ipa } : {}), vi: item.vi || generatedItem.vi || "" } : item;
  });
  return { transcript: enriched, questions: validQuestions(generated.questions) };
}

export function transcriptFromSource(source: string) {
  return parseTranscriptText(source);
}
