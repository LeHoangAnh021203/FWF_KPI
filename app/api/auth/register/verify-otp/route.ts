import { NextResponse } from "next/server";
import { getAdminRealtimePersonIds, verifyRegistrationOtp } from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { SESSION_COOKIE_NAME } from "@/lib/server/session";

export async function POST(request: Request) {
  const body = await request.json();
  const result = await verifyRegistrationOtp(body.email ?? "", body.otp ?? "");

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  if (!result.user) {
    if (result.requiresApproval) {
      const adminRecipients = await getAdminRealtimePersonIds();
      void publishAppEventToPersons(adminRecipients, {
        type: "approval.updated",
        actorId: "system",
        action: "requested",
        entityType: "approval",
        occurredAt: new Date().toISOString()
      });
    }

    return NextResponse.json(result);
  }

  const response = NextResponse.json({ ok: true, user: { ...result.user, password: "" } });
  response.cookies.set(SESSION_COOKIE_NAME, result.user.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/"
  });
  return response;
}
