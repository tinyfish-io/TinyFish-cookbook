/**
 * Reusable Mino API client for handling SSE streaming
 */

import { parseSSELine, isCompleteEvent, isErrorEvent, formatStepMessage, MinoEvent } from "./utils";

const MINO_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

export interface MinoRequestConfig {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: {
    enabled: boolean;
    country_code?: "US" | "GB" | "CA" | "DE" | "FR" | "JP" | "AU";
  };
}

export interface MinoResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  streamingUrl?: string;
  events: MinoEvent[];
}

/**
 * Execute a Mino automation task and return the parsed result
 * @param config - Automation configuration
 * @param apiKey - Mino API key (defaults to process.env.TINYFISH_API_KEY)
 * @param verbose - Log step-by-step progress (default: true)
 * @returns Promise with the automation result
 */
export async function runMinoAutomation(
  config: MinoRequestConfig,
  apiKey?: string,
  verbose: boolean = true
): Promise<MinoResponse> {
  const key = apiKey || process.env.TINYFISH_API_KEY;

  if (!key) {
    throw new Error("TINYFISH_API_KEY is required. Set it in .env or pass as parameter.");
  }

  const events: MinoEvent[] = [];
  let streamingUrl: string | undefined;

  try {
    const response = await fetch(MINO_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseSSELine(line);
        if (!event) continue;

        events.push(event);

        // Capture streaming URL if available
        if (event.streamingUrl) {
          streamingUrl = event.streamingUrl;
        }

        // Log progress if verbose
        if (verbose && event.type === "STEP") {
          console.log(formatStepMessage(event));
        }

        // Check for completion
        if (isCompleteEvent(event)) {
          if (verbose) {
            console.log("[SUCCESS] Automation completed");
          }
          return {
            success: true,
            result: event.resultJson,
            streamingUrl,
            events,
          };
        }

        // Check for errors
        if (isErrorEvent(event)) {
          const errorMsg = event.message || "Automation failed";
          if (verbose) {
            console.error(`[ERROR] ${errorMsg}`);
          }
          return {
            success: false,
            error: errorMsg,
            streamingUrl,
            events,
          };
        }
      }
    }

    // If we reach here without completion, it's an unexpected end
    return {
      success: false,
      error: "Stream ended without completion event",
      streamingUrl,
      events,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (verbose) {
      console.error(`[ERROR] ${errorMsg}`);
    }
    return {
      success: false,
      error: errorMsg,
      events,
    };
  }
}

/**
 * Convenience function for simple scraping tasks
 */
export async function scrape(
  url: string,
  goal: string,
  options?: {
    apiKey?: string;
    stealth?: boolean;
    proxy?: string;
    verbose?: boolean;
  }
): Promise<unknown> {
  const config: MinoRequestConfig = {
    url,
    goal,
  };

  if (options?.stealth) {
    config.browser_profile = "stealth";
  }

  if (options?.proxy) {
    config.proxy_config = {
      enabled: true,
      country_code: options.proxy as "US" | "GB" | "CA" | "DE" | "FR" | "JP" | "AU",
    };
  }

  const response = await runMinoAutomation(
    config,
    options?.apiKey,
    options?.verbose ?? true
  );

  if (!response.success) {
    throw new Error(response.error || "Automation failed");
  }

  return response.result;
}
