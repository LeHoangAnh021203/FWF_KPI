import { NextResponse } from "next/server";
import { getAuthState, getDocumentRealtimeAudience, getMyLearningProgress, upsertMyLearningProgress } from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  try {
    const sessionUserId = await getSessionUserId();
    const progresses = await getMyLearningProgress(sessionUserId);
    return NextResponse.json({ ok: true, progresses });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json(
      { ok: false, message: msg },
      { status: msg === "Unauthorized" ? 401 : msg === "Document not found." ? 404 : 403 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = (await request.json()) as {
      documentId: string;
      startedAt?: string | null;
      completedAt?: string | null;
      activeStepIndex?: number;
      completedStepIds?: string[];
      startedAtByStepId?: Record<string, string>;
    };

    if (!body.documentId || !body.documentId.trim()) {
      return NextResponse.json({ ok: false, message: "Missing documentId." }, { status: 400 });
    }

    const progress = await upsertMyLearningProgress(sessionUserId, body);
    if (body.completedAt) {
      const [authState, audience] = await Promise.all([getAuthState(sessionUserId), getDocumentRealtimeAudience(body.documentId)]);
      void publishAppEventToPersons(audience.personIds, {
        type: "learning.updated",
        actorId: authState.user?.personId ?? "system",
        action: "updated",
        entityType: "learning_progress",
        entityLabel: audience.documentName,
        entityId: body.documentId,
        occurredAt: new Date().toISOString()
      });
    }
    return NextResponse.json({ ok: true, progress });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json(
      { ok: false, message: msg },
      { status: msg === "Unauthorized" ? 401 : msg === "Document not found." ? 404 : 403 }
    );
  }
}
