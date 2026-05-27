/**
 * Simple in-memory rate limiter using a sliding window.
 * Not shared across instances — good enough for single-process deployments.
 */

const hits = new Map<string, number[]>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 5; // per window per IP

export function rateLimit(ip: string): { ok: boolean; remaining: number } {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const timestamps = (hits.get(ip) || []).filter((t) => t > windowStart);
  hits.set(ip, timestamps);

  if (timestamps.length >= MAX_REQUESTS) {
    return { ok: false, remaining: 0 };
  }

  timestamps.push(now);
  return { ok: true, remaining: MAX_REQUESTS - timestamps.length };
}
