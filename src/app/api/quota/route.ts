import { NextRequest, NextResponse } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import { getDailyQuotaUsage } from "@/server/db/results";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  try {
    const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
    const user = verifySession(token);
    if (!user) return unauthorized();

    const { used, limit } = await getDailyQuotaUsage(user.sub);

    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const resetsAt = tomorrow.toISOString();

    return NextResponse.json({
      success: true,
      data: {
        used,
        remaining: Math.max(0, limit - used),
        limit,
        resetsAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
