import "server-only";

import type { Prisma } from "@prisma/client";
import { authorizeHubBearer } from "@/lib/hub-auth";
import { prisma } from "@/lib/prisma";
import {
  attemptStatus,
  catalogLabels,
  type AttemptStatus,
} from "@/lib/vstep-admin-history";

const MAX_TAKE = 100;
const DEFAULT_TAKE = 50;

export type HubVstepAttemptItem = {
  id: string;
  studentName: string;
  studentEmail: string | null;
  ownerKind: "user" | "guest";
  examTitle: string;
  practiceLabel: string;
  catalog: string;
  status: AttemptStatus;
  startedAt: string | null;
  submittedAt: string | null;
  expiresAt: string | null;
  updatedAt: string;
  listeningScore: number | null;
  readingScore: number | null;
  writingStatus: string;
  speakingStatus: string;
  detailUrl: string;
};

export type HubVstepAttemptsResult = {
  source: "vstep";
  generatedAt: string;
  items: HubVstepAttemptItem[];
  stats: {
    total: number;
    submitted: number;
    active: number;
    expired: number;
  };
};

function publicOrigin(): string {
  const fromEnv =
    process.env.APP_ORIGIN?.trim() ||
    process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (fromEnv && !/^https?:\/\/localhost(?::\d+)?\/?$/i.test(fromEnv)) {
    return fromEnv.replace(/\/$/, "");
  }
  return "https://vstep.wewin.edu.vn";
}

function parseHubQuery(url: URL): {
  ok: true;
  q: string;
  status: AttemptStatus | "all";
  take: number;
  offset: number;
} | { ok: false } {
  const q = String(url.searchParams.get("q") || "").trim().slice(0, 100);
  const statusRaw = String(url.searchParams.get("status") || "all");
  const status =
    statusRaw === "active" ||
    statusRaw === "submitted" ||
    statusRaw === "expired" ||
    statusRaw === "all"
      ? statusRaw
      : null;
  const takeRaw = Number(url.searchParams.get("take") || DEFAULT_TAKE);
  const offsetRaw = Number(url.searchParams.get("offset") || 0);
  const take = Number.isInteger(takeRaw)
    ? Math.min(MAX_TAKE, Math.max(1, takeRaw))
    : NaN;
  const offset = Number.isInteger(offsetRaw)
    ? Math.min(10000, Math.max(0, offsetRaw))
    : NaN;
  if (!status || !Number.isInteger(take) || !Number.isInteger(offset)) {
    return { ok: false };
  }
  return { ok: true, q, status, take, offset };
}

function buildWhere(
  status: AttemptStatus | "all",
  q: string,
  now: Date,
): Prisma.ExamAttemptWhereInput {
  const parts: Prisma.ExamAttemptWhereInput[] = [];

  if (status === "submitted") {
    parts.push({ OR: [{ status: "SUBMITTED" }, { submittedAt: { not: null } }] });
  } else if (status === "active") {
    parts.push({
      status: { not: "SUBMITTED" },
      submittedAt: null,
      expiresAt: { gt: now },
    });
  } else if (status === "expired") {
    parts.push({
      status: { not: "SUBMITTED" },
      submittedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { lte: now } }],
    });
  }

  if (q) {
    parts.push({
      OR: [
        { user: { is: { name: { contains: q, mode: "insensitive" } } } },
        { user: { is: { email: { contains: q, mode: "insensitive" } } } },
        { examPaper: { is: { title: { contains: q, mode: "insensitive" } } } },
        { paperPart: { is: { title: { contains: q, mode: "insensitive" } } } },
      ],
    });
  }

  if (!parts.length) return {};
  if (parts.length === 1) return parts[0]!;
  return { AND: parts };
}

/**
 * Lean hub list for WeWIN Admin Panel.
 * Auth: Authorization Bearer WEWIN_HUB_API_KEY (≥16).
 */
export async function listHubVstepAttempts(
  request: Request,
): Promise<{ status: number; body: HubVstepAttemptsResult | { code: string; error?: string } }> {
  const auth = authorizeHubBearer(request);
  if (!auth.ok) return { status: auth.status, body: { code: auth.code } };

  const parsed = parseHubQuery(new URL(request.url));
  if (!parsed.ok) {
    return { status: 400, body: { code: "INVALID_INPUT" } };
  }

  const now = new Date();
  try {
    const rows = await prisma.examAttempt.findMany({
      where: buildWhere(parsed.status, parsed.q, now),
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: parsed.take,
      skip: parsed.offset,
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

    const origin = publicOrigin();
    const items: HubVstepAttemptItem[] = rows.map((row) => {
      const mappedStatus = attemptStatus(
        row.status,
        row.submittedAt,
        row.expiresAt,
        now,
      );
      const examTitle = row.examPaper.title;
      const practice =
        row.paperPart?.title || catalogLabels[row.catalog] || row.catalog;
      const studentName =
        row.user?.name ||
        row.user?.email ||
        (row.guestSessionId ? "Khách dùng thử" : "Tài khoản không còn");
      return {
        id: row.id,
        studentName,
        studentEmail: row.user?.email ?? null,
        ownerKind: row.userId ? "user" : "guest",
        examTitle,
        practiceLabel: practice,
        catalog: row.catalog,
        status: mappedStatus,
        startedAt: row.startedAt.toISOString(),
        submittedAt: row.submittedAt ? row.submittedAt.toISOString() : null,
        expiresAt: row.expiresAt ? row.expiresAt.toISOString() : null,
        updatedAt: row.updatedAt.toISOString(),
        listeningScore: row.listeningScore,
        readingScore: row.readingScore,
        writingStatus: row.writingStatus,
        speakingStatus: row.speakingStatus,
        detailUrl: `${origin}/manage/vstep/history/${encodeURIComponent(row.id)}`,
      };
    });

    let submitted = 0;
    let active = 0;
    let expired = 0;
    for (const item of items) {
      if (item.status === "submitted") submitted += 1;
      else if (item.status === "active") active += 1;
      else expired += 1;
    }

    return {
      status: 200,
      body: {
        source: "vstep",
        generatedAt: now.toISOString(),
        items,
        stats: { total: items.length, submitted, active, expired },
      },
    };
  } catch (error) {
    console.error("[hub/vstep-attempts] query", error);
    const message =
      error instanceof Error ? error.message.slice(0, 200) : "QUERY_FAILED";
    return {
      status: 500,
      body: { code: "SERVER_ERROR", error: message },
    };
  }
}
