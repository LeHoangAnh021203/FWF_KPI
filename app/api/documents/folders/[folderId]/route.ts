import { NextResponse } from "next/server";
import { deleteFolderRecord } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function DELETE(_: Request, { params }: { params: Promise<{ folderId: string }> }) {
  try {
    const sessionUserId = await getSessionUserId();
    const { folderId } = await params;
    const ok = await deleteFolderRecord(sessionUserId, folderId);
    return NextResponse.json({ ok });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete folder.";
    const status = message === "Unauthorized" ? 401 : 403;
    return NextResponse.json({ ok: false, message }, { status });
  }
}
