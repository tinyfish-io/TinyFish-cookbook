import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Tinyfish Agent streaming event types (normalized)
export interface TinyFishAgentEvent {
  type: "STEP" | "COMPLETE" | "ERROR" | string;
  status?: string;
  message?: string;
  resultJson?: unknown;
  streamingUrl?: string;
  step?: number;
  totalSteps?: number;
}

/**
 * Parse an SSE line into a TinyFishAgentEvent
 */
export function parseSSELine(line: string): TinyFishAgentEvent | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  try {
    return JSON.parse(line.slice(6)) as TinyFishAgentEvent;
  } catch {
    return null;
  }
}

/**
 * Check if event indicates successful completion
 */
export function isCompleteEvent(event: TinyFishAgentEvent): boolean {
  return event.type === "COMPLETE" && event.status === "COMPLETED";
}

/**
 * Check if event indicates an error
 */
export function isErrorEvent(event: TinyFishAgentEvent): boolean {
  return event.type === "ERROR" || event.status === "FAILED";
}

/**
 * Format a step event into a readable message
 */
export function formatStepMessage(event: TinyFishAgentEvent): string {
  const stepInfo = event.step && event.totalSteps
    ? `[${event.step}/${event.totalSteps}]`
    : "[STEP]";
  return `${stepInfo} ${event.message || "Processing..."}`;
}
