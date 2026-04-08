import { NextResponse } from "next/server";
import {
  approveRoleApprovalRequest,
  getAdminRealtimePersonIds,
  getPendingRoleApprovalRequests,
  rejectRoleApprovalRequest
} from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  try {
    const sessionUserId = await getSessionUserId();
    const requests = await getPendingRoleApprovalRequests(sessionUserId);
    return NextResponse.json({ ok: true, requests });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load approval requests." },
      { status: error instanceof Error && error.message === "Forbidden" ? 403 : 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const action = body.action === "reject" ? "reject" : "approve";
    const adminRecipients = await getAdminRealtimePersonIds();

    if (action === "reject") {
      const approvalRequest = await rejectRoleApprovalRequest(sessionUserId, body.requestId ?? "");
      void publishAppEventToPersons(adminRecipients, {
        type: "approval.updated",
        actorId: sessionUserId ?? "system",
        entityId: approvalRequest.id,
        occurredAt: new Date().toISOString()
      });
      return NextResponse.json({ ok: true, request: approvalRequest });
    }

    const user = await approveRoleApprovalRequest(sessionUserId, body.requestId ?? "");
    void publishAppEventToPersons(adminRecipients, {
      type: "approval.updated",
      actorId: user.personId ?? sessionUserId ?? "system",
      entityId: user.id,
      occurredAt: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, user: { ...user, password: "" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to approve request." },
      { status: error instanceof Error && error.message === "Forbidden" ? 403 : 400 }
    );
  }
}
