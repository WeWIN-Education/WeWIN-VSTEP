import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { BattleError, battleCommand, type BattleCommand } from "@/lib/battle-engine";
import { prisma } from "@/lib/prisma";
import { recordBaseline } from "@/lib/performance-baseline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return json({ error: "Yêu cầu không hợp lệ." }, 403);
  const user = await getCurrentUser();
  if (!user) return json({ error: "Bạn cần đăng nhập bằng tài khoản đang hoạt động." }, 401);
  const text = await request.text();
  if (text.length > 2048) return json({ error: "Yêu cầu quá lớn." }, 413);
  let body: BattleCommand;
  try { body = JSON.parse(text); } catch { return json({ error: "Yêu cầu không hợp lệ." }, 400); }
  if (!body || !["state", "join", "cancel", "answer", "leave"].includes(body.action)
    || (body.matchId !== undefined && (typeof body.matchId !== "string" || body.matchId.length > 100))
    || (body.heartbeat !== undefined && typeof body.heartbeat !== "boolean")
    || (["answer", "leave"].includes(body.action) && !body.matchId)
    || (body.action === "answer" && (!Number.isInteger(body.turn) || body.turn! < 0 || body.turn! > 29 || !Number.isInteger(body.choice) || body.choice! < 0 || body.choice! > 3))) {
    return json({ error: "Lượt hoặc lựa chọn không hợp lệ." }, 400);
  }
  const start = performance.now();
  try { return json(await battleCommand(user, body)); }
  catch (error) { return json({ error: error instanceof BattleError ? error.message : "Không thể cập nhật trận đấu. Vui lòng thử lại." }, error instanceof BattleError ? error.status : 503); }
  finally { recordBaseline("battle.command", performance.now() - start); }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Bạn cần đăng nhập." }, 401);
  const raw = Number(new URL(request.url).searchParams.get("page") || 1);
  const page = Number.isInteger(raw) && raw > 0 ? Math.min(raw, 10000) : 1;
  const where = { userId: user.id, match: { status: { not: "ACTIVE" } } };
  const [total, items, profile] = await Promise.all([
    prisma.battlePlayer.count({ where }),
    prisma.battlePlayer.findMany({ where, skip: (page - 1) * 10, take: 10, orderBy: [{ match: { finishedAt: "desc" } }, { id: "desc" }], select: { slot: true, score: true, correct: true, reward: { select: { xp: true } }, match: { select: { id: true, status: true, reason: true, winnerSlot: true, finishedAt: true } } } }),
    prisma.user.findUnique({ where: { id: user.id }, select: { xp: true } }),
  ]);
  return json({ page, total, items, xp: profile?.xp ?? 0 });
}
