import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { BATTLE_TYPES, validateBattleQuestion } from "@/lib/battle-rules";
import { BATTLE_STARTER } from "@/lib/battle-starter";

export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
async function admin() { const u = await getCurrentUser(); return u?.role === "ADMIN"; }
export async function GET(request: Request) {
  if (!await admin()) return json({ error: "Chỉ quản trị viên được truy cập." }, 403);
  const params = new URL(request.url).searchParams;
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  const type = params.get("type");
  const where = { ...(BATTLE_TYPES.includes(type as typeof BATTLE_TYPES[number]) ? { type: type! } : {}), prompt: { contains: (params.get("q") ?? "").slice(0, 100), mode: "insensitive" as const } };
  const [items, total, counts] = await Promise.all([
    prisma.battleQuestion.findMany({ where, skip: (Math.floor(page) - 1) * 20, take: 20, orderBy: [{ createdAt: "desc" }, { id: "asc" }] }),
    prisma.battleQuestion.count({ where }),
    prisma.battleQuestion.groupBy({ by: ["type"], where: { published: true }, _count: true }),
  ]);
  return json({ items, total, counts });
}
export async function POST(request: Request) {
  if (!isSameOrigin(request) || !await admin()) return json({ error: "Không có quyền thực hiện." }, 403);
  const text = await request.text();
  if (text.length > 6000) return json({ error: "Nội dung quá dài." }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return json({ error: "Nội dung không hợp lệ." }, 400); }
  if (!body || typeof body !== "object") return json({ error: "Nội dung không hợp lệ." }, 400);
  if (body.action === "import") {
    const result = await prisma.battleQuestion.createMany({ data: BATTLE_STARTER, skipDuplicates: true });
    return json({ imported: result.count });
  }
  if (body.id !== undefined && (typeof body.id !== "string" || body.id.length > 100)) return json({ error: "Mã câu hỏi không hợp lệ." }, 400);
  if (body.action === "delete" && body.id) {
    await prisma.battleQuestion.deleteMany({ where: { id: body.id } });
    return json({ ok: true });
  }
  let data;
  try { data = validateBattleQuestion(body); } catch (error) { return json({ error: (error as Error).message }, 400); }
  if (body.id) await prisma.battleQuestion.update({ where: { id: body.id }, data });
  else await prisma.battleQuestion.create({ data });
  return json({ ok: true });
}
