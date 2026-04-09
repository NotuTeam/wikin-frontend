import { Difficulty } from "@/types";

export async function streamGenerate(
  endpoint: string,
  difficulty: Difficulty,
  body: Record<string, string>,
  onProgress: (message: string) => void
): Promise<any> {
  return await new Promise((resolve, reject) => {
    const requestId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const params = new URLSearchParams({
      endpoint,
      difficulty,
      ...body,
      requestId,
    });
    const source = new EventSource(`/api/questions/stream?${params.toString()}`);

    source.addEventListener("progress", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      onProgress(data.message || "Processing...");
    });

    source.addEventListener("done", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      source.close();
      if (data.success) resolve(data.data);
      else reject(new Error(data.error || "Failed to generate"));
    });

    source.addEventListener("error", (event) => {
      const messageEvent = event as MessageEvent;
      source.close();
      if (messageEvent.data) {
        const data = JSON.parse(messageEvent.data);
        reject(new Error(data.error || "Generation failed"));
      } else {
        reject(new Error("Connection lost during generation"));
      }
    });
  });
}
