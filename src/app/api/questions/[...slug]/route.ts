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
  try {
    const { slug } = await params;
    const endpoint = `/${(slug || []).join("/")}`;

    const body = (await req.json().catch(() => ({}))) as {
      difficulty?: Difficulty;
      section?: ListeningSection;
    };

    const difficulty = body.difficulty || "MEDIUM";
    const section = body.section || "SECTION_1";

    const data = await generateByEndpoint(endpoint, difficulty, section);
    return ok(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal Server Error";
    if (message === "Unsupported endpoint") {
      return fail("Unsupported endpoint", 404);
    }
    return fail(error, 500);
  }
}
