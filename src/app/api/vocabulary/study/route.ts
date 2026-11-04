import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { getStudyDashboard, getStudyQuiz, startStudy, submitStudy, StudyError } from "@/lib/vocabulary-study";
import { NextResponse } from "next/server";

const headers = { "Cache-Control": "private, no-store" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers });

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Đăng nhập để đồng bộ lộ trình từ vựng." }, 401);
  try { return reply(await getStudyDashboard(user.id)); }
  catch { return reply({ error: "Chưa tải được lộ trình. Vui lòng thử lại." }, 503); }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return reply({ error: "Yêu cầu không hợp lệ." }, 403);
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Đăng nhập để đồng bộ lộ trình từ vựng." }, 401);
  try {
    const text = await request.text();
    if (text.length > 64000) throw new StudyError("Dữ liệu quá lớn.");
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new StudyError("Dữ liệu không hợp lệ.");
    if (body.action === "start") return reply(await startStudy(user.id, body.goal));
    if (typeof body.version !== "string" || body.version.length > 80) throw new StudyError("Thiếu mã bài học.");
    if (body.action === "quiz") return reply(await getStudyQuiz(user.id, body.version));
    if (body.action !== "submit" || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)
      || Object.keys(body.answers).length > 20 || Object.values(body.answers).some(value => typeof value !== "string" || value.length > 4000)) throw new StudyError("Câu trả lời không hợp lệ.");
    return reply(await submitStudy(user.id, body.version, body.answers));
  } catch (error) {
    if (error instanceof StudyError) return reply({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return reply({ error: "Dữ liệu không hợp lệ." }, 400);
    return reply({ error: "Chưa lưu được bài học. Giữ nguyên trang và thử lại." }, 503);
  }
}
