import { NextRequest } from "next/server";
import { reviewIeltsWriting } from "@/server/http/questions";
import { fail, ok } from "@/server/http/responses";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { task?: unknown; answer?: string };

    if (!body?.task) {
      return fail("task is required", 400);
    }

    const review = await reviewIeltsWriting(body.task, body.answer || "");
    return ok(review);
  } catch (error) {
    return fail(error, 500);
  }
}
