import { NextResponse } from "next/server";
import { getTeamLearningStatusesForDocument } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const sessionUserId = await getSessionUserId();
    const rows = await getTeamLearningStatusesForDocument(sessionUserId, documentId);
    return NextResponse.json({ ok: true, rows });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json(
      { ok: false, message: msg },
      { status: msg === "Unauthorized" ? 401 : 403 }
    );
  }
}

