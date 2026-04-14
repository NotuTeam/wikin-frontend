import { NextRequest, NextResponse } from "next/server";
import { readCookie, verifySession } from "@/server/auth/session";
import { getMonthlyRankings } from "@/server/db/results";

export async function GET(req: NextRequest) {
  try {
    const token = readCookie(req.headers.get("cookie") || undefined, "wikin_auth");
    const user = verifySession(token);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const now = new Date();
    const year = parseInt(
      req.nextUrl.searchParams.get("year") || String(now.getFullYear()),
    );
    const month = parseInt(
      req.nextUrl.searchParams.get("month") || String(now.getMonth() + 1),
    );

    if (year < 2020 || year > 2100 || month < 1 || month > 12) {
      return NextResponse.json(
        { success: false, error: "Invalid year or month" },
        { status: 400 },
      );
    }

    const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") || "1"));
    const perPage = Math.min(50, Math.max(1, parseInt(req.nextUrl.searchParams.get("perPage") || "10")));
    const examType = req.nextUrl.searchParams.get("examType") as "toefl" | "ielts" | null;
    const difficulty = req.nextUrl.searchParams.get("difficulty") as "EASY" | "MEDIUM" | "HARD" | null;

    const { rankings, total } = await getMonthlyRankings(year, month, {
      limit: perPage,
      offset: (page - 1) * perPage,
      examType: examType || undefined,
      difficulty: difficulty || undefined,
    });

    return NextResponse.json({
      success: true,
      data: {
        year,
        month,
        rankings,
        pagination: {
          page,
          perPage,
          total,
          totalPages: Math.ceil(total / perPage),
        },
        filters: {
          examType: examType || null,
          difficulty: difficulty || null,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
