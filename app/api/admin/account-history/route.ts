import { NextResponse } from "next/server";
import { getRoleApprovalHistory } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  try {
    const sessionUserId = await getSessionUserId();
    const history = await getRoleApprovalHistory(sessionUserId);
    return NextResponse.json({ ok: true, history });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load account history." },
      { status: error instanceof Error && error.message === "Forbidden" ? 403 : 500 }
    );
  }
}
