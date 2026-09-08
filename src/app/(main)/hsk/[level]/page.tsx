import { LevelCurriculumExplorer } from "@/components/curriculum/LevelCurriculumExplorer";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { ImageSlot } from "@/components/ui/ImageSlot";
import {
  getGradeLevelBySlug,
  getGradeLevels,
} from "@/lib/curriculum";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ level: string }>;
};

export async function generateMetadata({ params }: Props) {
  const { level } = await params;
  const data = await getGradeLevelBySlug(level);
  if (!data) return { title: "Giáo trình | WEWIN" };
  return {
    title: `${data.title} | WEWIN EDUCATION`,
    description: data.description ?? undefined,
  };
}

export default async function GradeLevelPage({ params }: Props) {
  const { level } = await params;
  const [data, allLevels] = await Promise.all([
    getGradeLevelBySlug(level),
    getGradeLevels(),
  ]);

  if (!data) notFound();

  const lessonTotal = data.topics.reduce(
    (sum, t) => sum + t.lessons.length,
    0,
  );
  const firstLesson = data.topics[0]?.lessons[0];

  return (
    <div className="mx-auto max-w-[1100px]">
      <section className="grid gap-4 rounded-[20px] border border-border bg-white p-5 md:grid-cols-[1.2fr_320px] md:p-6">
        <div>
          <h1 className="font-[family-name:var(--font-jakarta)] text-2xl font-extrabold text-ink md:text-[28px]">
            Bài học {data.title}
          </h1>
          <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-ink-muted">
            {data.description ||
              "Từ vựng có audio, ngữ pháp tiếng Việt và hội thoại thực tế — mỗi ngày 15 phút."}
          </p>
          <div className="mt-4 max-w-xs">
            <ImageSlot label="Minh họa giáo trình" className="min-h-[120px]" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex size-20 items-center justify-center rounded-full border-4 border-brand/20">
              <span className="text-lg font-extrabold text-brand">0%</span>
            </div>
            <div className="text-[13px]">
              <p className="font-semibold text-ink">Tiến độ {data.title}</p>
              <p className="mt-1 text-ink-muted">
                Bài học{" "}
                <span className="font-semibold text-ink">0 / {lessonTotal}</span>
              </p>
              <p className="text-ink-muted">
                Chủ đề{" "}
                <span className="font-semibold text-ink">
                  0 / {data.topics.length}
                </span>
              </p>
            </div>
          </div>
          {firstLesson ? (
            <Link
              href={`/hsk/${data.slug}/${firstLesson.slug}`}
              className="mt-4 block"
            >
              <Button className="w-full" size="lg">
                BẮT ĐẦU HỌC
              </Button>
            </Link>
          ) : (
            <Button className="mt-4 w-full" size="lg" disabled>
              Sắp ra mắt
            </Button>
          )}
        </div>
      </section>

      <div className="mt-4 flex flex-wrap gap-2">
        {allLevels.map((item) => {
          const active = item.slug === data.slug;
          return (
            <Link
              key={item.id}
              href={`/hsk/${item.slug}`}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors",
                active
                  ? "border-brand bg-brand text-white"
                  : "border-border bg-white text-ink hover:border-brand/40",
              )}
            >
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-bold",
                  active ? "bg-white/20 text-white" : "bg-brand-soft text-brand",
                )}
              >
                {item.level}
              </span>
              {item.title}
            </Link>
          );
        })}
      </div>

      <LevelCurriculumExplorer
        levelSlug={data.slug}
        levelTitle={data.title}
        topics={data.topics}
      />

      <SiteFooter />
    </div>
  );
}
