import { getCurrentUser } from "@/lib/access";
import { getMaterialsPage } from "@/lib/materials-page";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const actor = await getCurrentUser();
  if (!actor || actor.role !== "ADMIN") return NextResponse.json({ error: "Không có quyền truy cập." }, { status: actor ? 403 : 401, headers: { "Cache-Control": "private, no-store" } });
  const params = Object.fromEntries(new URL(request.url).searchParams);
  return NextResponse.json(await getMaterialsPage(true, params), { headers: { "Cache-Control": "private, no-store" } });
}
