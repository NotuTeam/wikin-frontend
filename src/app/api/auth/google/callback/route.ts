import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForGoogleToken,
  fetchGoogleUserInfo,
  getClearOAuthStateCookie,
  isValidOAuthState,
} from "@/server/auth/google";
import { getSessionCookie, readCookie, signSession } from "@/server/auth/session";
import { upsertGoogleUser } from "@/server/db/users";

function getFrontendUrl() {
  return process.env.FRONTEND_URL || "http://localhost:3000";
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code") || undefined;
    const state = req.nextUrl.searchParams.get("state") || undefined;
    const stateCookie = readCookie(
      req.headers.get("cookie") || undefined,
      "wikin_oauth_state",
    );

    if (!code || !isValidOAuthState(state, stateCookie || undefined)) {
      return NextResponse.json(
        { success: false, error: "Invalid OAuth state/code" },
        { status: 400 },
      );
    }

    const accessToken = await exchangeCodeForGoogleToken(code);
    const profile = await fetchGoogleUserInfo(accessToken);
    const dbUser = await upsertGoogleUser(profile);

    const token = signSession({
      sub: dbUser.googleSub,
      email: dbUser.email,
      name: dbUser.name,
      picture: dbUser.picture || undefined,
    });

    const response = NextResponse.redirect(`${getFrontendUrl()}/auth/callback`);
    response.headers.append("Set-Cookie", getSessionCookie(token));
    response.headers.append("Set-Cookie", getClearOAuthStateCookie());
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
