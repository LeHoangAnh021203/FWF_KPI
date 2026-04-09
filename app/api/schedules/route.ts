import { NextResponse } from "next/server";
import { createScheduleRecord, getAdminRealtimePersonIds, getAuthState, getScheduleData } from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

export async function GET(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");
    const schedules = await getScheduleData(sessionUserId, projectId);
    return NextResponse.json({ ok: true, schedules });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load schedules." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const schedule = await createScheduleRecord(sessionUserId, body);
    const [authState, adminRecipients] = await Promise.all([getAuthState(sessionUserId), getAdminRealtimePersonIds()]);
    void publishAppEventToPersons([...schedule.attendeeIds, schedule.createdByPersonId, ...adminRecipients], {
      type: "schedule.updated",
      actorId: authState.user?.personId ?? schedule.createdByPersonId,
      action: "created",
      entityType: "schedule",
      entityLabel: schedule.title,
      projectId: schedule.projectId,
      scheduleId: schedule.id,
      entityId: schedule.id,
      targetPersonIds: schedule.attendeeIds,
      occurredAt: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, schedule });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to create schedule." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
