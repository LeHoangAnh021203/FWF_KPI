import { NextResponse } from "next/server";
import { createWorkspaceTeam } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionUserId = await getSessionUserId();
    const project = await createWorkspaceTeam(sessionUserId, body);
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create team." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
