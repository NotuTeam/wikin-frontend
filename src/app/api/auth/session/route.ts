import { NextRequest, NextResponse } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import { isAdminEmail } from "@/server/auth/admin";

export async function GET(req: NextRequest) {
  const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
  const user = verifySession(token);

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      user: {
        ...user,
        isAdmin: isAdminEmail(user.email),
      },
    },
  });
}
