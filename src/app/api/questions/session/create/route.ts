import { NextRequest } from "next/server";
import { createSession } from "@/server/http/questions";
import { fail, ok } from "@/server/http/responses";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      examType?: "toefl" | "ielts";
      difficulty?: "EASY" | "MEDIUM" | "HARD";
      payload?: Record<string, unknown>;
    };

    if (!body?.examType || !body?.difficulty) {
      return fail("examType and difficulty are required", 400);
    }

    const session = createSession({
      examType: body.examType,
      difficulty: body.difficulty,
      payload: body.payload,
    });

    return ok(session);
  } catch (error) {
    return fail(error, 500);
  }
}
