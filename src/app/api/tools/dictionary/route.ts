import { getCurrentUser } from "@/lib/access";
import { DictionaryError, lookupDictionary, type DictionaryDirection } from "@/lib/dictionary";
import { NextResponse } from "next/server";

const directions = new Set<DictionaryDirection>(["auto", "en-vi", "vi-en"]);

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401 });

  let body: { text?: unknown; direction?: unknown };
  try {
    body = await request.json() as { text?: unknown; direction?: unknown };
  } catch {
    return NextResponse.json({ error: "Dữ liệu gửi lên không hợp lệ." }, { status: 400 });
  }

  const direction = typeof body.direction === "string" && directions.has(body.direction as DictionaryDirection)
    ? body.direction as DictionaryDirection
    : "auto";
  if (typeof body.text !== "string" || body.text.length > 2000) {
    return NextResponse.json({ error: "Nội dung cần tra phải là văn bản tối đa 2.000 ký tự." }, { status: 400 });
  }

  try {
    return NextResponse.json(await lookupDictionary({ text: body.text, direction, userId: user.id }), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    if (error instanceof DictionaryError) {
      const status = error.code === "INVALID_INPUT" ? 400 : 503;
      return NextResponse.json({ error: error.message, code: error.code }, { status });
    }
    return NextResponse.json({ error: "Không thể tra từ lúc này. Vui lòng thử lại." }, { status: 500 });
  }
}
