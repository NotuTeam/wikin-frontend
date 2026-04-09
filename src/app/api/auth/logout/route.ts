import { NextResponse } from "next/server";
import { getClearSessionCookie } from "@/server/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true, data: { loggedOut: true } });
  response.headers.set("Set-Cookie", getClearSessionCookie());
  return response;
}
