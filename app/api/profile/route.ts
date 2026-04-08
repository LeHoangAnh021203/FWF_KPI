import { NextResponse } from "next/server";
import { updateOwnProfile } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function PATCH(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const person = await updateOwnProfile(sessionUserId, body);
    return NextResponse.json({ ok: true, person });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update profile." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400 }
    );
  }
}
