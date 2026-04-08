import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  const userId = await getSessionUserId();
  const payload = await getAuthState(userId);
  return NextResponse.json({
    user: payload.user ? { ...payload.user, password: "" } : null,
    users: payload.users.map((user) => ({ ...user, password: "" }))
  });
}
