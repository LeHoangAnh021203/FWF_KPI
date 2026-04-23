import { NextResponse } from "next/server";
import { submitQuizAttempt } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await params;
    const sessionUserId = await getSessionUserId();
    const body = await request.json() as { answers: number[]; startedAt: string };
    const result = await submitQuizAttempt(sessionUserId, documentId, body.answers, body.startedAt);
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json(
      { ok: false, message: msg },
      { status: msg === "Unauthorized" ? 401 : 400 }
    );
  }
}
