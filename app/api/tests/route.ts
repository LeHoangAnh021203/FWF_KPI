import { NextResponse } from "next/server";
import { createTestRecord, getTestsData } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  try {
    const sessionUserId = await getSessionUserId();
    const tests = await getTestsData(sessionUserId);
    return NextResponse.json({ tests });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to fetch tests." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const test = await createTestRecord(sessionUserId, body);
    return NextResponse.json({ ok: true, test });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create test." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
