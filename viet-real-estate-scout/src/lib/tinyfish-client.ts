// TinyFish SSE scraper client — abstracts per-site streaming logic

const TINYFISH_SSE_URL = 'https://agent.tinyfish.ai/v1/automation/run-sse';
export const REQUEST_TIMEOUT_MS = 780_000;

// TinyFish SSE event shape — fields use snake_case from the API
type TinyFishEvent = {
  type?: string;        // STARTED, STREAMING_URL, PROGRESS, HEARTBEAT, COMPLETE
  status?: string;      // COMPLETED (on COMPLETE events)
  result?: unknown;     // Result data (on COMPLETE events) — NOT "resultJson"
  streaming_url?: string; // Live browser URL — snake_case, NOT camelCase
  run_id?: string;
  purpose?: string;
};

export const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

export const elapsedSeconds = (startedAt: number) =>
  ((Date.now() - startedAt) / 1000).toFixed(1);

/**
 * Runs TinyFish SSE for a single site URL.
 * Calls enqueue() with STREAMING_URL and LISTING_RESULT events.
 * Returns true on success, false on any error.
 */
export async function runTinyFishForSite(
  url: string,
  goal: string,
  apiKey: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  console.log(`[TINYFISH] Starting: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(TINYFISH_SSE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({ url, goal }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`TinyFish request failed (${response.status})`);
    }
    if (!response.body) {
      throw new Error('TinyFish response body is empty');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let resultData: unknown;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;

        let event: TinyFishEvent;
        try {
          event = JSON.parse(line.slice(6));
        } catch {
          continue;
        }

        // Forward live browser streaming URL to client
        // TinyFish uses snake_case: "streaming_url" (not "streamingUrl")
        if (event.type === 'STREAMING_URL' && event.streaming_url) {
          enqueue({ type: 'STREAMING_URL', siteUrl: url, streamingUrl: event.streaming_url });
        }

        // TinyFish sends type: "COMPLETE" with status: "COMPLETED" and result: {...}
        // Enqueue IMMEDIATELY — don't wait for stream to close
        if (event.type === 'COMPLETE' && event.status === 'COMPLETED' && event.result) {
          enqueue({ type: 'LISTING_RESULT', siteUrl: url, listing: event.result });
          console.log(`[TINYFISH] Complete: ${url} (${elapsedSeconds(startedAt)}s)`);
          resultData = event.result;
        }
      }
    }

    if (!resultData) {
      throw new Error('TinyFish stream finished without COMPLETE result');
    }
    return true;
  } catch (error) {
    console.error(`[TINYFISH] Failed: ${url}`, error);
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}
