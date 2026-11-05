import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { getGrammarExercise, previewGrammar, submitGrammar } from "@/lib/grammar";
import { GrammarError } from "@/lib/grammar-rules";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
function failure(error: unknown) {
  if (error instanceof GrammarError) return reply({ error: error.message }, error.status);
  if (error instanceof SyntaxError) return reply({ error: "Dữ liệu không hợp lệ." }, 400);
  return reply({ error: "Chưa xử lý được bài. Câu trả lời vẫn được giữ lại; vui lòng thử lại." }, 503);
}
export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return reply({ error: "Đăng nhập để làm bài và lưu tiến độ." }, 401);
    const params = new URL(request.url).searchParams;
    const lessonId = params.get("lessonId") ?? "", setId = params.get("setId") ?? "";
    if (!lessonId || lessonId.length > 100 || !setId || setId.length > 80) throw new GrammarError("Thiếu mã bài luyện.");
    return reply(await getGrammarExercise(lessonId, setId, user.id, params.get("mode") === "REVIEW" ? "REVIEW" : "TEST", params.get("preview") === "1"));
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return reply({ error: "Yêu cầu không hợp lệ." }, 403);
  try {
    const user = await getCurrentUser();
    if (!user) return reply({ error: "Đăng nhập để lưu tiến độ." }, 401);
    const raw = await request.text();
    if (raw.length > 32000) throw new GrammarError("Bài nộp quá lớn.", 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body) || !/^[0-9a-f-]{36}$/.test(body.submissionId ?? "")
      || ["lessonId", "setId", "version"].some(key => typeof body[key] !== "string" || !body[key] || body[key].length > 100)
      || !["TEST", "REVIEW"].includes(body.mode) || !body.answers || typeof body.answers !== "object" || Array.isArray(body.answers) || Object.keys(body.answers).length > 15) throw new GrammarError("Dữ liệu bài nộp không hợp lệ.");
    return reply(body.preview === true ? await previewGrammar(user.id, body) : await submitGrammar(user.id, body));
  } catch (error) { return failure(error); }
}
