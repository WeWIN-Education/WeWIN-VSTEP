import { getCurrentUser } from "@/lib/access";
import { formatTimestamp } from "@/lib/video-transcript";
import { isSameOrigin } from "@/lib/request-security";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "Yêu cầu không hợp lệ." }, { status: 403 });
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "Chỉ quản trị viên được xử lý âm thanh." }, { status: 403 });
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Chưa cấu hình khóa AI để nhận dạng âm thanh." }, { status: 503 });
  try {
    const data = await request.formData();
    const file = data.get("file");
    if (!(file instanceof File) || !file.size || file.size > MAX_AUDIO_BYTES) return NextResponse.json({ error: "Chọn tệp âm thanh không quá 25 MB." }, { status: 400 });
    const form = new FormData();
    form.append("file", file, file.name || "video-audio");
    form.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL?.trim() || "whisper-1");
    form.append("language", "en");
    form.append("response_format", "verbose_json");
    form.append("timestamp_granularities[]", "segment");
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", { method: "POST", headers: { Authorization: `Bearer ${key}` }, body: form });
    if (!response.ok) return NextResponse.json({ error: "AI không nhận dạng được tệp âm thanh." }, { status: 502 });
    const payload = await response.json() as { segments?: Array<{ start?: number; end?: number; text?: string }> };
    const transcript = (payload.segments || []).flatMap((item, index) => {
      const startSeconds = Number(item.start);
      const endSeconds = Number(item.end);
      const en = typeof item.text === "string" ? item.text.trim() : "";
      if (!en || !Number.isFinite(startSeconds)) return [];
      return [{ id: `audio${index + 1}`, start: formatTimestamp(startSeconds), startSeconds, ...(Number.isFinite(endSeconds) ? { endSeconds } : {}), en, vi: "" }];
    });
    if (!transcript.length) return NextResponse.json({ error: "AI không trả về câu thoại có mốc thời gian." }, { status: 422 });
    return NextResponse.json({ transcript });
  } catch {
    return NextResponse.json({ error: "Không thể xử lý tệp âm thanh." }, { status: 400 });
  }
}
