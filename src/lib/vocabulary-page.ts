import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createHash } from "node:crypto";

export type VocabularyScope = { mode: "collection" | "collocations" | "notebook"; collection?: string; topic?: string; q?: string; status?: string };
const fields = { id: true, term: true, meaningVi: true, ipa: true, exampleEn: true } as const;
const sharedFields = { ...fields, partOfSpeech: true, exampleVi: true, audioUrl: true } as const;
type Key = { source: number; values: string[] };

export async function notebookCounts(userId: string) {
  if (!userId) throw new Error("Authentication required");
  const [shared, personal] = await Promise.all([
    prisma.vocabularyProgress.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
    prisma.personalVocabulary.groupBy({ by: ["status"], where: { userId }, _count: { _all: true } }),
  ]);
  const counts = { ALL: 0, NEW: 0, LEARNING: 0, MASTERED: 0 };
  for (const row of [...shared, ...personal]) { counts[row.status] += row._count._all; counts.ALL += row._count._all; }
  return counts;
}

export async function getVocabularyPage(userId: string, input: VocabularyScope, cursorValue?: string, direction = "next", inclusive = false, anchorId?: string) {
  if (!userId) throw new Error("Authentication required");
  const q = (input.q ?? "").trim().slice(0, 100);
  const status = ["NEW", "LEARNING", "MASTERED"].find(s => s === input.status) as "NEW" | "LEARNING" | "MASTERED" | undefined;
  const scope = createHash("sha256").update(JSON.stringify([userId, input.mode, input.collection ?? "", input.topic ?? "", q, status])).digest("hex");
  const token = (key: Key) => Buffer.from(JSON.stringify({ ...key, scope })).toString("base64url");
  let cursor: Key | null = null;
  try {
    const parsed = JSON.parse(Buffer.from((cursorValue ?? "").slice(0, 8192), "base64url").toString());
    const length = input.mode === "collocations" ? 3 : 2;
    if (parsed.scope === scope && [0, 1].includes(parsed.source) && Array.isArray(parsed.values)
      && parsed.values.length === length && parsed.values.every((v: unknown) => typeof v === "string" && v.length < 2000)) {
      if (input.mode !== "notebook" || Number.isFinite(Date.parse(parsed.values[0]))) cursor = parsed;
    }
  } catch { /* Ignore malformed or foreign-scope cursors. */ }
  const previous = direction === "last" || (direction === "prev" && !!cursor);
  function boundary(source: number, names: string[], descending: boolean): Record<string, unknown> {
    if (!cursor) return {};
    if (cursor.source !== source) return (previous ? source < cursor.source : source > cursor.source) ? {} : { id: { in: [] } };
    const op = previous !== descending ? "lt" : "gt";
    const values = cursor.values.map((v, i) => names[i] === "updatedAt" ? new Date(v) : v);
    return { OR: names.map((name, index) => ({
      ...Object.fromEntries(names.slice(0, index).map((n, i) => [n, values[i]])),
      [name]: { [inclusive && index === names.length - 1 ? `${op}e` : op]: values[index] },
    })) };
  }
  const search = q ? { OR: ["term", "meaningVi", ...(input.mode === "collection" ? [] : ["exampleEn"])].map(name => ({ [name]: { contains: q, mode: "insensitive" } })) } : {};
  const order = (names: string[], descending: boolean) => names.map(name => ({ [name]: (previous !== descending ? "desc" : "asc") as "asc" | "desc" }));
  type Item = { id: string; term: string; meaningVi: string; ipa: string | null; exampleEn: string | null; exampleVi: string | null; partOfSpeech: string | null; audioUrl?: string | null; status?: "NEW" | "LEARNING" | "MASTERED"; cursor: string };
  let rows: Item[];
  if (input.mode === "notebook") {
    const names = ["updatedAt", "id"];
    if (inclusive && anchorId) {
      const saved = await prisma.vocabularyProgress.findFirst({ where: { userId, entryId: anchorId, ...(status ? { status } : {}), entry: search }, select: { id: true, updatedAt: true } });
      const personal = saved ? null : await prisma.personalVocabulary.findFirst({ where: { userId, id: anchorId, ...(status ? { status } : {}), ...search }, select: { id: true, updatedAt: true } });
      const anchor = saved ?? personal;
      if (anchor) cursor = { source: saved ? 0 : 1, values: [anchor.updatedAt.toISOString(), anchor.id] };
    }
    const [saved, personal] = await Promise.all([
      prisma.vocabularyProgress.findMany({ where: { AND: [{ userId, ...(status ? { status } : {}), entry: search }, boundary(0, names, true)] }, orderBy: order(names, true), take: 31,
        select: { id: true, updatedAt: true, status: true, entry: { select: sharedFields } } }),
      prisma.personalVocabulary.findMany({ where: { AND: [{ userId, ...(status ? { status } : {}), ...search }, boundary(1, names, true)] }, orderBy: order(names, true), take: 31,
        select: { ...fields, updatedAt: true, status: true } }),
    ]);
    const a = saved.map(r => ({ ...r.entry, status: r.status, cursor: token({ source: 0, values: [r.updatedAt.toISOString(), r.id] }) }));
    const b = personal.map(r => ({ id: r.id, term: r.term, meaningVi: r.meaningVi, ipa: r.ipa, exampleEn: r.exampleEn, exampleVi: null, partOfSpeech: null, status: r.status, cursor: token({ source: 1, values: [r.updatedAt.toISOString(), r.id] }) }));
    rows = previous ? [...b, ...a] : [...a, ...b];
  } else {
    const collection: Prisma.VocabularyCollectionWhereInput = input.mode === "collection" ? { id: input.collection, kind: "VOCABULARY" } : { kind: "COLLOCATION" };
    if (input.mode === "collection" && !input.collection) throw new Error("Collection required");
    const names = input.mode === "collection" ? ["entryCode", "id"] : ["term", "entryCode", "id"];
    if (inclusive && anchorId) {
      const anchor = await prisma.vocabularyEntry.findFirst({ where: { id: anchorId, collection, ...(input.topic ? { topic: { code: input.topic } } : {}), ...search }, select: { id: true, term: true, entryCode: true } });
      if (anchor) cursor = { source: 0, values: input.mode === "collection" ? [anchor.entryCode, anchor.id] : [anchor.term, anchor.entryCode, anchor.id] };
    }
    const entries = await prisma.vocabularyEntry.findMany({
      where: { AND: [{ collection, ...(input.topic ? { topic: { code: input.topic } } : {}), ...search }, boundary(0, names, false)] },
      orderBy: order(names, false), take: 31,
      select: { ...sharedFields, entryCode: true, progress: { where: { userId }, select: { status: true } } },
    });
    rows = entries.map(({ entryCode, progress, ...entry }) => ({ ...entry, status: progress[0]?.status,
      cursor: token({ source: 0, values: input.mode === "collection" ? [entryCode, entry.id] : [entry.term, entryCode, entry.id] }) }));
  }
  const items = rows.slice(0, 30);
  if (previous) items.reverse();
  return { items,
    nextCursor: (previous ? !!cursor : rows.length > 30) ? items.at(-1)?.cursor ?? null : null,
    previousCursor: (previous ? rows.length > 30 : !!cursor) ? items[0]?.cursor ?? null : null,
  };
}
