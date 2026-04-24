import { NextResponse } from "next/server";
import { deleteDocumentRecord, getAuthState, getDocumentRealtimeAudience, updateDocumentRecord } from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params;
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const document = await updateDocumentRecord(sessionUserId, documentId, body);

    if (!document) {
      return NextResponse.json({ ok: false, message: "Document not found or forbidden." }, { status: 404 });
    }

    const [authState, audience] = await Promise.all([getAuthState(sessionUserId), getDocumentRealtimeAudience(document.id)]);
    void publishAppEventToPersons(audience.personIds, {
      type: "learning.updated",
      actorId: authState.user?.personId ?? document.ownerId,
      action: "updated",
      entityType: "document",
      entityLabel: audience.documentName,
      entityId: document.id,
      occurredAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true, document });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update document." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ documentId: string }> }
) {
  try {
    const { documentId } = await context.params;
    const sessionUserId = await getSessionUserId();
    const audienceBeforeDelete = await getDocumentRealtimeAudience(documentId);
    const deleted = await deleteDocumentRecord(sessionUserId, documentId);

    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Document not found or forbidden." }, { status: 404 });
    }

    const authState = await getAuthState(sessionUserId);
    void publishAppEventToPersons(audienceBeforeDelete.personIds, {
      type: "learning.updated",
      actorId: authState.user?.personId ?? "system",
      action: "deleted",
      entityType: "document",
      entityLabel: audienceBeforeDelete.documentName,
      entityId: documentId,
      occurredAt: new Date().toISOString()
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to delete document." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
