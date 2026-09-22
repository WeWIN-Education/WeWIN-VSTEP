import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function getMaterialsPage(admin: boolean, params: { cursor?: string; q?: string; skill?: string } = {}) {
  const q = (params.q ?? "").slice(0, 200);
  const skill = ["GENERAL", "LISTENING", "READING", "WRITING", "SPEAKING"].find(s => s === params.skill);
  const scope = JSON.stringify([admin, q, skill]);
  let cursor: { date: string; id: string } | null = null;
  try {
    const parsed = JSON.parse(Buffer.from((params.cursor ?? "").slice(0, 2048), "base64url").toString());
    if (parsed.scope === scope && typeof parsed.id === "string" && /^[\w-]{1,128}$/.test(parsed.id)
      && typeof parsed.date === "string" && new Date(parsed.date).toISOString() === parsed.date) cursor = parsed;
  } catch { /* Invalid or differently filtered cursor starts at the first page. */ }
  const where: Prisma.LearningMaterialWhereInput = {
    ...(!admin ? { published: true, programme: "VSTEP" } : {}),
    ...(skill ? { skill } : {}),
    ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { fileName: { contains: q, mode: "insensitive" } }] } : {}),
  };
  const [rows, groups] = await Promise.all([
    prisma.learningMaterial.findMany({
      where: { AND: [where, ...(cursor ? [{ OR: [{ createdAt: { lt: new Date(cursor.date) } }, { createdAt: new Date(cursor.date), id: { lt: cursor.id } }] }] : [])] },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 21,
      select: { id: true, title: true, description: true, programme: true, skill: true, level: true, fileName: true, mimeType: true, sizeBytes: true, published: true, createdAt: true },
    }),
    prisma.learningMaterial.groupBy({ by: ["skill", "published"], where, _count: { _all: true } }),
  ]);
  const items = rows.slice(0, 20).map(row => ({ ...row, createdAt: row.createdAt.toISOString() }));
  const last = items.at(-1);
  return { items, total: groups.reduce((sum, g) => sum + g._count._all, 0),
    published: groups.filter(g => g.published).reduce((sum, g) => sum + g._count._all, 0),
    skillCount: new Set(groups.map(g => g.skill)).size,
    nextCursor: rows.length > 20 && last ? Buffer.from(JSON.stringify({ date: last.createdAt, id: last.id, scope })).toString("base64url") : null };
}
