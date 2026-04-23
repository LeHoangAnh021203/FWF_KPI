import { NextResponse } from "next/server";
import { getQuizReport } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  try {
    const sessionUserId = await getSessionUserId();
    const rows = await getQuizReport(sessionUserId);
    return NextResponse.json({ rows });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json(
      { ok: false, message: msg },
      { status: msg === "Unauthorized" ? 401 : 403 }
    );
  }
}
