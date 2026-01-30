import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Mino SSE Event utilities
export interface MinoEvent {
  type: string;
  status?: string;
  message?: string;
  resultJson?: unknown;
  streamingUrl?: string;
  step?: string;
  timestamp?: number;
}

export function parseSSELine(line: string): MinoEvent | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  try {
    const data = JSON.parse(line.slice(6));
    return data as MinoEvent;
  } catch (error) {
    console.error("Failed to parse SSE line:", error);
    return null;
  }
}

export function isCompleteEvent(event: MinoEvent): boolean {
  return event.type === "COMPLETE" && event.status === "COMPLETED";
}

export function isErrorEvent(event: MinoEvent): boolean {
  return event.type === "ERROR" || event.status === "FAILED";
}

export function formatStepMessage(event: MinoEvent): string {
  if (event.step) {
    return `[STEP] ${event.step}`;
  }
  if (event.message) {
    return `[INFO] ${event.message}`;
  }
  return `[INFO] Processing...`;
}
