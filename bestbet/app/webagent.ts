const ENDPOINT = "https://agent.tinyfish.ai/v1/automation/run-sse";

export type MinoSSECallbacks = {
  onStreamingUrl?: (url: string) => void;
  onComplete?: (resultJson: Record<string, unknown>) => void;
};

export async function runMinoSSE(
  url: string,
  goal: string,
  callbacks?: MinoSSECallbacks
): Promise<Record<string, unknown> | null> {
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "X-API-Key": process.env.NEXT_PUBLIC_TINYFISH_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, goal }),
  });

  const reader = response.body?.getReader();
  if (!reader) return null;

  const decoder = new TextDecoder();
  let result: Record<string, unknown> | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;

      try {
        const data = JSON.parse(line.slice(6));

        if (data.type === "STREAMING_URL" && data.streamingUrl) {
          callbacks?.onStreamingUrl?.(data.streamingUrl);
        } else if (data.type === "COMPLETE") {
          result = data.resultJson ?? null;
          callbacks?.onComplete?.(data.resultJson);
        }
      } catch {
        // Not valid JSON, skip
      }
    }
  }

  return result;
}
