import { getCurrentUser } from "@/lib/access";
import { getDailyChallenges, claimDailyChallenge } from "@/lib/daily-challenges";
import { isSameOrigin } from "@/lib/request-security";

const reply = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Bạn cần đăng nhập." }, 401);
  try { return reply(await getDailyChallenges(user.id)); }
  catch { return reply({ error: "Chưa tải được nhiệm vụ. Vui lòng thử lại." }, 503); }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return reply({ error: "Yêu cầu không hợp lệ." }, 403);
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Bạn cần đăng nhập." }, 401);
  let body;
  try { body = await request.json(); } catch { return reply({ error: "Dữ liệu không hợp lệ." }, 400); }
  if (!body || typeof body.day !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.day)) return reply({ error: "Ngày nhiệm vụ không hợp lệ." }, 400);
  try {
    const result = await claimDailyChallenge(user.id, body.day);
    return reply(result.state ?? { error: result.error }, result.status);
  } catch { return reply({ error: "Chưa nhận được thưởng. Bạn có thể thử lại an toàn." }, 503); }
}
