import { SiteFooter } from "@/components/layout/SiteFooter";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHero } from "@/components/ui/PageHero";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { getExamPapers } from "@/lib/practice";
import { cn } from "@/lib/utils";
import { FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

type Props = { params: Promise<{ level: string }> };

const DIFF_LABEL: Record<string, string> = {
  BASIC: "Cơ bản",
  STANDARD: "Tiêu chuẩn",
  ADVANCED: "Nâng cao",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { level } = await params;
  const n = Number(level.replace("lop-", ""));
  return {
    title: Number.isFinite(n)
      ? `Đề thi Lớp ${n} | WEWIN EDUCATION`
      : "Luyện thi | WEWIN EDUCATION",
  };
}

export default async function ExamLevelPage({ params }: Props) {
  const { level: levelSlug } = await params;
  const match = /^lop-(\d+)$/.exec(levelSlug);
  if (!match) notFound();
  const level = Number(match[1]);
  if (level < 1 || level > 9) notFound();

  let papers: Awaited<ReturnType<typeof getExamPapers>> = [];
  try {
    papers = await getExamPapers(level);
  } catch {
    // DB unavailable
  }

  const counts = {
    BASIC: papers.filter((p) => p.difficulty === "BASIC").length,
    STANDARD: papers.filter((p) => p.difficulty === "STANDARD").length,
    ADVANCED: papers.filter((p) => p.difficulty === "ADVANCED").length,
  };

  return (
    <div className="mx-auto max-w-[1100px]">
      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
          <Link
            key={n}
            href={`/exam/lop-${n}`}
            className={cn(
              "rounded-full border px-3 py-1 text-[12px] font-semibold",
              n === level
                ? "border-brand bg-brand text-white"
                : "border-border bg-white text-ink-muted hover:border-brand",
            )}
          >
            Lớp {n}
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <div>
          <PageHero
            eyebrow="LUYỆN THI"
            title={`Đề thi thử Lớp ${level}`}
            description="Chọn độ khó và bắt đầu làm bài. Đề demo chấm điểm ngay trên trình duyệt."
          />

          <div className="mt-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <SectionTitle title={`Danh sách đề Lớp ${level}`} className="mb-0" />
              <div className="flex flex-wrap gap-2 text-[11px]">
                {(
                  [
                    ["BASIC", "Cơ bản"],
                    ["STANDARD", "Tiêu chuẩn"],
                    ["ADVANCED", "Nâng cao"],
                  ] as const
                ).map(([key, label]) => (
                  <span
                    key={key}
                    className="rounded-full bg-brand-soft px-2.5 py-1 font-semibold text-brand"
                  >
                    {label}: {counts[key]}
                  </span>
                ))}
              </div>
            </div>

            {papers.length === 0 ? (
              <Card padding="lg">
                <p className="text-sm text-ink-muted">
                  {level === 1
                    ? "Chưa có đề — chạy npm run db:seed để tải đề demo Lớp 1."
                    : `Đề thi Lớp ${level} sẽ bổ sung dần. Thử Lớp 1 trước.`}
                </p>
                {level !== 1 ? (
                  <Link href="/exam/lop-1" className="mt-3 inline-block">
                    <Button variant="outline">Xem đề Lớp 1</Button>
                  </Link>
                ) : null}
              </Card>
            ) : (
              <div className="space-y-3">
                {papers.map((paper) => (
                  <Card
                    key={paper.id}
                    className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
                    padding="md"
                  >
                    <div className="flex gap-3">
                      <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-brand">
                        <FileText className="size-5" />
                      </span>
                      <div>
                        <div className="flex flex-wrap gap-2">
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold uppercase text-ink-muted">
                            {DIFF_LABEL[paper.difficulty] ?? paper.difficulty}
                          </span>
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                            {paper.durationMin} phút
                          </span>
                          <span className="rounded-full bg-surface px-2 py-0.5 text-[10px] font-bold text-ink-muted">
                            {paper.totalPoints} điểm
                          </span>
                        </div>
                        <h2 className="mt-1 font-[family-name:var(--font-jakarta)] text-[15px] font-extrabold text-ink">
                          {paper.title}
                        </h2>
                        <p className="text-[12px] text-ink-faint">
                          {paper.questionCount} câu · Điểm cao nhất: —
                        </p>
                      </div>
                    </div>
                    <Link href={`/exam/lop-${level}/${paper.slug}`}>
                      <Button>Làm bài</Button>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="space-y-4">
          <Card padding="lg">
            <h3 className="font-[family-name:var(--font-jakarta)] text-sm font-bold text-ink">
              Phân tích điểm mạnh / yếu
            </h3>
            <p className="mt-2 text-[13px] text-ink-muted">
              Hoàn thành ít nhất 1 đề để xem biểu đồ kỹ năng.
            </p>
          </Card>
          <Card padding="lg">
            <h3 className="font-[family-name:var(--font-jakarta)] text-sm font-bold text-ink">
              Mẹo luyện thi
            </h3>
            <ol className="mt-2 list-decimal space-y-2 pl-4 text-[13px] text-ink-muted">
              <li>Làm đề trong giới hạn thời gian như thi thật.</li>
              <li>Ôn lại đáp án sai ngay sau mỗi lần nộp.</li>
              <li>Kết hợp bài tập dạng riêng trên mục Bài tập.</li>
            </ol>
          </Card>
        </aside>
      </div>

      <SiteFooter />
    </div>
  );
}
