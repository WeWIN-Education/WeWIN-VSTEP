import { Card } from "@/components/ui/Card";
import { SectionTitle } from "@/components/ui/SectionTitle";
import Image from "next/image";
import Link from "next/link";

const LESSONS = [
  {
    title: "Từ vựng",
    subtitle: "Từ vựng theo chủ đề",
    href: "/vocab/topics",
    badge: "Từ vựng",
    badgeClass: "bg-[#e8f8ee] text-[#15803d]",
    mascot: "/brand/mascot-left-clear.png",
  },
  {
    title: "Ngữ pháp",
    subtitle: "Cấu trúc câu tiếng Anh",
    href: "/grammar",
    badge: "Ngữ pháp",
    badgeClass: "bg-[#fff4e5] text-[#c2410c]",
    mascot: "/brand/mascot-right-clear.png",
  },
  {
    title: "Luyện nghe",
    subtitle: "Hội thoại thực tế",
    href: "/listening",
    badge: "Nghe",
    badgeClass: "bg-[#eef2ff] text-[#4338ca]",
    mascot: "/brand/mascot-left-clear.png",
  },
  {
    title: "Luyện nói",
    subtitle: "Phát âm chuẩn",
    href: "/speaking",
    badge: "Nói",
    badgeClass: "bg-[#fce7f3] text-[#be185d]",
    mascot: "/brand/mascot-right-clear.png",
  },
];

export function RecommendedLessons() {
  return (
    <section>
      <SectionTitle
        title="Bài học đề xuất cho bạn"
        action={
          <Link href="/hsk" className="text-[12px] font-semibold text-brand hover:underline">
            Xem tất cả
          </Link>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {LESSONS.map((lesson) => (
          <Link key={lesson.href} href={lesson.href}>
            <Card className="h-full transition-shadow hover:shadow-md" padding="sm">
              <div className="relative mb-2 aspect-[4/3] overflow-hidden rounded-xl bg-surface">
                <Image
                  src={lesson.mascot}
                  alt=""
                  fill
                  className="object-contain p-2"
                  sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                />
              </div>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${lesson.badgeClass}`}
              >
                {lesson.badge}
              </span>
              <div className="mt-1.5 font-[family-name:var(--font-jakarta)] text-sm font-bold text-ink">
                {lesson.title}
              </div>
              <div className="text-[12px] text-ink-muted">{lesson.subtitle}</div>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
