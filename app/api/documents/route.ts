import { NextResponse } from "next/server";
import { createDocumentRecord, getDocumentsData } from "@/lib/server/data";
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
    return NextResponse.json({ ok: true, document });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create document." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
