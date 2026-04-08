import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET(request: Request) {
  const userId = await getSessionUserId();
  const { searchParams } = new URL(request.url);
  const includeUsers = searchParams.get("includeUsers") === "true";
  const payload = await getAuthState(userId);
  return NextResponse.json({
    user: payload.user ? { ...payload.user, password: "" } : null,
    users: includeUsers ? payload.users.map((user) => ({ ...user, password: "" })) : []
  });
}
