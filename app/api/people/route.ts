import { NextResponse } from "next/server";
import { createPersonRecord, getDirectory } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  const payload = await getDirectory();
  return NextResponse.json(payload);
}

export async function POST(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const person = await createPersonRecord(sessionUserId, body);
    return NextResponse.json({ ok: true, person });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create person." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
