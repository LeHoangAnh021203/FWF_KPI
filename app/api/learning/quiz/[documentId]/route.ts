import { NextResponse } from "next/server";
import {
  getLearningQuiz,
  createLearningQuiz,
  updateLearningQuiz,
  deleteLearningQuiz,
  getDocumentRealtimeAudience,
  getAuthState
} from "@/lib/server/data";
import { publishAppEventToPersons } from "@/lib/server/realtime";
import { getSessionUserId } from "@/lib/server/session";

type Params = { params: Promise<{ documentId: string }> };

export async function GET(_req: Request, { params }: Params) {
  try {
    const { documentId } = await params;
    const sessionUserId = await getSessionUserId();
    const quiz = await getLearningQuiz(sessionUserId, documentId);
    return NextResponse.json({ quiz });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, message: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { documentId } = await params;
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const quiz = await createLearningQuiz(sessionUserId, { ...body, documentId });
    const [authState, audience] = await Promise.all([getAuthState(sessionUserId), getDocumentRealtimeAudience(documentId)]);
    void publishAppEventToPersons(audience.personIds, {
      type: "learning.updated",
      actorId: authState.user?.personId ?? "system",
      action: "created",
      entityType: "quiz",
      entityLabel: audience.documentName,
      entityId: quiz.id,
      occurredAt: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, quiz });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, message: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { documentId: _ } = await params;
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const { quizId, ...updates } = body as { quizId: string } & Parameters<typeof updateLearningQuiz>[2];
    const quiz = await updateLearningQuiz(sessionUserId, quizId, updates);
    if (!quiz) return NextResponse.json({ ok: false, message: "Quiz not found." }, { status: 404 });
    const [authState, audience] = await Promise.all([getAuthState(sessionUserId), getDocumentRealtimeAudience(quiz.documentId)]);
    void publishAppEventToPersons(audience.personIds, {
      type: "learning.updated",
      actorId: authState.user?.personId ?? "system",
      action: "updated",
      entityType: "quiz",
      entityLabel: audience.documentName,
      entityId: quiz.id,
      occurredAt: new Date().toISOString()
    });
    return NextResponse.json({ ok: true, quiz });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, message: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { documentId } = await params;
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const audience = await getDocumentRealtimeAudience(documentId);
    const deleted = await deleteLearningQuiz(sessionUserId, body.quizId as string);
    if (!deleted) return NextResponse.json({ ok: false, message: "Quiz not found." }, { status: 404 });
    const authState = await getAuthState(sessionUserId);
    void publishAppEventToPersons(audience.personIds, {
      type: "learning.updated",
      actorId: authState.user?.personId ?? "system",
      action: "deleted",
      entityType: "quiz",
      entityLabel: audience.documentName,
      entityId: body.quizId as string,
      occurredAt: new Date().toISOString()
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, message: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}
