import "server-only";

import type { ExamCatalog, Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";

export const adminHistoryPath = "/manage/vstep/history";
export const historyPageSize = 25;

export const attemptStatuses = {
  active: { label: "Đang làm bài", color: "bg-brand-soft text-brand" },
  submitted: { label: "Đã nộp bài", color: "bg-success-soft text-success" },
  expired: { label: "Hết giờ chưa nộp", color: "bg-surface text-ink-muted" },
} as const;

export type AttemptStatus = keyof typeof attemptStatuses;

export const catalogLabels: Record<ExamCatalog, string> = {
  FULL: "Full Test",
  LISTENING: "Nghe",
  READING: "Đọc",
  WRITING: "Viết",
  SPEAKING: "Nói",
};

const localTime = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "short",
  timeStyle: "short",
});

export function formatAttemptTime(value: Date) {
  return localTime.format(value);
}

export function attemptStatus(
  status: string,
  submittedAt: Date | null,
  expiresAt: Date | null,
  now: Date,
): AttemptStatus {
  if (status === "SUBMITTED" || submittedAt) return "submitted";
  return expiresAt && expiresAt > now ? "active" : "expired";
}

export async function requireVstepHistoryAdmin(path = adminHistoryPath) {
  const user = await getCurrentUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(path)}`);
  if (user.role !== "ADMIN") notFound();
}

export type AdminVstepAttemptRow = {
  id: string;
  catalog: ExamCatalog;
  status: string;
  listeningScore: number | null;
  readingScore: number | null;
  writingStatus: string;
  speakingStatus: string;
  startedAt: Date;
  submittedAt: Date | null;
  expiresAt: Date | null;
  updatedAt: Date;
  userId: string | null;
  guestSessionId: string | null;
  userName: string | null;
  userEmail: string | null;
  examTitle: string;
  partTitle: string | null;
};

const listSelect = {
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
} satisfies Prisma.ExamAttemptSelect;

function mapRow(
  row: Prisma.ExamAttemptGetPayload<{ select: typeof listSelect }>,
): AdminVstepAttemptRow {
  return {
    id: row.id,
    catalog: row.catalog,
    status: row.status,
    listeningScore: row.listeningScore,
    readingScore: row.readingScore,
    writingStatus: row.writingStatus,
    speakingStatus: row.speakingStatus,
    startedAt: row.startedAt,
    submittedAt: row.submittedAt,
    expiresAt: row.expiresAt,
    updatedAt: row.updatedAt,
    userId: row.userId,
    guestSessionId: row.guestSessionId,
    userName: row.user?.name ?? null,
    userEmail: row.user?.email ?? null,
    examTitle: row.examPaper.title,
    partTitle: row.paperPart?.title ?? null,
  };
}

function searchClause(q: string): Prisma.ExamAttemptWhereInput {
  return {
    OR: [
      { user: { name: { contains: q, mode: "insensitive" } } },
      { user: { email: { contains: q, mode: "insensitive" } } },
      { examPaper: { title: { contains: q, mode: "insensitive" } } },
      { paperPart: { title: { contains: q, mode: "insensitive" } } },
    ],
  };
}

function statusClause(
  status: AttemptStatus | "all",
  now: Date,
): Prisma.ExamAttemptWhereInput {
  if (status === "submitted") {
    return { OR: [{ status: "SUBMITTED" }, { submittedAt: { not: null } }] };
  }
  if (status === "active") {
    return {
      status: { not: "SUBMITTED" },
      submittedAt: null,
      expiresAt: { gt: now },
    };
  }
  if (status === "expired") {
    return {
      status: { not: "SUBMITTED" },
      submittedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { lte: now } }],
    };
  }
  return {};
}

export async function listAdminVstepAttempts({
  query,
  status,
  page,
  now,
  take = historyPageSize,
  offset,
}: {
  query: string;
  status: AttemptStatus | "all";
  page?: number;
  now: Date;
  take?: number;
  offset?: number;
}) {
  const q = query.trim().slice(0, 100);
  const clauses: Prisma.ExamAttemptWhereInput[] = [statusClause(status, now)];
  if (q) clauses.push(searchClause(q));
  const where: Prisma.ExamAttemptWhereInput =
    clauses.length === 1 ? clauses[0]! : { AND: clauses };

  const skip =
    typeof offset === "number"
      ? offset
      : Math.max(0, ((page ?? 1) - 1) * take);

  const rows = await prisma.examAttempt.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    take: take + 1,
    skip,
    select: listSelect,
  });

  return {
    rows: rows.slice(0, take).map(mapRow),
    hasNext: rows.length > take,
  };
}

export function practiceLabel(
  row: Pick<AdminVstepAttemptRow, "partTitle" | "catalog">,
) {
  return row.partTitle || catalogLabels[row.catalog] || row.catalog;
}

export function studentLabel(
  row: Pick<
    AdminVstepAttemptRow,
    "userName" | "userEmail" | "guestSessionId"
  >,
) {
  if (row.userName || row.userEmail) {
    return row.userName || row.userEmail || "Tài khoản không còn";
  }
  if (row.guestSessionId) return "Khách dùng thử";
  return "Tài khoản không còn";
}
