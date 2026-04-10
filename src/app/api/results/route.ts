import { NextRequest, NextResponse } from "next/server";
import {
  listSimulationResultHistory,
  listSimulationResults,
  getProgressOverview,
} from "@/server/db/results";
import { readCookie, verifySession } from "@/server/auth/session";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export async function GET(req: NextRequest) {
  try {
    const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
    const user = verifySession(token);
    if (!user) return unauthorized();

    const mode = req.nextUrl.searchParams.get("mode");
    const limitRaw = req.nextUrl.searchParams.get("limit");
    const parsedLimit = limitRaw ? Number(limitRaw) : NaN;
    const limit = Number.isFinite(parsedLimit)
      ? Math.max(1, Math.min(50, parsedLimit))
      : 20;

    if (mode === "overview") {
      const overview = await getProgressOverview(user.sub);
      return NextResponse.json({ success: true, data: overview });
    }

    if (mode === "history") {
      const results = await listSimulationResultHistory(user.sub, limit);
      return NextResponse.json({ success: true, data: { results } });
    }

    const results = await listSimulationResults(user.sub, limit);
    return NextResponse.json({ success: true, data: { results } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
