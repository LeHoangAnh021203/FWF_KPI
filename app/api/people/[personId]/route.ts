import { NextResponse } from "next/server";
import { deletePersonRecord, updatePersonRecord } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

type RouteContext = {
  params: Promise<{ personId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const { personId } = await context.params;
    const person = await updatePersonRecord(sessionUserId, personId, body);

    if (!person) {
      return NextResponse.json({ ok: false, message: "Person not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, person });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update person." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}

export async function DELETE(_: Request, context: RouteContext) {
  try {
    const sessionUserId = await getSessionUserId();
    const { personId } = await context.params;
    const deleted = await deletePersonRecord(sessionUserId, personId);

    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Person not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to delete person." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
