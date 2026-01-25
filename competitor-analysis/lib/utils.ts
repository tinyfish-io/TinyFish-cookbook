import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mino SSE Event Types
export interface MinoEvent {
  type: "STEP" | "COMPLETE" | "ERROR" | string;
  status?: string;
  message?: string;
  resultJson?: unknown;
  streamingUrl?: string;
  step?: number;
  totalSteps?: number;
}

/**
 * Parse an SSE line into a MinoEvent
 */
export function parseSSELine(line: string): MinoEvent | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  try {
    return JSON.parse(line.slice(6)) as MinoEvent;
  } catch {
    return null;
  }
}

/**
 * Check if event indicates successful completion
 */
export function isCompleteEvent(event: MinoEvent): boolean {
  return event.type === "COMPLETE" && event.status === "COMPLETED";
}

/**
 * Check if event indicates an error
 */
export function isErrorEvent(event: MinoEvent): boolean {
  return event.type === "ERROR" || event.status === "FAILED";
}

/**
 * Format a step event into a readable message
 */
export function formatStepMessage(event: MinoEvent): string {
  const stepInfo = event.step && event.totalSteps
    ? `[${event.step}/${event.totalSteps}]`
    : "[STEP]";
  return `${stepInfo} ${event.message || "Processing..."}`;
}
