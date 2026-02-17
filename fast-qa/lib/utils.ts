import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Generate unique IDs
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Format duration in ms to human readable
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}

// Format relative time
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}d ago`;
  return new Date(timestamp).toLocaleDateString();
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
  if (event.purpose) {
    return event.purpose;
  }
  if (event.action) {
    return event.action;
  }
  if (event.step) {
    return event.step;
  }
  if (event.message) {
    return event.message;
  }
  return "Processing...";
}

// URL validation
export function isValidUrl(string: string): boolean {
  try {
    const url = new URL(string);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

// Truncate text with ellipsis
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Get status color class
export function getStatusColor(status: string): string {
  switch (status) {
    case 'passed':
      return 'text-green-500';
    case 'failed':
    case 'error':
      return 'text-red-500';
    case 'running':
      return 'text-amber-500';
    case 'pending':
    case 'skipped':
      return 'text-muted-foreground';
    default:
      return 'text-muted-foreground';
  }
}

export function getStatusBgColor(status: string): string {
  switch (status) {
    case 'passed':
      return 'bg-green-500/10 border-green-500/20';
    case 'failed':
    case 'error':
      return 'bg-red-500/10 border-red-500/20';
    case 'running':
      return 'bg-amber-500/10 border-amber-500/20';
    case 'pending':
    case 'skipped':
      return 'bg-muted/50 border-border';
    default:
      return 'bg-muted/50 border-border';
  }
}
