import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names with Tailwind merge support
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Format a date relative to now
 */
export function formatRelativeDate(date: string | Date): string {
  const now = new Date();
  const target = new Date(date);
  const diffMs = now.getTime() - target.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return target.toLocaleDateString();
}

/**
 * Check if a job is new (posted within 24 hours)
 */
export function isNewJob(postedDate: string | Date): boolean {
  const now = new Date();
  const posted = new Date(postedDate);
  const diffMs = now.getTime() - posted.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);
  return diffHours < 24;
}

/**
 * Get match score color class
 */
export function getMatchScoreColor(score: number): string {
  if (score >= 80) return "text-match-excellent";
  if (score >= 50) return "text-match-good";
  return "text-match-poor";
}

/**
 * Get match score background color class
 */
export function getMatchScoreBgColor(score: number): string {
  if (score >= 80) return "bg-match-excellent";
  if (score >= 50) return "bg-match-good";
  return "bg-match-poor";
}

/**
 * Format salary range
 */
export function formatSalary(min?: number, max?: number): string {
  if (!min && !max) return "Not specified";

  const formatNum = (n: number) => {
    if (n >= 1000) return `$${(n / 1000).toFixed(0)}k`;
    return `$${n}`;
  };

  if (min && max) return `${formatNum(min)} - ${formatNum(max)}`;
  if (min) return `${formatNum(min)}+`;
  if (max) return `Up to ${formatNum(max)}`;
  return "Not specified";
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Create a hash from job details for deduplication
 */
export function createJobHash(company: string, title: string, location: string): string {
  const normalize = (s: string) => s.toLowerCase().trim().replace(/\s+/g, " ");
  return `${normalize(company)}_${normalize(title)}_${normalize(location)}`;
}

/**
 * SSE parsing utilities (from original utils.ts)
 */
export interface MinoEvent {
  type: string;
  status?: string;
  resultJson?: unknown;
  streamingUrl?: string;
  message?: string;
  step?: string;
  purpose?: string; // Mino uses "purpose" in PROGRESS events
  runId?: string;
  [key: string]: unknown;
}

export function parseSSELine(line: string): MinoEvent | null {
  if (!line.startsWith("data: ")) {
    return null;
  }

  try {
    const jsonStr = line.slice(6);
    const parsed = JSON.parse(jsonStr) as MinoEvent;
    return parsed;
  } catch (error) {
    return null;
  }
}

export function isCompleteEvent(event: MinoEvent): boolean {
  // Handle various completion formats Mino might use
  if (event.type === "COMPLETE") {
    return event.status === "COMPLETED" || event.status === "completed" || !event.status;
  }
  if (event.type === "RESULT" || event.type === "DONE") {
    return true;
  }
  return false;
}

export function isErrorEvent(event: MinoEvent): boolean {
  return event.type === "ERROR" || event.status === "FAILED" || event.status === "failed";
}

export function extractResult(event: MinoEvent): unknown {
  if (!isCompleteEvent(event)) {
    throw new Error("Event is not a completion event");
  }
  return event.resultJson;
}

export function formatStepMessage(event: MinoEvent): string {
  if (event.type === "STEP") {
    return `[STEP] ${event.step || event.message || "Processing..."}`;
  }
  return `[${event.type}] ${event.message || JSON.stringify(event)}`;
}
