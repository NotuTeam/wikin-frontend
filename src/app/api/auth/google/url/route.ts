import { NextResponse } from "next/server";
import { buildGoogleAuthUrl, createOAuthState } from "@/server/auth/google";

export async function GET() {
  try {
    const state = createOAuthState();
    const url = buildGoogleAuthUrl(state);
    return NextResponse.json({ success: true, data: { url, state } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
