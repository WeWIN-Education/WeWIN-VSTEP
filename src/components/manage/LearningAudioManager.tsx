"use client";

import { useState } from "react";
import { MAX_LEARNING_AUDIO_BYTES } from "@/lib/learning-audio";
import type { ContentRecord } from "@/lib/learning-content";

export function LearningAudioManager({ item, onSaved }: { item: ContentRecord; onSaved: (message: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(file?: File) {
    if (busy) return;
    setBusy(true); setMessage("");
    try {
      if (file && (!/\.mp3$/i.test(file.name) || file.size > MAX_LEARNING_AUDIO_BYTES)) throw new Error("Chọn MP3 tối đa 3 MB.");
      const response = await fetch(`/api/manage/learning-content/${item.id}/audio`, {
        method: file ? "PUT" : "DELETE",
        headers: { "If-Match": item.updatedAt, ...(file ? { "Content-Type": "audio/mpeg", "X-File-Name": encodeURIComponent(file.name) } : {}) },
        body: file,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      onSaved(result.warning || (file ? "Đã lưu MP3." : "Đã gỡ MP3."));
    } catch (error) { setMessage(error instanceof Error ? error.message : "Chưa lưu được MP3."); }
    finally { setBusy(false); }
  }
  return <details className="w-full rounded-xl border border-border p-3">
    <summary className="cursor-pointer text-sm font-semibold">MP3: {item.audioName || "Chưa có file nghe"}</summary>
    <div className="mt-3 space-y-3">
      {item.audioKey && <audio key={item.updatedAt} controls preload="none" aria-label={`Nghe ${item.title}`} className="w-full" src={`/api/learning-content/${item.id}/audio?v=${encodeURIComponent(item.updatedAt)}`} />}
      <label className="block text-sm">{item.audioKey ? "Thay MP3" : "Thêm MP3"} (tối đa 3 MB)
        <input disabled={busy} className="mt-2 block w-full text-sm" type="file" accept=".mp3,audio/mpeg" onChange={e => { const file = e.target.files?.[0]; e.target.value = ""; if (file) void save(file); }} />
      </label>
      {item.audioKey && <button type="button" disabled={busy} className="admin-action text-red-700" onClick={() => { if (window.confirm("Gỡ MP3 khỏi bài và xóa file trong kho?")) void save(); }}>Gỡ MP3</button>}
      {busy && <p role="status" className="text-sm">Đang cập nhật MP3…</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </div>
  </details>;
}
