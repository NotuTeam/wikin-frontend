import { NextRequest, NextResponse } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import { saveSimulationResult } from "@/server/db/results";
import { SimulationResultData } from "@/types";

function unauthorized() {
  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
    const user = verifySession(token);
    if (!user) return unauthorized();

    const body = (await req.json()) as { result?: SimulationResultData };
    const result = body?.result;

    if (!result || !Array.isArray(result.sectionScores) || !Array.isArray(result.sections)) {
      return NextResponse.json(
        { success: false, error: "Invalid result payload" },
        { status: 400 },
      );
    }

    const saved = await saveSimulationResult({
      userGoogleSub: user.sub,
      result,
    });

    return NextResponse.json({
      success: true,
      data: {
        resultId: saved.id,
        createdAt: saved.createdAt,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
