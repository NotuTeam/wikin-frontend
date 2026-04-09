import { NextRequest } from "next/server";
import { getSession, updateSession } from "@/server/http/questions";
import { fail, ok } from "@/server/http/responses";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = getSession(id);

    if (!session) {
      return fail("session not found or expired", 404);
    }

    return ok(session);
  } catch (error) {
    return fail(error, 500);
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = (await req.json()) as { payload?: Record<string, unknown> };
    const result = updateSession(id, body?.payload || {});

    if (!result.ok) {
      const status = result.reason === "expired" ? 410 : 404;
      return fail("session not found or expired", status);
    }

    return ok({
      ...result,
    });
  } catch (error) {
    return fail(error, 500);
  }
}
