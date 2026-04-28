import { NextRequest } from "next/server";
import {
  type Difficulty,
  type ListeningSection,
  generateByEndpoint,
} from "@/server/http/questions";
import { fail, ok } from "@/server/http/responses";

export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string[] }> };

export async function POST(req: NextRequest, { params }: Params) {
  const requestStartedAt = Date.now();

  try {
    const { slug } = await params;
    const endpoint = `/${(slug || []).join("/")}`;

    const body = (await req.json().catch(() => ({}))) as {
      difficulty?: Difficulty;
      section?: ListeningSection;
    };

    const difficulty = body.difficulty || "MEDIUM";
    const section = body.section || "SECTION_1";

    console.log("[question-gen][api] request:start", {
      endpoint,
      difficulty,
      section,
    });

    const data = await generateByEndpoint(endpoint, difficulty, section);

    console.log("[question-gen][api] request:success", {
      endpoint,
      difficulty,
      section,
      durationMs: Date.now() - requestStartedAt,
    });

    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";

    console.error("[question-gen][api] request:error", {
      durationMs: Date.now() - requestStartedAt,
      message,
      error,
    });

    if (message === "Unsupported endpoint") {
      return fail("Unsupported endpoint", 404);
    }
    return fail(error, 500);
  }
}
