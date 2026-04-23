import { NextResponse } from "next/server";
import {
  getLearningQuiz,
  createLearningQuiz,
  updateLearningQuiz,
  deleteLearningQuiz,
} from "@/lib/server/data";
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
    return NextResponse.json({ ok: true, quiz });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, message: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { documentId } = await params;
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const { quizId, ...updates } = body as { quizId: string } & Parameters<typeof updateLearningQuiz>[2];
    const quiz = await updateLearningQuiz(sessionUserId, quizId, updates);
    if (!quiz) return NextResponse.json({ ok: false, message: "Quiz not found." }, { status: 404 });
    return NextResponse.json({ ok: true, quiz });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, message: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const { documentId: _ } = await params;
    const sessionUserId = await getSessionUserId();
    const body = await request.json();
    const deleted = await deleteLearningQuiz(sessionUserId, body.quizId as string);
    if (!deleted) return NextResponse.json({ ok: false, message: "Quiz not found." }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, message: msg }, { status: msg === "Unauthorized" ? 401 : 403 });
  }
}
