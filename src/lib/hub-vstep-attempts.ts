import "server-only";

import { z } from "zod";
import { authorizeHubBearer } from "@/lib/hub-auth";
import {
  attemptStatus,
  listAdminVstepAttempts,
  practiceLabel,
  studentLabel,
  type AttemptStatus,
} from "@/lib/vstep-admin-history";

const MAX_TAKE = 100;
const DEFAULT_TAKE = 50;

export const hubVstepQuerySchema = z.object({
  q: z.string().max(100).optional(),
  status: z.enum(["all", "active", "submitted", "expired"]).optional(),
  take: z.coerce.number().int().min(1).max(MAX_TAKE).optional(),
  offset: z.coerce.number().int().min(0).max(10000).optional(),
});

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
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return "https://vstep.wewin.edu.vn";
}

/**
 * Lean hub list for WeWIN Admin Panel.
 * Auth: Authorization Bearer WEWIN_HUB_API_KEY (≥16).
 */
export async function listHubVstepAttempts(
  request: Request,
): Promise<{ status: number; body: HubVstepAttemptsResult | { code: string } }> {
  const auth = authorizeHubBearer(request);
  if (!auth.ok) return { status: auth.status, body: { code: auth.code } };

  const url = new URL(request.url);
  const raw = Object.fromEntries(url.searchParams.entries());
  const parsed = hubVstepQuerySchema.safeParse(raw);
  if (!parsed.success) {
    return { status: 400, body: { code: "INVALID_INPUT" } };
  }

  const q = parsed.data.q?.trim() ?? "";
  const status = parsed.data.status ?? "all";
  const take = parsed.data.take ?? DEFAULT_TAKE;
  const offset = parsed.data.offset ?? 0;
  const now = new Date();
  const { rows } = await listAdminVstepAttempts({
    query: q,
    status,
    now,
    take,
    offset,
  });

  const origin = publicOrigin();
  const items: HubVstepAttemptItem[] = rows.map((row) => {
    const mappedStatus = attemptStatus(
      row.status,
      row.submittedAt,
      row.expiresAt,
      now,
    );
    return {
      id: row.id,
      studentName: studentLabel(row),
      studentEmail: row.userEmail,
      ownerKind: row.userId ? "user" : "guest",
      examTitle: row.examTitle,
      practiceLabel: practiceLabel(row),
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
}
