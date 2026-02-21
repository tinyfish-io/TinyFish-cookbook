import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Utility functions for parsing and handling Mino API responses
 */

export interface MinoEvent {
  type: string;
  status?: string;
  resultJson?: unknown;
  streamingUrl?: string;
  message?: string;
  step?: string;
  [key: string]: unknown;
}

/**
 * Parses a single SSE line into a MinoEvent object
 */
export function parseSSELine(line: string): MinoEvent | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  try {
    const jsonStr = line.slice(6);
    return JSON.parse(jsonStr) as MinoEvent;
  } catch (error) {
    console.error("Failed to parse SSE line:", line, error);
    return null;
  }
}

/**
 * Checks if an event represents a completion
 */
export function isCompleteEvent(event: MinoEvent): boolean {
  return event.type === "COMPLETE" && event.status === "COMPLETED";
}

/**
 * Checks if an event represents an error
 */
export function isErrorEvent(event: MinoEvent): boolean {
  return event.type === "ERROR" || event.status === "FAILED";
}

/**
 * Extracts result data from a completion event
 */
export function extractResult(event: MinoEvent): unknown {
  if (!isCompleteEvent(event)) {
    throw new Error("Event is not a completion event");
  }
  return event.resultJson;
}

/**
 * Formats a step event for logging
 */
export function formatStepMessage(event: MinoEvent): string {
  if (event.type === "STEP") {
    return `[STEP] ${event.step || event.message || "Processing..."}`;
  }
  return `[${event.type}] ${event.message || JSON.stringify(event)}`;
}
