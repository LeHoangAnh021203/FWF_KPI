import { NextResponse } from "next/server";
import { isRealtimeConfigured } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  const sessionUserId = await getSessionUserId();

  return NextResponse.json({
    enabled: Boolean(sessionUserId) && isRealtimeConfigured()
  });
}
