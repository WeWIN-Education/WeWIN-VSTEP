import { NextResponse } from "next/server";
import { listHubVstepAttempts } from "@/lib/hub-vstep-attempts";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "private, no-store" };

export async function GET(request: Request) {
  try {
    const result = await listHubVstepAttempts(request);
    return NextResponse.json(result.body, {
      status: result.status,
      headers: NO_STORE,
    });
  } catch (error) {
    console.error("[hub/vstep-attempts]", error);
    return NextResponse.json(
      { code: "SERVER_ERROR" },
      { status: 500, headers: NO_STORE },
    );
  }
}
