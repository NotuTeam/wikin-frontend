import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/server/auth/guards";
import { getUserById } from "@/server/db/users";
import { listSimulationResultHistoryByUserId } from "@/server/db/results";

type Params = { params: Promise<{ userId: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  try {
    const auth = isAdminRequest(req);
    if (!auth.ok) {
      const status = auth.reason === "unauthorized" ? 401 : 403;
      return NextResponse.json({ success: false, error: "Forbidden" }, { status });
    }

    const { userId } = await params;
    const user = await getUserById(userId);
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const results = await listSimulationResultHistoryByUserId(userId, 100);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          googleSub: user.googleSub,
          email: user.email,
          name: user.name,
          picture: user.picture || undefined,
          createdAt: user.createdAt,
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
