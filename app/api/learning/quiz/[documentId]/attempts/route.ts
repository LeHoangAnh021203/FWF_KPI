import { NextResponse } from "next/server";
import { getMyQuizAttempt, getTeamQuizAttempts } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const sessionUserId = await getSessionUserId();
    const { searchParams } = new URL(request.url);
    const scope = searchParams.get("scope");

    if (scope === "team") {
      const attempts = await getTeamQuizAttempts(sessionUserId, documentId);
      return NextResponse.json({ attempts });
    }

    const attempt = await getMyQuizAttempt(sessionUserId, documentId);
    return NextResponse.json({ attempt });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json(
      { ok: false, message: msg },
      { status: msg === "Unauthorized" ? 401 : 403 }
    );
  }
}
