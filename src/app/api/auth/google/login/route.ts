import { NextResponse } from "next/server";
import {
  buildGoogleAuthUrl,
  createOAuthState,
  getOAuthStateCookie,
} from "@/server/auth/google";

export async function GET() {
  try {
    const state = createOAuthState();
    const url = buildGoogleAuthUrl(state);
    const response = NextResponse.redirect(url);
    response.headers.set("Set-Cookie", getOAuthStateCookie(state));
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
