import { NextRequest } from "next/server";
import {
  type Difficulty,
  type ListeningSection,
  generateByEndpoint,
} from "@/server/http/questions";
import { logResponse } from "@/server/logger/responseLog";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get("endpoint") || "";
  const difficulty =
    (req.nextUrl.searchParams.get("difficulty") as Difficulty) || "MEDIUM";
  const section =
    (req.nextUrl.searchParams.get("section") as ListeningSection) ||
    "SECTION_1";
  const attemptId =
    req.nextUrl.searchParams.get("requestId") || undefined;
  const startedAt = Date.now();

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, payload: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      try {
        send("progress", { stage: "queued", message: "Request received" });
        send("progress", {
          stage: "preparing",
          message: "Preparing prompt and schema",
        });

        send("progress", {
          stage: "generating",
          message: `Generating ${endpoint}`,
        });

        const data = await generateByEndpoint(endpoint, difficulty, section);

        await logResponse({
          endpoint,
          difficulty,
          section,
          attemptId,
          success: true,
          durationMs: Date.now() - startedAt,
          data,
        });

        send("progress", { stage: "finalizing", message: "Finalizing response" });
        send("done", { success: true, data });
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Generation failed";

        await logResponse({
          endpoint,
          difficulty,
          section,
          attemptId,
          success: false,
          durationMs: Date.now() - startedAt,
          error: message,
        });

        send("error", { success: false, error: message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
