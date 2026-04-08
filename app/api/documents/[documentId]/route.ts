import { NextResponse } from "next/server";
import { deleteDocumentRecord, updateDocumentRecord } from "@/lib/server/data";
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
    const deleted = await deleteDocumentRecord(sessionUserId, documentId);

    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Document not found or forbidden." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to delete document." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
