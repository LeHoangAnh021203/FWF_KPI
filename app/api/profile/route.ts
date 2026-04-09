import { NextResponse } from "next/server";
import { getAllRealtimePersonIds, getAuthState, updateOwnProfile } from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

export async function PATCH(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const person = await updateOwnProfile(sessionUserId, body);
    if (!person) {
      return NextResponse.json({ ok: false, message: "Profile not found." }, { status: 404 });
    }
    const [authState, recipients] = await Promise.all([getAuthState(sessionUserId), getAllRealtimePersonIds()]);
    void publishAppEventToPersons(recipients, {
      type: "directory.updated",
      actorId: authState.user?.personId ?? person.id,
      action: "updated",
      entityType: "profile",
      entityLabel: person.name,
      entityId: person.id,
      targetPersonIds: [person.id],
      occurredAt: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, person });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update profile." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 400 }
    );
  }
}
