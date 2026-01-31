/**
 * Mino API client for QA test execution with streaming callbacks
 */

import { parseSSELine, isCompleteEvent, isErrorEvent, formatStepMessage, MinoEvent } from "./utils";

const MINO_API_URL = "https://mino.ai/v1/automation/run-sse";

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

export interface MinoStreamCallbacks {
  onStreamingUrl?: (url: string) => void;
  onStep?: (step: string, event: MinoEvent) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: string) => void;
}

/**
 * Execute a Mino automation task with streaming callbacks
 */
export async function runMinoAutomation(
  config: MinoRequestConfig,
  apiKey?: string,
  callbacks?: MinoStreamCallbacks
): Promise<MinoResponse> {
  const key = apiKey || process.env.MINO_API_KEY;

  if (!key) {
    throw new Error("MINO_API_KEY is required. Set it in .env or pass as parameter.");
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
          callbacks?.onStreamingUrl?.(event.streamingUrl);
        }

        // Report step progress
        if (event.type === "STEP") {
          const stepMessage = formatStepMessage(event);
          callbacks?.onStep?.(stepMessage, event);
        }

        // Check for completion
        if (isCompleteEvent(event)) {
          callbacks?.onComplete?.(event.resultJson);
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
          callbacks?.onError?.(errorMsg);
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
    callbacks?.onError?.(errorMsg);
    return {
      success: false,
      error: errorMsg,
      events,
    };
  }
}

/**
 * Build a Mino goal from test steps
 */
export function buildGoalFromSteps(
  steps: Array<{
    action: string;
    target?: string;
    value?: string;
    goal: string;
    expectedOutcome?: string;
  }>,
  expectedOutcome?: string
): string {
  const stepDescriptions = steps
    .map((step, index) => `${index + 1}. ${step.goal}`)
    .join("\n");

  let goal = `Execute the following test steps in order:\n\n${stepDescriptions}\n\n`;

  if (expectedOutcome) {
    goal += `Expected final outcome: ${expectedOutcome}\n\n`;
  }

  goal += `After completing all steps, return a JSON result with:
{
  "success": true/false,
  "stepsCompleted": number,
  "failedAtStep": number or null,
  "error": "error message if failed" or null,
  "extractedData": { any data extracted during the test }
}`;

  return goal;
}

/**
 * Build a Mino goal from plain English test description
 */
export function buildGoalFromDescription(
  description: string,
  expectedOutcome?: string
): string {
  let goal = `Execute the following test:\n\n${description}\n\n`;

  if (expectedOutcome) {
    goal += `Expected outcome: ${expectedOutcome}\n\n`;
  }

  goal += `After completing the test, return a JSON result with:
{
  "success": true/false,
  "error": "error message if failed" or null,
  "extractedData": { any data extracted during the test },
  "observations": ["list of observations about what happened"]
}`;

  return goal;
}

/**
 * Convenience function for simple scraping/testing tasks
 */
export async function scrape(
  url: string,
  goal: string,
  options?: {
    apiKey?: string;
    stealth?: boolean;
    proxy?: string;
    callbacks?: MinoStreamCallbacks;
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

  const response = await runMinoAutomation(config, options?.apiKey, options?.callbacks);

  if (!response.success) {
    throw new Error(response.error || "Automation failed");
  }

  return response.result;
}
