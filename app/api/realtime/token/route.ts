import { NextResponse } from "next/server";
import { createRealtimeTokenRequest, isRealtimeConfigured } from "@/lib/server/realtime";
import { getAuthState } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  if (!isRealtimeConfigured()) {
    return NextResponse.json({ ok: false, message: "Realtime is not configured." }, { status: 503 });
  }

  const sessionUserId = await getSessionUserId();
  const authState = await getAuthState(sessionUserId);
  const clientId = authState.user?.personId;

  if (!clientId) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const tokenRequest = await createRealtimeTokenRequest(clientId);
  return NextResponse.json(tokenRequest);
}
