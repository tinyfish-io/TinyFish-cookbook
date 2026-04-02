// TinyFish Web Agent client — direct REST/SSE integration
// Uses the streaming SSE endpoint for real-time automation events

export interface TinyFishEvent {
  type: string;
  status?: string;
  message?: string;
  resultJson?: unknown;
  runId?: string;
  [key: string]: unknown;
}

const TINYFISH_SSE_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

function getApiKey(): string {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new Error("TINYFISH_API_KEY is not set");
  return key;
}

/**
 * Parse SSE `data:` lines from a raw text chunk.
 */
function parseSSELines(text: string): TinyFishEvent[] {
  const events: TinyFishEvent[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("data: ")) {
      try {
        events.push(JSON.parse(trimmed.slice(6)) as TinyFishEvent);
      } catch {
        // skip malformed lines
      }
    }
  }
  return events;
}

/**
 * Start a TinyFish web automation and invoke `onEvent` for each SSE event.
 * Returns the final completion event (or null if stream ends without one).
 */
export async function runAutomation(
  url: string,
  goal: string,
  onEvent: (event: TinyFishEvent) => void | Promise<void>,
): Promise<TinyFishEvent | null> {
  const apiKey = getApiKey();

  const res = await fetch(TINYFISH_SSE_URL, {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, goal }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`TinyFish API error ${res.status}: ${text}`);
  }

  if (!res.body) throw new Error("TinyFish returned no response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let finalEvent: TinyFishEvent | null = null;
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    // Keep the last (possibly incomplete) line in the buffer
    buffer = lines.pop() || "";

    for (const event of parseSSELines(lines.join("\n"))) {
      await onEvent(event);
      if (
        event.type === "COMPLETE" ||
        event.status === "COMPLETED" ||
        event.status === "completed"
      ) {
        finalEvent = event;
      }
    }
  }

  return finalEvent;
}
