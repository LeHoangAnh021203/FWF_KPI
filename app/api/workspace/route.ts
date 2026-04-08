import { NextResponse } from "next/server";
import { getWorkspaceData } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";
import { getAuthState } from "@/lib/server/data";

export async function GET() {
  const sessionUserId = await getSessionUserId();
  const [authState, workspaceState] = await Promise.all([
    getAuthState(sessionUserId),
    getWorkspaceData(sessionUserId)
  ]);

  return NextResponse.json({
    currentUserId: authState.user?.personId ?? "",
    ...workspaceState
  });
}
