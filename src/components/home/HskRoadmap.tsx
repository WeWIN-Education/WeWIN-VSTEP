import Link from "next/link";

const LEVELS = [
  { label: "Lớp 1", char: "1", color: "bg-[#22c55e]", href: "/hsk/lop-1" },
  { label: "Lớp 2", char: "2", color: "bg-[#0B1F5C]", href: "/hsk/lop-2" },
  { label: "Lớp 3", char: "3", color: "bg-[#1D4ED8]", href: "/hsk/lop-3" },
  { label: "Lớp 4", char: "4", color: "bg-[#D4A017]", href: "/hsk/lop-4" },
  { label: "Lớp 5", char: "5", color: "bg-[#0B1F5C]", href: "/hsk/lop-5" },
  { label: "Lớp 6", char: "6", color: "bg-[#071540]", href: "/hsk/lop-6" },
  { label: "Lớp 7-9", char: "9", color: "bg-[#D4A017]", href: "/hsk" },
];

export function HskRoadmap() {
  return (
    <section className="rounded-[20px] border border-border bg-white p-5 md:p-6">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-jakarta)] text-xl font-extrabold text-brand md:text-2xl">
            Lộ trình đến khi thành thạo
          </h2>
          <p className="mt-1 text-[13px] text-ink-muted">
            Một hành trình học rõ ràng được thiết kế riêng cho bạn.
          </p>
        </div>
        <Link
          href="/hsk"
          className="text-[13px] font-semibold text-brand hover:text-accent-orange"
        >
          Xem giáo trình →
        </Link>
      </div>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        {LEVELS.map((level, index) => (
          <div key={level.label} className="flex items-center gap-3">
            <Link href={level.href} className="flex flex-col items-center gap-1.5">
              <div
                className={`flex size-14 items-center justify-center rounded-full text-lg font-bold text-white font-[family-name:var(--font-jakarta)] ${level.color}`}
              >
                {level.char}
              </div>
              <span className="text-[12px] font-semibold text-ink">{level.label}</span>
            </Link>
            {index < LEVELS.length - 1 ? (
              <div className="hidden h-px w-6 bg-border sm:block md:w-10" />
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
