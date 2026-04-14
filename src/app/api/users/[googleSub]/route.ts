import { NextRequest, NextResponse } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import { getUserByGoogleSub } from "@/server/db/users";
import { listSimulationResultHistory } from "@/server/db/results";

type Params = { params: Promise<{ googleSub: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
    const user = verifySession(token);
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { googleSub } = await params;
    const targetUser = await getUserByGoogleSub(googleSub);
    if (!targetUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const results = await listSimulationResultHistory(googleSub, 100);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          name: targetUser.name,
          picture: targetUser.picture || undefined,
        },
        results,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
