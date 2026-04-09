import { NextResponse } from "next/server";
import { getUserNotifications, markUserNotificationsAsRead } from "@/lib/server/data";
import { getSessionUserId } from "@/lib/server/session";

export async function GET(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const { searchParams } = new URL(request.url);
    const limitParam = Number(searchParams.get("limit"));
    const unreadOnlyParam = searchParams.get("unreadOnly");
    const cursorParam = searchParams.get("cursor")?.trim() || undefined;
    const result = await getUserNotifications(sessionUserId, {
      limit: Number.isFinite(limitParam) ? limitParam : undefined,
      unreadOnly: unreadOnlyParam === "true",
      cursor: cursorParam
    });
    return NextResponse.json({
      ok: true,
      notifications: result.notifications,
      unreadCount: result.unreadCount,
      hasMore: result.hasMore,
      nextCursor: result.nextCursor
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to load notifications." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const sessionUserId = await getSessionUserId();
    const body = (await request.json()) as { ids?: string[] };
    const result = await markUserNotificationsAsRead(sessionUserId, body.ids);
    return NextResponse.json({ ok: true, updatedCount: result.updatedCount });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Failed to update notifications." },
      { status: error instanceof Error && error.message === "Unauthorized" ? 401 : 500 }
    );
  }
}
