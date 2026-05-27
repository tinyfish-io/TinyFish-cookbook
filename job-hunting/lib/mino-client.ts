/**
 * Mino API client for job board scraping
 * Calls server-side API routes to keep API keys secure
 */

import { parseSSELine, isCompleteEvent, isErrorEvent, type MinoEvent } from "./utils";

export interface MinoResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  streamingUrl?: string;
  events: MinoEvent[];
}

export interface MinoStreamCallbacks {
  onStep?: (step: string, event: MinoEvent) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: string) => void;
  onStreamingUrl?: (url: string) => void;
}

/**
 * Scrape a job board through the API route
 */
export async function scrapeJobBoard(
  searchUrl: string,
  boardName: string,
  jobSearchCriteria: string,
  callbacks?: MinoStreamCallbacks,
  abortSignal?: AbortSignal
): Promise<MinoResponse> {
  const events: MinoEvent[] = [];
  let streamingUrl: string | undefined;

  try {
    const response = await fetch("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ searchUrl, boardName, jobSearchCriteria }),
      signal: abortSignal,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Scraping failed");
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

        if (event.streamingUrl) {
          streamingUrl = event.streamingUrl;
          callbacks?.onStreamingUrl?.(event.streamingUrl);
        }

        if (event.type === "STEP" || event.type === "PROGRESS") {
          const stepMessage = event.step || event.purpose || event.message || "Processing...";
          callbacks?.onStep?.(stepMessage as string, event);
        }

        if (isCompleteEvent(event)) {
          callbacks?.onComplete?.(event.resultJson);
          return {
            success: true,
            result: event.resultJson,
            streamingUrl,
            events,
          };
        }

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

    return {
      success: false,
      error: "Stream ended without completion event",
      streamingUrl,
      events,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        success: false,
        error: "Request was cancelled",
        events,
      };
    }

    const errorMsg = error instanceof Error ? error.message : String(error);
    callbacks?.onError?.(errorMsg);
    return {
      success: false,
      error: errorMsg,
      events,
    };
  }
}

export interface BoardUpdate {
  status: "pending" | "searching" | "extracting" | "complete" | "error";
  step?: string;
  jobsFound?: number;
  error?: string;
  streamingUrl?: string;
  jobs?: unknown[]; // Include jobs when complete
}

/**
 * Run multiple job board scrapes in parallel
 */
export async function scrapeMultipleBoards(
  boards: Array<{ boardName: string; searchUrl: string }>,
  jobSearchCriteria: string,
  onBoardUpdate: (boardName: string, update: BoardUpdate) => void,
  abortSignal?: AbortSignal
): Promise<Map<string, MinoResponse>> {
  const results = new Map<string, MinoResponse>();

  const promises = boards.map(async ({ boardName, searchUrl }) => {
    onBoardUpdate(boardName, { status: "searching", step: "Starting search..." });

    try {
      const response = await scrapeJobBoard(
        searchUrl,
        boardName,
        jobSearchCriteria,
        {
          onStep: (step) => {
            onBoardUpdate(boardName, { status: "extracting", step });
          },
          onStreamingUrl: (url) => {
            onBoardUpdate(boardName, { status: "searching", streamingUrl: url });
          },
          onComplete: (result) => {
            // Helper to strip markdown code blocks and parse JSON
            const parseJsonString = (str: string): unknown[] => {
              // Remove markdown code blocks if present
              let cleaned = str.trim();
              const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
              if (codeBlockMatch) {
                cleaned = codeBlockMatch[1].trim();
              }
              try {
                const parsed = JSON.parse(cleaned);
                return Array.isArray(parsed) ? parsed : [];
              } catch (e) {
                return [];
              }
            };

            // Handle case where result might be a string that needs parsing
            let jobsArray: unknown[] = [];
            if (Array.isArray(result)) {
              jobsArray = result;
            } else if (typeof result === 'string') {
              jobsArray = parseJsonString(result);
            } else if (result && typeof result === 'object') {
              // Mino wraps results in { result: ... }
              const obj = result as Record<string, unknown>;

              // Check for nested result property first (most common Mino format)
              if (obj.result !== undefined) {
                if (Array.isArray(obj.result)) {
                  jobsArray = obj.result;
                } else if (typeof obj.result === 'string') {
                  jobsArray = parseJsonString(obj.result);
                }
              } else if (Array.isArray(obj.jobs)) {
                jobsArray = obj.jobs;
              } else if (Array.isArray(obj.results)) {
                jobsArray = obj.results;
              } else if (Array.isArray(obj.data)) {
                jobsArray = obj.data;
              }
            }

            // Include the jobs in the update so they can be processed immediately
            onBoardUpdate(boardName, {
              status: "complete",
              jobsFound: jobsArray.length,
              jobs: jobsArray,
            });
          },
          onError: (error) => {
            onBoardUpdate(boardName, { status: "error", error });
          },
        },
        abortSignal
      );

      return { boardName, response };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      onBoardUpdate(boardName, { status: "error", error: errorMsg });
      return {
        boardName,
        response: {
          success: false,
          error: errorMsg,
          events: [],
        } as MinoResponse,
      };
    }
  });

  const settled = await Promise.allSettled(promises);

  settled.forEach((result) => {
    if (result.status === "fulfilled") {
      results.set(result.value.boardName, result.value.response);
    }
  });

  return results;
}

/**
 * Parse scraped jobs into our Job format
 */
export function parseScrapedJobs(
  rawJobs: unknown[],
  sourceBoard: string
): Array<{
  title: string;
  company: string;
  location: string;
  salaryRange?: string;
  remoteStatus?: "remote" | "hybrid" | "onsite";
  description: string;
  fullUrl: string;
  postedDate: string;
  sourceBoard: string;
}> {
  return rawJobs
    .filter((job): job is Record<string, unknown> => typeof job === "object" && job !== null)
    .map((job) => ({
      title: String(job.title || "Unknown Title"),
      company: String(job.company || "Unknown Company"),
      location: String(job.location || "Unknown Location"),
      salaryRange: job.salary ? String(job.salary) : undefined,
      remoteStatus: parseRemoteStatus(job.remoteStatus),
      description: String(job.description || ""),
      fullUrl: String(job.fullUrl || ""),
      postedDate: String(job.postedDate || new Date().toISOString()),
      sourceBoard,
    }))
    .filter((job) => job.title && job.company && job.fullUrl);
}

function parseRemoteStatus(
  status: unknown
): "remote" | "hybrid" | "onsite" | undefined {
  if (typeof status !== "string") return undefined;
  const lower = status.toLowerCase();
  if (lower.includes("remote")) return "remote";
  if (lower.includes("hybrid")) return "hybrid";
  if (lower.includes("onsite") || lower.includes("on-site")) return "onsite";
  return undefined;
}
