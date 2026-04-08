import { NextResponse } from "next/server";
import {
  createOrGetChatThread,
  deleteChatMessage,
  getDirectory,
  getAuthState,
  getChatsForPerson,
  markChatThreadAsRead,
  sendChatMessage
} from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET() {
  const sessionUserId = await getSessionUserId();
  const authState = await getAuthState(sessionUserId);
  const personId = authState.user?.personId;

  if (!personId) {
    return NextResponse.json({ threads: [], people: [], teams: [] });
  }

  const [threads, directory] = await Promise.all([
    getChatsForPerson(sessionUserId),
    getDirectory()
  ]);

  return NextResponse.json({
    currentUserId: personId,
    threads,
    people: directory.people,
    teams: directory.teams
  });
}

export async function POST(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const authState = await getAuthState(sessionUserId);
    const senderId = authState.user?.personId;

    if (!senderId) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    if (body.teammateId && !body.threadId) {
      const threadId = await createOrGetChatThread(sessionUserId, body.teammateId);
      return NextResponse.json({ ok: true, threadId });
    }

    const message = await sendChatMessage({
      sessionUserId,
      threadId: body.threadId,
      senderId,
      content: body.content
    });

    return NextResponse.json({ ok: true, message });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to send message." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const authState = await getAuthState(sessionUserId);
    const readerId = authState.user?.personId;

    if (!readerId) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await markChatThreadAsRead(sessionUserId, body.threadId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update thread." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const authState = await getAuthState(sessionUserId);
    const personId = authState.user?.personId;

    if (!personId) {
      return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const deleted = await deleteChatMessage(sessionUserId, body.threadId, body.messageId);
    if (!deleted) {
      return NextResponse.json({ ok: false, message: "Message not found or forbidden." }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to delete message." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
