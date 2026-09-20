export default function Loading() {
  return <section aria-busy="true" aria-label="Đang tải nội dung" className="mx-auto w-full max-w-[1180px] space-y-5">
    <p role="status" className="text-sm font-semibold text-brand">Đang tải nội dung…</p>
    <div aria-hidden="true" className="space-y-5 motion-safe:animate-pulse">
      <div className="rounded-3xl border border-border bg-white p-6"><div className="h-7 w-2/3 rounded-lg bg-brand-soft" /><div className="mt-4 h-4 w-1/2 rounded bg-surface" /></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map(index => <div key={index} className="h-40 rounded-2xl border border-border bg-white" />)}</div>
    </div>
  </section>;
}
