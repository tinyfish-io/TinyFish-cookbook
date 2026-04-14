/**
 * Reusable Tinyfish Agent client for handling streaming runs.
 */

import { isCompleteEvent, isErrorEvent, formatStepMessage, TinyFishAgentEvent } from "./utils";
import { TinyFish } from "@tiny-fish/sdk";

export interface TinyFishAgentRequestConfig {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: {
    enabled: boolean;
    country_code?: "US" | "GB" | "CA" | "DE" | "FR" | "JP" | "AU";
  };
}

export interface TinyFishAgentResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  streamingUrl?: string;
  events: TinyFishAgentEvent[];
}

/**
 * Execute a Tinyfish Agent automation task and return the parsed result.
 * @param config - Automation configuration
 * @param apiKey - Tinyfish API key (defaults to process.env.TINYFISH_API_KEY)
 * @param verbose - Log step-by-step progress (default: true)
 */
export async function runTinyFishAgentAutomation(
  config: TinyFishAgentRequestConfig,
  apiKey?: string,
  verbose: boolean = true
): Promise<TinyFishAgentResponse> {
  const key = apiKey || process.env.TINYFISH_API_KEY;

  if (!key) {
    throw new Error("TINYFISH_API_KEY is required. Set it in .env or pass as parameter.");
  }

  const events: TinyFishAgentEvent[] = [];
  let streamingUrl: string | undefined;

  try {
    const client = new TinyFish({ apiKey: key });
    const stream = await client.agent.stream(config);

    for await (const rawEvent of stream) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const sdkEvent: any = rawEvent;

      const normalized: TinyFishAgentEvent = {
        type: sdkEvent.type,
        status: sdkEvent.status,
        message: sdkEvent.message,
        streamingUrl: sdkEvent.streamingUrl,
        resultJson: sdkEvent.resultJson ?? sdkEvent.result,
        step: sdkEvent.step,
        totalSteps: sdkEvent.totalSteps,
      };

      events.push(normalized);

      if (normalized.streamingUrl) {
        streamingUrl = normalized.streamingUrl;
      }

      if (verbose && normalized.type === "STEP") {
        console.log(formatStepMessage(normalized));
      }

      if (isCompleteEvent(normalized)) {
        if (verbose) {
          console.log("[SUCCESS] Automation completed");
        }
        return {
          success: true,
          result: normalized.resultJson,
          streamingUrl,
          events,
        };
      }

      if (isErrorEvent(normalized)) {
        const errorMsg = normalized.message || "Automation failed";
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
 * Convenience function for simple scraping tasks.
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
  const config: TinyFishAgentRequestConfig = {
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

  const response = await runTinyFishAgentAutomation(config, options?.apiKey, options?.verbose ?? true);

  if (!response.success) {
    throw new Error(response.error || "Automation failed");
  }

  return response.result;
}

