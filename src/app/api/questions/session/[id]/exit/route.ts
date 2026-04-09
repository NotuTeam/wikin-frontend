import { NextRequest } from "next/server";
import { exitSession } from "@/server/http/questions";
import { fail, ok } from "@/server/http/responses";

export const runtime = "nodejs";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const session = exitSession(id);

    if (!session) {
      return fail("session not found", 404);
    }

    return ok(session);
  } catch (error) {
    return fail(error, 500);
  }
}
