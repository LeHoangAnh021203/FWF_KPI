import { NextResponse } from "next/server";
import { createWorkspaceTeam, getAuthState, getWorkspaceRealtimePersonIds } from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionUserId = await getSessionUserId();
    const project = await createWorkspaceTeam(sessionUserId, body);
    const [authState, recipients] = await Promise.all([getAuthState(sessionUserId), getWorkspaceRealtimePersonIds(project.id)]);
    void publishAppEventToPersons(recipients, {
      type: "workspace.updated",
      actorId: authState.user?.personId ?? project.memberIds[0] ?? "system",
      projectId: project.id,
      entityId: project.id,
      occurredAt: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, project });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create team." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
