import { randomUUID } from "node:crypto";
import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { isSameOrigin } from "@/lib/request-security";
import { deleteObject, isBlobStorageEnabled, putObject } from "@/lib/storage";
import { MAX_LEARNING_AUDIO_BYTES, validateLearningAudio } from "@/lib/learning-audio";

export const runtime = "nodejs";
const reply = (data: unknown, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
type Context = { params: Promise<{ id: string }> };
async function mutate(request: Request, context: Context, remove: boolean) {
  if (!isSameOrigin(request)) return reply({ error: "Yêu cầu không hợp lệ." }, 403);
  const actor = await getCurrentUser();
  if (!actor) return reply({ error: "Bạn cần đăng nhập." }, 401);
  if (actor.role !== "ADMIN") return reply({ error: "Chỉ QTV được quản lý MP3." }, 403);
  if (process.env.NODE_ENV === "production" && !isBlobStorageEnabled()) return reply({ error: "Kho file chưa được cấu hình." }, 503);
  let newKey: string | undefined;
  try {
    const { id } = await context.params;
    const item = await prisma.learningContent.findUnique({ where: { id } });
    if (!item) return reply({ error: "Bài không tồn tại." }, 404);
    if (request.headers.get("if-match") !== item.updatedAt.toISOString()) return reply({ error: "Bài đã thay đổi. Tải lại danh sách rồi thử lại." }, 409);
    let name: string | null = null;
    if (!remove) {
      try { name = decodeURIComponent(request.headers.get("x-file-name") || ""); }
      catch { return reply({ error: "Tên file không hợp lệ." }, 400); }
      const reader = request.body?.getReader();
      if (!reader) return reply({ error: "Thiếu file MP3." }, 400);
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > MAX_LEARNING_AUDIO_BYTES) { await reader.cancel(); return reply({ error: "File tối đa 3 MB." }, 413); }
        chunks.push(value);
      }
      const bytes = Buffer.concat(chunks);
      try { validateLearningAudio(name, bytes); }
      catch (error) { return reply({ error: (error as Error).message }, 400); }
      newKey = `learning-audio/${id}/${randomUUID()}.mp3`;
      await putObject(newKey, bytes, "audio/mpeg");
    }
    const result = await prisma.learningContent.updateMany({ where: { id, updatedAt: item.updatedAt }, data: { audioKey: newKey ?? null, audioName: name } });
    if (!result.count) {
      if (newKey) await deleteObject(newKey);
      return reply({ error: "Bài vừa được thay đổi. Tải lại rồi thử lại." }, 409);
    }
    newKey = undefined;
    if (item.audioKey) {
      try { await deleteObject(item.audioKey); }
      catch { return reply({ success: true, warning: "Đã cập nhật bài nhưng chưa dọn được file cũ trong kho. Liên hệ QTV để dọn kho." }); }
    }
    return reply({ success: true });
  } catch {
    if (newKey) {
      const attached = await prisma.learningContent.findUnique({ where: { audioKey: newKey } }).catch(() => undefined);
      if (attached === null) await deleteObject(newKey).catch(() => undefined);
    }
    return reply({ error: "Không cập nhật được MP3. Vui lòng thử lại." }, 503);
  }
}
export const PUT = (request: Request, context: Context) => mutate(request, context, false);
export const DELETE = (request: Request, context: Context) => mutate(request, context, true);
