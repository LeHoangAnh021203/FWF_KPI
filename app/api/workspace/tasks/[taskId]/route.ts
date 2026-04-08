import { NextResponse } from "next/server";
import { updateWorkspaceTask } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ taskId: string }> }
) {
  try {
    const { taskId } = await context.params;
    const body = await request.json();
    const sessionUserId = await getSessionUserId();
    const task = await updateWorkspaceTask(sessionUserId, Number(taskId), body);

    if (!task) {
      return NextResponse.json({ ok: false, message: "Task not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, task });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update task." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
