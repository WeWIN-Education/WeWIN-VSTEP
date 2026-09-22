import { getCurrentUser } from "@/lib/access";
import { getVocabularyPage, notebookCounts, type VocabularyScope } from "@/lib/vocabulary-page";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store" };
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Bạn cần đăng nhập." }, { status: 401, headers });
  const p = Object.fromEntries(new URL(request.url).searchParams);
  if (!["collection", "collocations", "notebook"].includes(p.mode)) return NextResponse.json({ error: "Bộ lọc không hợp lệ." }, { status: 400, headers });
  if (p.mode === "notebook" && p.countsOnly === "1") return NextResponse.json({ counts: await notebookCounts(user.id) }, { headers });
  const page = await getVocabularyPage(user.id, p as VocabularyScope, p.cursor, p.direction, p.resume === "1", p.anchor?.slice(0, 128));
  return NextResponse.json({ ...page, ...(p.mode === "notebook" && !p.cursor ? { counts: await notebookCounts(user.id) } : {}) }, { headers });
}
