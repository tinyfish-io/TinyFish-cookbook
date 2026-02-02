import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Mino SSE Event utilities
export interface MinoEvent {
  type: string;
  status?: string;
  message?: string;
  resultJson?: unknown;
  streamingUrl?: string;
  step?: string;
  purpose?: string;
  action?: string;
  description?: string;
  text?: string;
  content?: string;
  timestamp?: number;
}

export function parseSSELine(line: string): MinoEvent | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  try {
    const data = JSON.parse(line.slice(6));
    return data as MinoEvent;
  } catch {
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
  return (
    event.purpose ||
    event.action ||
    event.message ||
    event.step ||
    event.description ||
    event.text ||
    event.content ||
    "Processing..."
  );
}

// Check if event is a system/internal event to filter out
export function isSystemEvent(event: MinoEvent): boolean {
  const systemTypes = [
    "STARTED",
    "STREAMING_URL",
    "HEARTBEAT",
    "PING",
    "CONNECTED",
    "INIT",
  ];

  const message = formatStepMessage(event);
  return systemTypes.some(
    (se) =>
      message?.toUpperCase?.()?.includes(se) ||
      event.type?.toUpperCase?.()?.includes(se)
  );
}

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// Format duration in human readable form
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

// Truncate text with ellipsis
export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

// Count words in text
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}
