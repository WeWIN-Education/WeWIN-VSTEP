import "server-only";
import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const HISTORY_PAGE_SIZE = 20;
export const historyCatalogs = ["FULL", "LISTENING", "READING", "WRITING", "SPEAKING"] as const;
export const historySkills = ["LISTENING", "READING", "WRITING", "SPEAKING"] as const;
type Params = Record<string, string | string[] | undefined>;
const valueOf = (value: Params[string]) => (Array.isArray(value) ? value[0] : value) ?? "";

function day(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value ? date : null;
}

export function historyFilters(params: Params) {
  const catalog = valueOf(params.catalog);
  const skill = valueOf(params.skill);
  const status = valueOf(params.status);
  return {
    catalog: historyCatalogs.find(item => item === catalog),
    skill: historySkills.find(item => item === skill),
    status: status === "IN_PROGRESS" || status === "SUBMITTED" ? status : undefined,
    paper: valueOf(params.paper).trim().slice(0, 100),
    from: valueOf(params.from),
    to: valueOf(params.to),
  };
}
type Filters = ReturnType<typeof historyFilters>;

export function historyHref(filters: Filters, cursor?: string, direction?: "prev") {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  if (cursor) params.set("cursor", cursor);
  if (cursor && direction) params.set("direction", direction);
  return `/history${params.size ? `?${params}` : ""}`;
}

// Same date/id keyset pattern as feed.ts; bind cursors to normalized filters.
function scope(filters: Filters) {
  return createHash("sha256").update(JSON.stringify(filters)).digest("hex");
}
function encodeCursor(row: { updatedAt: Date; id: string }, filters: Filters) {
  return Buffer.from(JSON.stringify({ date: row.updatedAt.toISOString(), id: row.id, scope: scope(filters) })).toString("base64url");
}
function decodeCursor(value: string, filters: Filters) {
  if (!value || value.length > 1024) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (typeof parsed?.id !== "string" || !/^[a-zA-Z0-9_-]{1,128}$/.test(parsed.id)
      || typeof parsed.date !== "string" || parsed.scope !== scope(filters)) return null;
    const date = new Date(parsed.date);
    if (!Number.isFinite(date.getTime()) || date.toISOString() !== parsed.date) return null;
    return { id: parsed.id as string, date };
  } catch { return null; }
}

export async function getHistoryPage(userId: string, params: Params) {
  if (!userId) throw new Error("Authenticated user required");
  const filters = historyFilters(params);
  const from = filters.from ? day(filters.from) : null;
  const to = filters.to ? day(filters.to) : null;
  const error = (filters.from && !from) || (filters.to && !to)
    ? "Ngày lọc không hợp lệ. Vui lòng chọn lại ngày."
    : from && to && from > to ? "Từ ngày phải trước hoặc trùng Đến ngày." : null;
  const cursor = decodeCursor(valueOf(params.cursor), filters);
  const previous = Boolean(cursor && valueOf(params.direction) === "prev");
  const where: Prisma.ExamAttemptWhereInput = {
    userId,
    ...(filters.catalog ? { catalog: filters.catalog } : {}),
    ...(filters.skill ? { skill: filters.skill } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.paper ? { examPaper: { title: { contains: filters.paper, mode: "insensitive" } } } : {}),
    // Date inputs represent whole UTC days, including the final millisecond.
    ...(from || to ? { updatedAt: {
      ...(from ? { gte: from } : {}),
      ...(to ? { lt: new Date(to.getTime() + 86_400_000) } : {}),
    } } : {}),
    ...(cursor ? { OR: [
      { updatedAt: previous ? { gt: cursor.date } : { lt: cursor.date } },
      { updatedAt: cursor.date, id: previous ? { gt: cursor.id } : { lt: cursor.id } },
    ] } : {}),
  };
  const order = previous ? "asc" : "desc";
  const rows = error ? [] : await prisma.examAttempt.findMany({
    where, orderBy: [{ updatedAt: order }, { id: order }], take: HISTORY_PAGE_SIZE + 1,
    select: { id: true, updatedAt: true, catalog: true, status: true,
      examPaper: { select: { title: true } }, paperPart: { select: { title: true } } },
  });
  const attempts = rows.slice(0, HISTORY_PAGE_SIZE);
  if (previous) attempts.reverse();
  const first = attempts[0];
  const last = attempts.at(-1);
  return {
    filters, attempts, error, paginated: Boolean(cursor),
    previousHref: first && (previous ? rows.length > HISTORY_PAGE_SIZE : cursor)
      ? historyHref(filters, encodeCursor(first, filters), "prev") : null,
    nextHref: last && (previous ? cursor : rows.length > HISTORY_PAGE_SIZE)
      ? historyHref(filters, encodeCursor(last, filters)) : null,
    latestHref: historyHref(filters),
  };
}
