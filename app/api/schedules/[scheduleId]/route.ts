import { NextResponse } from "next/server";
import { deleteScheduleRecord, getAdminRealtimePersonIds, getAuthState, getScheduleRealtimeRecipients, updateScheduleRecord } from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

type RouteContext = {
  params: Promise<{ scheduleId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const { scheduleId } = await context.params;
    const schedule = await updateScheduleRecord(sessionUserId, scheduleId, body);
    const [authState, adminRecipients] = await Promise.all([getAuthState(sessionUserId), getAdminRealtimePersonIds()]);
    if (schedule) {
      void publishAppEventToPersons([...schedule.attendeeIds, schedule.createdByPersonId, ...adminRecipients], {
        type: "schedule.updated",
        actorId: authState.user?.personId ?? schedule.createdByPersonId,
        action: "updated",
        entityType: "schedule",
        entityLabel: schedule.title,
        projectId: schedule.projectId,
        scheduleId: schedule.id,
        entityId: schedule.id,
        targetPersonIds: schedule.attendeeIds,
        occurredAt: new Date().toISOString()
      });
    }
    return NextResponse.json({ ok: true, schedule });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update schedule." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const sessionUserId = await getSessionUserId();
    const { scheduleId } = await context.params;
    const recipients = await getScheduleRealtimeRecipients(sessionUserId, scheduleId);
    await deleteScheduleRecord(sessionUserId, scheduleId);
    const authState = await getAuthState(sessionUserId);
    void publishAppEventToPersons(recipients.personIds, {
      type: "schedule.updated",
      actorId: authState.user?.personId ?? "system",
      action: "deleted",
      entityType: "schedule",
      projectId: recipients.projectId,
      scheduleId,
      entityId: scheduleId,
      occurredAt: new Date().toISOString()
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to delete schedule." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
