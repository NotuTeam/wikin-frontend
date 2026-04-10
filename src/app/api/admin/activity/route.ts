import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/server/auth/guards";
import { listUsers } from "@/server/db/users";
import { getResultStatsByUserGoogleSubs } from "@/server/db/results";

export async function GET(req: NextRequest) {
  try {
    const auth = isAdminRequest(req);
    if (!auth.ok) {
      const status = auth.reason === "unauthorized" ? 401 : 403;
      return NextResponse.json({ success: false, error: "Forbidden" }, { status });
    }

    const users = await listUsers(200);
    const statsMap = await getResultStatsByUserGoogleSubs(users.map((u) => u.googleSub));

    const data = users.map((user) => {
      const stats = statsMap.get(user.googleSub);
      return {
        id: user.id,
        googleSub: user.googleSub,
        email: user.email,
        name: user.name,
        picture: user.picture || undefined,
        createdAt: user.createdAt,
        simulationCount: stats?.simulationCount || 0,
        latestResultAt: stats?.latestResultAt || null,
      };
    });

    return NextResponse.json({ success: true, data: { users: data } });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 },
    );
  }
}
