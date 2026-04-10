import { NextRequest, NextResponse } from "next/server";
import { getSimulationResultById } from "@/server/db/results";
import { readCookie, verifySession } from "@/server/auth/session";

type Params = { params: Promise<{ id: string }> };

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
    const user = verifySession(token);
    if (!user) return unauthorized();

    const { id } = await params;
    const result = await getSimulationResultById(user.sub, id);

    if (!result) {
      return NextResponse.json({ success: false, error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: { result } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
