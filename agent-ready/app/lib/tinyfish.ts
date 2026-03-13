/**
 * TinyFish API wrapper
 * Handles SSE streaming calls to the TinyFish web agent API.
 */

const TINYFISH_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

export interface TinyFishRequest {
  url: string;
  goal: string;
  browser_profile?: string;
  proxy_config?: {
    enabled: boolean;
    country_code?: string;
  };
}

export interface TinyFishEvent {
  type: string; // "STARTED" | "STREAMING_URL" | "PROGRESS" | "COMPLETE" | "HEARTBEAT" | "ERROR"
  runId?: string;
  status?: string;
  purpose?: string; // PROGRESS events: describes what the agent is doing
  streamingUrl?: string; // STREAMING_URL events: live browser preview URL
  resultJson?: Record<string, unknown>; // COMPLETE events: structured result
  message?: string;
  result?: string;
  error?: string;
}

/**
 * Calls TinyFish API and returns the final result.
 * Parses SSE stream and extracts the COMPLETE event's resultJson.
 */
export async function runTinyFishAgent(
  request: TinyFishRequest
): Promise<{ success: boolean; data: Record<string, unknown> | null; error?: string }> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return { success: false, data: null, error: "TINYFISH_API_KEY not set" };
  }

  try {
    const response = await fetch(TINYFISH_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      // @ts-expect-error -- undici-specific: disable high-water-mark buffering for real-time SSE
      highWaterMark: 0,
      cache: "no-store" as RequestCache,
      body: JSON.stringify({
        url: request.url,
        goal: request.goal,
        browser_profile: request.browser_profile || "lite",
        proxy_config: request.proxy_config || { enabled: true },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `TinyFish API returned ${response.status}: ${response.statusText}`,
      };
    }

    if (!response.body) {
      return { success: false, data: null, error: "No response body" };
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: Record<string, unknown> | null = null;
    let lastPurpose = "";

    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // SSE events are separated by double newlines
      const events = buffer.split("\n\n");
      buffer = events.pop() || ""; // Keep incomplete event in buffer

      for (const eventBlock of events) {
        const lines = eventBlock.split("\n");
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            eventData += line.slice(6);
          } else if (line.startsWith("data:")) {
            eventData += line.slice(5);
          }
        }

        if (!eventData) continue;

        try {
          const parsed: TinyFishEvent = JSON.parse(eventData);

          if (parsed.purpose) {
            lastPurpose = parsed.purpose;
          }

          if (parsed.type === "COMPLETE" && parsed.status === "COMPLETED") {
            if (parsed.resultJson) {
              finalResult = parsed.resultJson;
            } else if (parsed.result) {
              try {
                finalResult = JSON.parse(parsed.result);
              } catch {
                finalResult = { raw_result: parsed.result };
              }
            }
            streamDone = true;
            break;
          }

          if (parsed.type === "COMPLETE" && parsed.status === "FAILED") {
            reader.cancel();
            return {
              success: false,
              data: null,
              error: parsed.error || "TinyFish agent failed",
            };
          }
        } catch {
          // Not valid JSON, skip
        }
      }
    }

    // Process any remaining data left in the buffer
    if (!finalResult && buffer.trim()) {
      const lines = buffer.split("\n");
      let eventData = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          eventData += line.slice(6);
        } else if (line.startsWith("data:")) {
          eventData += line.slice(5);
        }
      }
      if (eventData) {
        try {
          const parsed: TinyFishEvent = JSON.parse(eventData);
          if (parsed.purpose) lastPurpose = parsed.purpose;
          if (parsed.type === "COMPLETE" && parsed.status === "COMPLETED") {
            if (parsed.resultJson) {
              finalResult = parsed.resultJson;
            } else if (parsed.result) {
              try { finalResult = JSON.parse(parsed.result); } catch { finalResult = { raw_result: parsed.result }; }
            }
          }
        } catch { /* skip */ }
      }
    }

    reader.cancel();

    if (finalResult) {
      return { success: true, data: finalResult };
    }

    return {
      success: true,
      data: { raw_result: lastPurpose || "Agent completed but returned no structured data" },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Calls TinyFish API with a streaming callback for real-time updates.
 * Used to push events to the client via SSE as the agent works.
 */
export async function runTinyFishAgentWithStream(
  request: TinyFishRequest,
  onEvent: (event: TinyFishEvent) => void
): Promise<{ success: boolean; data: Record<string, unknown> | null; error?: string }> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return { success: false, data: null, error: "TINYFISH_API_KEY not set" };
  }

  try {
    const response = await fetch(TINYFISH_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      // @ts-expect-error -- undici-specific: disable high-water-mark buffering for real-time SSE
      highWaterMark: 0,
      cache: "no-store" as RequestCache,
      body: JSON.stringify({
        url: request.url,
        goal: request.goal,
        browser_profile: request.browser_profile || "lite",
        proxy_config: request.proxy_config || { enabled: true },
      }),
    });

    if (!response.ok) {
      return {
        success: false,
        data: null,
        error: `TinyFish API returned ${response.status}: ${response.statusText}`,
      };
    }

    if (!response.body) {
      return { success: false, data: null, error: "No response body" };
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: Record<string, unknown> | null = null;
    let streamDone = false;

    while (!streamDone) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const eventBlock of events) {
        const lines = eventBlock.split("\n");
        let eventData = "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            eventData += line.slice(6);
          } else if (line.startsWith("data:")) {
            eventData += line.slice(5);
          }
        }

        if (!eventData) continue;

        try {
          const parsed: TinyFishEvent = JSON.parse(eventData);
          onEvent(parsed); // Forward to caller

          if (parsed.type === "COMPLETE" && parsed.status === "COMPLETED") {
            if (parsed.resultJson) {
              finalResult = parsed.resultJson;
            } else if (parsed.result) {
              try {
                finalResult = JSON.parse(parsed.result);
              } catch {
                finalResult = { raw_result: parsed.result };
              }
            }
            streamDone = true;
            break;
          }

          if (parsed.type === "COMPLETE" && (parsed.status === "FAILED" || parsed.status === "CANCELLED")) {
            reader.cancel();
            return {
              success: false,
              data: null,
              error: parsed.error || "TinyFish agent failed",
            };
          }
        } catch {
          // Skip unparseable events
        }
      }
    }

    // Process any remaining data left in the buffer (e.g. final event without trailing \n\n)
    if (!finalResult && buffer.trim()) {
      const lines = buffer.split("\n");
      let eventData = "";
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          eventData += line.slice(6);
        } else if (line.startsWith("data:")) {
          eventData += line.slice(5);
        }
      }
      if (eventData) {
        try {
          const parsed: TinyFishEvent = JSON.parse(eventData);
          onEvent(parsed);
          if (parsed.type === "COMPLETE" && parsed.status === "COMPLETED") {
            if (parsed.resultJson) {
              finalResult = parsed.resultJson;
            } else if (parsed.result) {
              try { finalResult = JSON.parse(parsed.result); } catch { finalResult = { raw_result: parsed.result }; }
            }
          }
        } catch { /* skip */ }
      }
    }

    reader.cancel();

    if (finalResult) {
      return { success: true, data: finalResult };
    }

    return {
      success: true,
      data: { raw_result: "Agent completed with no structured data" },
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
