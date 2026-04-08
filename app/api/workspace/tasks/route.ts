import { NextResponse } from "next/server";
import { createWorkspaceTask, getAuthState, getWorkspaceRealtimePersonIds } from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const sessionUserId = await getSessionUserId();
    const task = await createWorkspaceTask(sessionUserId, body);
    const [authState, recipients] = await Promise.all([getAuthState(sessionUserId), getWorkspaceRealtimePersonIds(task.projectId)]);
    void publishAppEventToPersons(recipients, {
      type: "workspace.updated",
      actorId: authState.user?.personId ?? task.assigneeId,
      projectId: task.projectId,
      entityId: String(task.id),
      occurredAt: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, task });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create task." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
