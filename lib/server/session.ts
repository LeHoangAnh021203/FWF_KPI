import { cookies } from "next/headers";

export const SESSION_COOKIE_NAME = "fwf-kpi-session";

export async function getSessionUserId() {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value ?? null;
}
