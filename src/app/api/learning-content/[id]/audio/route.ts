import { getCurrentUser } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { getObject, headObject } from "@/lib/storage";
import { audioRange } from "@/lib/learning-audio";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor) return new Response(null, { status: 401, headers });
  const { id } = await params;
  const item = await prisma.learningContent.findUnique({ where: { id } });
  if (!item?.audioKey || (!item.published && actor.role !== "ADMIN")) return new Response(null, { status: 404, headers });
  try {
    const meta = await headObject(item.audioKey);
    if (!meta) return new Response(null, { status: 404, headers });
    let range;
    try { range = audioRange(request.headers.get("range"), meta.sizeBytes); }
    catch { return new Response(null, { status: 416, headers: { ...headers, "Content-Range": `bytes */${meta.sizeBytes}` } }); }
    const object = await getObject(item.audioKey, range ? { range } : {});
    if (!object) return new Response(null, { status: 404, headers });
    return new Response(object.stream, { status: range ? 206 : 200, headers: {
      ...headers, "Content-Type": "audio/mpeg", "Accept-Ranges": "bytes",
      "Content-Length": String(range ? range.end - range.start + 1 : meta.sizeBytes),
      ...(range ? { "Content-Range": `bytes ${range.start}-${range.end}/${meta.sizeBytes}` } : {}),
    } });
  } catch { return new Response(null, { status: 503, headers }); }
}
