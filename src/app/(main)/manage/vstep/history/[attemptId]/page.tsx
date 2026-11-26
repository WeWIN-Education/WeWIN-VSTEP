import { Card } from "@/components/ui/Card";
import { prisma } from "@/lib/prisma";
import {
  adminHistoryPath,
  attemptStatus,
  attemptStatuses,
  catalogLabels,
  formatAttemptTime,
  practiceLabel,
  requireVstepHistoryAdmin,
  studentLabel,
} from "@/lib/vstep-admin-history";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = { title: "Chi tiết lượt làm VSTEP | WEWIN" };
export const dynamic = "force-dynamic";

function scoreText(value: number | null | undefined) {
  return typeof value === "number" ? `${value}/10` : "—";
}

export default async function AdminVstepAttemptPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(attemptId)) notFound();
  await requireVstepHistoryAdmin(`${adminHistoryPath}/${attemptId}`);

  const attempt = await prisma.examAttempt.findUnique({
    where: { id: attemptId },
    select: {
      id: true,
      catalog: true,
      status: true,
      listeningScore: true,
      readingScore: true,
      writingStatus: true,
      speakingStatus: true,
      startedAt: true,
      submittedAt: true,
      expiresAt: true,
      updatedAt: true,
      userId: true,
      guestSessionId: true,
      user: { select: { name: true, email: true } },
      examPaper: { select: { title: true } },
      paperPart: { select: { title: true } },
    },
  });
  if (!attempt) notFound();

  const now = new Date();
  const row = {
    ...attempt,
    userName: attempt.user?.name ?? null,
    userEmail: attempt.user?.email ?? null,
    examTitle: attempt.examPaper.title,
    partTitle: attempt.paperPart?.title ?? null,
  };
  const state =
    attemptStatuses[
      attemptStatus(attempt.status, attempt.submittedAt, attempt.expiresAt, now)
    ];

  const fields = [
    { label: "Học viên", value: studentLabel(row) },
    ...(row.userEmail ? [{ label: "Email", value: row.userEmail }] : []),
    { label: "Bài luyện", value: practiceLabel(row) },
    { label: "Catalog", value: catalogLabels[attempt.catalog] },
    { label: "Bắt đầu", value: formatAttemptTime(attempt.startedAt) },
    ...(attempt.submittedAt
      ? [{ label: "Nộp bài", value: formatAttemptTime(attempt.submittedAt) }]
      : []),
    { label: "Cập nhật", value: formatAttemptTime(attempt.updatedAt) },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 text-ink">
      <Link
        href={adminHistoryPath}
        className="inline-flex min-h-11 items-center text-sm font-semibold text-brand hover:underline"
      >
        Về lịch sử làm bài
      </Link>
      <header className="rounded-3xl border border-border bg-surface-card p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">{attempt.examPaper.title}</h1>
          <span className={`rounded-lg px-2.5 py-1.5 text-sm ${state.color}`}>
            {state.label}
          </span>
        </div>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {fields.map(({ label, value }) => (
            <div key={label} className="min-w-0 break-words">
              <dt className="text-ink-muted">{label}</dt>
              <dd className="mt-1 font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
      </header>

      <Card padding="lg">
        <h2 className="text-xl font-extrabold text-ink">Điểm số</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Listening", value: scoreText(attempt.listeningScore) },
            { label: "Reading", value: scoreText(attempt.readingScore) },
            { label: "Writing", value: attempt.writingStatus },
            { label: "Speaking", value: attempt.speakingStatus },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-surface p-4">
              <p className="text-xs font-bold text-ink-muted">{item.label}</p>
              <p className="mt-1 text-lg font-extrabold text-brand">
                {item.value}
              </p>
            </div>
          ))}
        </div>
        {attempt.userId ? (
          <Link
            href={`/manage/users/${attempt.userId}?tab=attempts`}
            className="mt-5 inline-flex text-sm font-extrabold text-brand hover:underline"
          >
            Mở hồ sơ học viên →
          </Link>
        ) : null}
      </Card>
    </div>
  );
}
