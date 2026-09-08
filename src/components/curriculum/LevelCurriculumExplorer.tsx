"use client";

import { cn } from "@/lib/utils";
import { BookOpen, ChevronRight, MessageCircle, SpellCheck2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

export type CurriculumLesson = {
  id: string;
  slug: string;
  title: string;
  vocabCount: number;
  grammarCount: number;
  dialogueCount: number;
  durationMin: number;
  sortOrder: number;
};

export type CurriculumTopic = {
  id: string;
  slug: string;
  title: string;
  iconLabel: string | null;
  sortOrder: number;
  lessons: CurriculumLesson[];
};

type Props = {
  levelSlug: string;
  levelTitle: string;
  topics: CurriculumTopic[];
  initialTopicSlug?: string;
};

export function LevelCurriculumExplorer({
  levelSlug,
  levelTitle,
  topics,
  initialTopicSlug,
}: Props) {
  const defaultSlug = initialTopicSlug || topics[0]?.slug;
  const [activeSlug, setActiveSlug] = useState(defaultSlug);

  const activeTopic = useMemo(
    () => topics.find((t) => t.slug === activeSlug) ?? topics[0],
    [topics, activeSlug],
  );

  if (!topics.length || !activeTopic) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-white p-8 text-center text-sm text-ink-muted">
        Chưa có chủ đề cho {levelTitle}. Hãy chạy seed dữ liệu.
      </div>
    );
  }

  return (
    <section className="mt-6">
      <h2 className="font-[family-name:var(--font-jakarta)] text-lg font-extrabold text-ink">
        Lộ trình bài học {levelTitle}
      </h2>
      <p className="mt-1 text-[13px] text-ink-muted">
        Hoàn thành từng bài để mở khoá chủ đề tiếp theo
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-2xl border border-border bg-white p-3">
          <p className="mb-2 px-2 text-[11px] font-bold tracking-wide text-ink-faint">
            CHỦ ĐỀ
          </p>
          <ul className="space-y-1.5">
            {topics.map((topic) => {
              const active = topic.slug === activeTopic.slug;
              return (
                <li key={topic.id}>
                  <button
                    type="button"
                    onClick={() => setActiveSlug(topic.slug)}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors",
                      active
                        ? "border border-brand bg-brand-soft"
                        : "border border-transparent hover:bg-surface",
                    )}
                  >
                    <span
                      className={cn(
                        "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        active
                          ? "bg-brand text-white"
                          : "bg-brand-soft text-brand",
                      )}
                    >
                      {topic.iconLabel || topic.title.slice(0, 1)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-[13px] font-semibold",
                          active ? "text-brand" : "text-ink",
                        )}
                      >
                        {topic.title}
                      </span>
                      <span className="text-[11px] text-ink-faint">
                        0/{topic.lessons.length}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>

        <div className="rounded-2xl border border-border bg-white p-4 md:p-5">
          <div className="mb-4 flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand">
              {activeTopic.iconLabel || "T"}
            </span>
            <div>
              <h3 className="font-bold text-ink">{activeTopic.title}</h3>
              <p className="text-[12px] text-ink-muted">
                {activeTopic.lessons.length} bài học · tiến độ 0%
              </p>
            </div>
          </div>

          <ul className="space-y-2.5">
            {activeTopic.lessons.map((lesson, index) => (
              <li key={lesson.id}>
                <Link
                  href={`/hsk/${levelSlug}/${lesson.slug}`}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-3 transition-colors hover:border-brand/40 hover:bg-brand-soft/40"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface text-[13px] font-bold text-ink">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-semibold text-ink">
                      {lesson.title}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="size-3" />
                        {lesson.vocabCount} từ vựng
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <SpellCheck2 className="size-3" />
                        {lesson.grammarCount} ngữ pháp
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MessageCircle className="size-3" />
                        {lesson.dialogueCount} hội thoại
                      </span>
                    </div>
                  </div>
                  <span className="hidden shrink-0 text-[12px] text-ink-faint sm:inline">
                    {lesson.durationMin} phút
                  </span>
                  <ChevronRight className="size-4 shrink-0 text-ink-faint" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
