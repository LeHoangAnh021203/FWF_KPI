import { NextResponse } from "next/server";
import {
  approveRoleApprovalRequest,
  getPendingRoleApprovalRequests,
  rejectRoleApprovalRequest
} from "@/lib/server/data";
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

    if (action === "reject") {
      const approvalRequest = await rejectRoleApprovalRequest(sessionUserId, body.requestId ?? "");
      return NextResponse.json({ ok: true, request: approvalRequest });
    }

    const user = await approveRoleApprovalRequest(sessionUserId, body.requestId ?? "");
    return NextResponse.json({ ok: true, user: { ...user, password: "" } });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to approve request." },
      { status: error instanceof Error && error.message === "Forbidden" ? 403 : 400 }
    );
  }
}
