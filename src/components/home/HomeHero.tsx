import { Button } from "@/components/ui/Button";
import Image from "next/image";
import Link from "next/link";

export function HomeHero() {
  return (
    <section className="relative overflow-hidden rounded-[20px] border border-[#C5D4EE] bg-gradient-to-br from-[#EEF3FC] via-[#E0E9F8] to-[#D0DCF5] p-5 md:p-7">
      <div className="relative z-10 max-w-xl">
        <h2 className="font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold leading-tight text-brand md:text-[34px]">
          Nâng cao mỗi ngày
          <br />
          <span className="text-ink">Tiến bộ không ngừng!</span>
        </h2>
        <p className="mt-3 max-w-md text-[14px] leading-relaxed text-ink-muted">
          Học tiếng Anh mỗi ngày giúp bạn mở ra những cơ hội mới.
        </p>
        <Link href="/beginner" className="mt-5 inline-block">
          <Button size="lg" className="px-6">
            BẮT ĐẦU HỌC NGAY →
          </Button>
        </Link>
      </div>
      <div className="pointer-events-none absolute right-3 bottom-3 top-3 hidden w-[38%] md:block">
        <div className="relative h-full min-h-[180px]">
          <Image
            src="/brand/mascot-right-clear.png"
            alt="WEWIN mascot"
            fill
            className="object-contain object-bottom"
            sizes="(max-width: 768px) 0px, 38vw"
            priority
          />
        </div>
      </div>
    </section>
  );
}
