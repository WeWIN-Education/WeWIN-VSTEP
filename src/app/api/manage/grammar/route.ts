import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/access";
import { isSameOrigin } from "@/lib/request-security";
import { prisma } from "@/lib/prisma";
import { grammarSummary, importGrammar, transitionGrammar } from "@/lib/grammar";
import { GrammarError } from "@/lib/grammar-rules";
import library from "@/data/grammar-topics.json";

const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
export async function GET(request: Request) {
  try {
    const actor = await getCurrentUser();
    if (actor?.role !== "ADMIN") return reply({ error: "Chỉ quản trị viên được truy cập." }, 403);
    const params = new URL(request.url).searchParams;
    const topicSlug = params.get("topic") ?? params.get("pilot");
    if (topicSlug) {
      const content = library.find(topic => topic.slug === topicSlug);
      return content ? reply(content) : reply({ error: "Không tìm thấy chuyên đề." }, 404);
    }
    const id = params.get("id");
    if (id && id.length <= 100) return reply(await prisma.grammarLesson.findUnique({ where: { id } }));
    return reply(await prisma.grammarLesson.findMany({ select: grammarSummary, orderBy: { createdAt: "desc" }, take: 100 }));
  } catch { return reply({ error: "Chưa tải được nội dung. Vui lòng thử lại." }, 503); }
}
export async function POST(request: Request) {
  if (!isSameOrigin(request)) return reply({ error: "Yêu cầu không hợp lệ." }, 403);
  try {
    const actor = await getCurrentUser();
    if (actor?.role !== "ADMIN") return reply({ error: "Chỉ quản trị viên được thực hiện." }, 403);
    const raw = await request.text();
    if (raw.length > 128000) throw new GrammarError("Mỗi bản nội dung tối đa 128 KB.", 413);
    const body = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new GrammarError("Nội dung không hợp lệ.");
    if (body.action === "import") return reply(await importGrammar(actor.id, body.content));
    if (typeof body.id !== "string" || body.id.length > 100 || !["review", "publish", "archive", "restore"].includes(body.action)) throw new GrammarError("Thao tác không hợp lệ.");
    if (body.action === "review" && body.confirmed !== true) throw new GrammarError("Cần xác nhận đã kiểm tra câu hỏi và đáp án.");
    return reply(await transitionGrammar(actor.id, body.id, body.action));
  } catch (error) {
    if (error instanceof GrammarError) return reply({ error: error.message }, error.status);
    if (error instanceof SyntaxError) return reply({ error: "Tệp JSON chưa đúng định dạng." }, 400);
    return reply({ error: "Chưa lưu được thay đổi. Vui lòng tải lại danh sách và thử lại." }, 503);
  }
}
