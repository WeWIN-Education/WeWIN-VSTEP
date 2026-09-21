import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/storage";
import { isSameOrigin } from "@/lib/request-security";
import { CONTENT_KINDS, CONTENT_SKILLS, MAX_CONTENT_BYTES, parseContentFile, validateContent, type ContentKind } from "@/lib/learning-content";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store" };
const reply = (data: unknown, status = 200) => NextResponse.json(data, { status, headers });
async function authorize(request: Request, mutation = false) {
  if (mutation && !isSameOrigin(request)) return reply({ error: "Yêu cầu không hợp lệ." }, 403);
  const user = await getCurrentUser();
  if (!user) return reply({ error: "Bạn cần đăng nhập." }, 401);
  if (user.role !== "ADMIN") return reply({ error: "Chỉ QTV được quản lý nội dung." }, 403);
  return null;
}
async function readBody(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Thiếu nội dung.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > MAX_CONTENT_BYTES + 100000) { await reader.cancel(); throw new Error("Nội dung vượt quá 2 MB."); }
    chunks.push(value);
  }
  try {
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  }
  catch { throw new Error("Không đọc được nội dung gửi lên."); }
}
function failure(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return reply({ error: "Mã bài đã tồn tại. Hãy sửa bài hiện có hoặc dùng mã mới; không có bài nào trong lần nhập này được lưu." }, 409);
    return reply({ error: "Chưa thể lưu nội dung. Vui lòng kiểm tra kết nối database và migration." }, 503);
  }
  if (error instanceof Error && error.name.startsWith("Prisma")) return reply({ error: "Không kết nối được database. Vui lòng thử lại sau." }, 503);
  return reply({ error: error instanceof Error ? error.message : "Không thể xử lý nội dung." }, 400);
}
export async function GET(request: Request) {
  const denied = await authorize(request); if (denied) return denied;
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind") as ContentKind;
  if (!CONTENT_KINDS.includes(kind)) return reply({ error: "Mục không hợp lệ." }, 400);
  const q = (params.get("q") ?? "").slice(0, 200);
  const skill = params.get("skill");
  const cursor = params.get("cursor");
  try {
    const rows = await prisma.learningContent.findMany({
      where: { kind, ...(skill && CONTENT_SKILLS.includes(skill as typeof CONTENT_SKILLS[number]) ? { skill } : {}), ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { code: { contains: q, mode: "insensitive" } }] } : {}), ...(cursor ? { id: { lt: cursor } } : {}) },
      orderBy: { id: "desc" }, take: 21,
    });
    const items = rows.slice(0, 20);
    return reply({ items, hasMore: rows.length > 20, nextCursor: rows.length > 20 ? items.at(-1)?.id : null });
  } catch { return reply({ error: "Không tải được danh sách. Vui lòng kiểm tra database và migration." }, 503); }
}
export async function POST(request: Request) {
  const denied = await authorize(request, true); if (denied) return denied;
  try {
    const data = await readBody(request);
    if (data.action === "preview" || data.action === "import") {
      if (!CONTENT_KINDS.includes(data.kind) || typeof data.source !== "string") throw new Error("File không hợp lệ.");
      const items = parseContentFile(data.source, data.kind);
      if (data.action === "preview") return reply({ items });
      // A single createMany statement is atomic; duplicate codes never overwrite published work.
      await prisma.learningContent.createMany({ data: items });
      return reply({ count: items.length }, 201);
    }
    const item = await prisma.learningContent.create({ data: validateContent(data) });
    return reply({ item }, 201);
  } catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  const denied = await authorize(request, true); if (denied) return denied;
  try {
    const data = await readBody(request);
    const input = validateContent(data);
    if (typeof data.id !== "string" || !data.id || typeof data.updatedAt !== "string" || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error("Thiếu phiên bản bài cần sửa.");
    const result = await prisma.learningContent.updateMany({ where: { id: data.id, kind: input.kind, updatedAt: new Date(data.updatedAt) }, data: input });
    if (!result.count) return reply({ error: "Bài đã thay đổi hoặc bị xóa. Tải lại danh sách trước khi sửa." }, 409);
    return reply({ success: true });
  } catch (error) { return failure(error); }
}
export async function DELETE(request: Request) {
  const denied = await authorize(request, true); if (denied) return denied;
  try {
    const data = await readBody(request);
    if (typeof data.id !== "string" || !data.id || !CONTENT_KINDS.includes(data.kind) || typeof data.updatedAt !== "string" || !Number.isFinite(Date.parse(data.updatedAt))) throw new Error("Bài cần xóa không hợp lệ.");
    const item = await prisma.learningContent.findUnique({ where: { id: data.id } });
    const result = await prisma.learningContent.deleteMany({ where: { id: data.id, kind: data.kind, updatedAt: new Date(data.updatedAt) } });
    if (!result.count) return reply({ error: "Bài đã thay đổi hoặc bị xóa. Hãy tải lại danh sách." }, 409);
    if (item?.audioKey) {
      try { await deleteObject(item.audioKey); }
      catch { return reply({ success: true, warning: "Đã xóa bài nhưng chưa dọn được MP3 trong kho." }); }
    }
    return reply({ success: true });
  } catch (error) { return failure(error); }
}
