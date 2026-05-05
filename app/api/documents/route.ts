import { NextResponse } from "next/server";
import {
  createDocumentRecord,
  getAuthState,
  getDocumentRealtimeAudience,
  getDocumentsData,
  getStoreLearningAnnouncementTargets,
  sendStoreLearningAnnouncementEmails
} from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

export async function GET(request: Request) {
  const sessionUserId = await getSessionUserId();
  const { searchParams } = new URL(request.url);
  const folderId = searchParams.get("folderId") ?? undefined;
  const documents = await getDocumentsData(sessionUserId, folderId);
  return NextResponse.json({ documents });
}

export async function POST(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const document = await createDocumentRecord(sessionUserId, body);
    const [authState, audience, trainerTargets] = await Promise.all([
      getAuthState(sessionUserId),
      getDocumentRealtimeAudience(document.id),
      getStoreLearningAnnouncementTargets(sessionUserId, document.id)
    ]);
    const targetPersonIds = trainerTargets.personIds.length > 0 ? trainerTargets.personIds : audience.personIds;
    void publishAppEventToPersons(targetPersonIds, {
      type: "learning.updated",
      actorId: authState.user?.personId ?? document.ownerId,
      action: "created",
      entityType: "document",
      entityLabel: audience.documentName,
      entityId: document.id,
      occurredAt: new Date().toISOString()
    });
    void sendStoreLearningAnnouncementEmails({
      actorName: authState.user?.name ?? "Trainer",
      title: audience.documentName,
      kind: "document",
      targets: trainerTargets.emailTargets
    });
    return NextResponse.json({ ok: true, document });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create document." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
