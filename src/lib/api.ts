import { Difficulty } from "@/types";

export class StreamAbortedError extends Error {
  constructor() {
    super("Stream generation was aborted");
    this.name = "StreamAbortedError";
  }
}

export async function streamGenerate(
  endpoint: string,
  difficulty: Difficulty,
  body: Record<string, string | number>, 
  onProgress: (message: string) => void,
  signal?: AbortSignal
): Promise<any> {
  if (signal?.aborted) {
    return Promise.reject(new StreamAbortedError());
  }

  return await new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const params = new URLSearchParams({
      endpoint,
      difficulty,
      ...body,
      requestId,
    });
    const url = `/api/questions/stream?${params.toString()}`;
    const source = new EventSource(url);

    const cleanup = () => {
      source.close();
      if (onAbort) signal!.removeEventListener("abort", onAbort);
    };

    let onAbort: (() => void) | null = null;
    if (signal) {
      onAbort = () => {
        cleanup();
        reject(new StreamAbortedError());
      };
      signal.addEventListener("abort", onAbort, { once: true });
    }

    source.addEventListener("progress", (event) => {
      if (signal?.aborted) return;
      const data = JSON.parse((event as MessageEvent).data);
      onProgress(data.message || "Processing...");
    });

    source.addEventListener("done", (event) => {
      cleanup();
      if (signal?.aborted) return;
      const data = JSON.parse((event as MessageEvent).data);
      if (data.success) resolve(data.data);
      else reject(new Error(data.error || "Failed to generate"));
    });

    source.addEventListener("error", (event) => {
      cleanup();
      if (signal?.aborted) return;
      const messageEvent = event as MessageEvent;
      if (messageEvent.data) {
        const data = JSON.parse(messageEvent.data);
        reject(new Error(data.error || "Generation failed"));
      } else {
        reject(new Error("Connection lost during generation"));
      }
    });
  });
}
