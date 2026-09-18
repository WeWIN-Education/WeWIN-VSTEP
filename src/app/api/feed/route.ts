import { getFeedPage } from "@/lib/feed";
import { getCurrentUser } from "@/lib/access";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const user = await getCurrentUser();
  const page = await getFeedPage({ cursor: url.searchParams.get("cursor") || undefined, viewerId: user?.id });
  return NextResponse.json(page, { headers: { "Cache-Control": "private, no-store" } });
}
