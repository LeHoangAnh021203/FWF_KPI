import { NextResponse } from "next/server";
import { getDirectory, getWorkspaceData } from "@/lib/server/data";
import { getAuthState } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  const sessionUserId = await getSessionUserId();

  if (!sessionUserId) {
    return NextResponse.json({
      user: null,
      currentUserId: "",
      people: [],
      teams: [],
      projects: [],
      projectTasks: {}
    });
  }

  const [authState, directoryState, workspaceState] = await Promise.all([
    getAuthState(sessionUserId),
    getDirectory(),
    getWorkspaceData(sessionUserId)
  ]);

  return NextResponse.json({
    user: authState.user ? { ...authState.user, password: "" } : null,
    currentUserId: authState.user?.personId ?? "",
    people: directoryState.people,
    teams: directoryState.teams,
    projects: workspaceState.projects,
    projectTasks: workspaceState.projectTasks
  });
}
