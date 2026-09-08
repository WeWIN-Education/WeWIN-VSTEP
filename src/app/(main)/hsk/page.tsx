import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { ImageSlot } from "@/components/ui/ImageSlot";
import { getGradeLevels } from "@/lib/curriculum";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giáo trình Lớp 1–9 | WEWIN EDUCATION",
  description: "Lộ trình học tiếng Anh theo Lớp 1 đến Lớp 9.",
};

type LevelCard = {
  id: string;
  slug: string;
  level: number;
  title: string;
  description: string | null;
  topicCount: number;
  lessonCount: number;
};

const FALLBACK_LEVELS: LevelCard[] = Array.from({ length: 9 }, (_, i) => ({
  id: `fallback-${i + 1}`,
  slug: `lop-${i + 1}`,
  level: i + 1,
  title: `Lớp ${i + 1}`,
  description:
    i === 0
      ? "Từ vựng có audio, ngữ pháp tiếng Việt và hội thoại thực tế — mỗi ngày 15 phút"
      : `Nội dung Lớp ${i + 1} sẽ mở khoá khi sẵn sàng.`,
  topicCount: i === 0 ? 5 : 0,
  lessonCount: i === 0 ? 12 : 0,
}));

export default async function HskIndexPage() {
  let levels = FALLBACK_LEVELS;
  try {
    const dbLevels = await getGradeLevels();
    if (dbLevels.length) {
      levels = dbLevels.map((level) => ({
        id: level.id,
        slug: level.slug,
        level: level.level,
        title: level.title,
        description: level.description,
        topicCount: level._count.topics,
        lessonCount: level.topics.reduce((sum, t) => sum + t._count.lessons, 0),
      }));
    }
  } catch {
    // DB unavailable — show fallback roadmap
  }

  return (
    <div className="mx-auto max-w-[1100px]">
      <section className="rounded-[20px] border border-[#C5D4EE] bg-gradient-to-br from-[#EEF3FC] to-[#DDE7F8] p-6 md:p-8">
        <p className="text-[12px] font-bold tracking-wide text-brand">
          GIÁO TRÌNH
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-jakarta)] text-[28px] font-extrabold text-ink md:text-[34px]">
          Lộ trình Lớp 1–9
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ink-muted">
          Chọn cấp độ phù hợp. Mỗi lớp gồm chủ đề, bài học, từ vựng và hội thoại
          — theo dõi tiến độ rõ ràng từng bước.
        </p>
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {levels.map((level, index) => (
          <article
            key={level.id}
            className={cn(
              "flex flex-col rounded-2xl border bg-white p-5",
              index === 0 ? "border-brand shadow-sm" : "border-border",
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span
                  className={cn(
                    "inline-flex size-10 items-center justify-center rounded-full text-sm font-bold text-white",
                    index === 0 ? "bg-brand" : "bg-ink-faint",
                  )}
                >
                  {level.level}
                </span>
                <h2 className="mt-3 font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">
                  {level.title}
                </h2>
              </div>
              {index === 0 ? (
                <span className="rounded-full bg-accent-green/15 px-2 py-0.5 text-[10px] font-bold text-accent-green">
                  MIỄN PHÍ
                </span>
              ) : (
                <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-faint">
                  PREMIUM
                </span>
              )}
            </div>
            <p className="mt-2 flex-1 text-[13px] leading-relaxed text-ink-muted">
              {level.description}
            </p>
            <div className="mt-3 flex gap-4 text-[12px] text-ink-muted">
              <span>
                Tiến độ{" "}
                <strong className="text-ink">
                  0 / {level.lessonCount || "—"}
                </strong>
              </span>
              <span>
                Chủ đề{" "}
                <strong className="text-ink">{level.topicCount || "—"}</strong>
              </span>
            </div>
            <Link href={`/hsk/${level.slug}`} className="mt-4 block">
              <Button className="w-full" variant={index === 0 ? "primary" : "outline"}>
                {level.level === 1 ? "Bắt đầu học" : "Xem cấp độ"}
              </Button>
            </Link>
          </article>
        ))}
      </div>

      <div className="mt-8">
        <ImageSlot label="Infographic lộ trình Lớp 1–9" className="min-h-[140px]" />
      </div>

      <SiteFooter />
    </div>
  );
}
