import { NextResponse } from "next/server";
import { createRegistrationOtp } from "@/lib/server/data";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await createRegistrationOtp(body);
    return NextResponse.json(result, { status: result.ok ? 200 : 400 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : "Gửi OTP thất bại." },
      { status: 500 }
    );
  }
}
