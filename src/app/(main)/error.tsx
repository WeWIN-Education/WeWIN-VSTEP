"use client";

export default function PageError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section role="alert" className="mx-auto max-w-xl rounded-3xl border border-border bg-white p-6">
    <h1 className="text-xl font-extrabold text-ink">Chưa tải được nội dung</h1>
    <p className="mt-3 text-sm leading-relaxed text-ink-muted">Máy chủ đang gặp sự cố tạm thời. Bạn có thể thử lại hoặc chọn mục khác trên thanh điều hướng.</p>
    <button type="button" onClick={reset} className="mt-5 min-h-11 rounded-xl bg-brand px-5 text-sm font-bold text-white">Thử tải lại</button>
  </section>;
}
