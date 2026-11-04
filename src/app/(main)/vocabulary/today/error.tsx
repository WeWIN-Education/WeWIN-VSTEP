"use client";
import Link from "next/link";
export default function StudyError({ reset }: { reset: () => void }) {
  return <div className="mx-auto max-w-xl rounded-3xl border border-border bg-surface-card p-6"><h1 className="text-xl font-bold text-ink">Chưa tải được lộ trình</h1><p className="mt-3 text-ink-muted">Tiến độ cũ vẫn được giữ. Bạn có thể thử lại hoặc tiếp tục xem kho từ.</p><div className="mt-5 flex flex-wrap gap-3"><button type="button" className="admin-action" onClick={reset}>Thử lại</button><Link className="admin-action" href="/vocabulary/topics">Kho từ vựng</Link></div></div>;
}
