/**
 * Redis client using Upstash REST API.
 * Handles audit storage, leaderboard, and caching.
 */

import { Redis } from "@upstash/redis";

// Persist in-memory state across Next.js dev-mode HMR reloads
declare global {
  // eslint-disable-next-line no-var
  var __auditEvents: Map<string, AuditEvent[]> | undefined;
  // eslint-disable-next-line no-var
  var __auditListeners: Map<string, ((event: AuditEvent) => void)[]> | undefined;
  // eslint-disable-next-line no-var
  var __redis: Redis | undefined;
}

function getRedis(): Redis | null {
  if (globalThis.__redis) return globalThis.__redis;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn("Redis not configured — running without persistence");
    return null;
  }

  globalThis.__redis = new Redis({ url, token });
  return globalThis.__redis;
}

// =============================================================================
// AUDIT STORAGE (Redis JSON via Upstash REST)
// =============================================================================

export interface StoredAudit {
  url: string;
  domain: string;
  score: number;
  grade: string;
  gradeColor: string;
  tests: Record<string, unknown>;
  topFixes: string[];
  timestamp: string;
}

/**
 * Store an audit result.
 */
export async function storeAudit(domain: string, audit: StoredAudit): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    const key = `audit:${domain}:${Date.now()}`;
    await r.set(key, JSON.stringify(audit), { ex: 86400 * 30 }); // 30 day TTL

    // Also store as "latest" for this domain
    await r.set(`audit:${domain}:latest`, JSON.stringify(audit), { ex: 86400 * 30 });
  } catch (error) {
    console.error("Failed to store audit:", error);
  }
}

/**
 * Get the latest audit for a domain.
 */
export async function getLatestAudit(domain: string): Promise<StoredAudit | null> {
  const r = getRedis();
  if (!r) return null;

  try {
    const data = await r.get(`audit:${domain}:latest`);
    if (!data) return null;
    return typeof data === "string" ? JSON.parse(data) : data as StoredAudit;
  } catch {
    return null;
  }
}

// =============================================================================
// LEADERBOARD (Redis Sorted Set)
// =============================================================================

export interface LeaderboardEntry {
  domain: string;
  score: number;
  grade: string;
  gradeColor: string;
  timestamp: string;
}

/**
 * Add or update a domain's score on the leaderboard.
 */
export async function updateLeaderboard(domain: string, score: number): Promise<void> {
  const r = getRedis();
  if (!r) return;

  try {
    await r.zadd("leaderboard", { score, member: domain });
  } catch (error) {
    console.error("Failed to update leaderboard:", error);
  }
}

/**
 * Get top N sites from the leaderboard.
 */
export async function getLeaderboard(count: number = 20): Promise<LeaderboardEntry[]> {
  const r = getRedis();
  if (!r) return [];

  try {
    // Get top scores (highest first)
    const results = await r.zrange("leaderboard", 0, count - 1, { rev: true, withScores: true });

    const entries: LeaderboardEntry[] = [];

    // Results come as [member, score, member, score, ...]
    for (let i = 0; i < results.length; i += 2) {
      const domain = results[i] as string;
      const score = results[i + 1] as number;

      // Try to get audit details for grade info
      let grade = "Unknown";
      let gradeColor = "#666";
      let timestamp = "";

      try {
        const audit = await getLatestAudit(domain);
        if (audit) {
          grade = audit.grade;
          gradeColor = audit.gradeColor;
          timestamp = audit.timestamp;
        }
      } catch {
        // Skip
      }

      entries.push({ domain, score, grade, gradeColor, timestamp });
    }

    return entries;
  } catch (error) {
    console.error("Failed to get leaderboard:", error);
    return [];
  }
}

// =============================================================================
// AUDIT EVENT STREAM (in-memory for simplicity, Redis Streams for production)
// =============================================================================

// In-memory event store for SSE streaming during active audits.
// In production, use Redis Streams for multi-instance support.

interface AuditEvent {
  testId: string;
  status: "queued" | "running" | "pass" | "fail" | "error";
  message: string;
  subscore?: number;
  data?: Record<string, unknown>;
  timestamp: number;
}

const auditEvents = (globalThis.__auditEvents ??= new Map<string, AuditEvent[]>());
const auditListeners = (globalThis.__auditListeners ??= new Map<string, ((event: AuditEvent) => void)[]>());

export function pushAuditEvent(auditId: string, event: AuditEvent): void {
  if (!auditEvents.has(auditId)) {
    auditEvents.set(auditId, []);
  }
  auditEvents.get(auditId)!.push(event);

  // Notify listeners
  const listeners = auditListeners.get(auditId) || [];
  for (const listener of listeners) {
    listener(event);
  }
}

export function getAuditEvents(auditId: string): AuditEvent[] {
  return auditEvents.get(auditId) || [];
}

export function subscribeToAudit(
  auditId: string,
  callback: (event: AuditEvent) => void
): () => void {
  if (!auditListeners.has(auditId)) {
    auditListeners.set(auditId, []);
  }
  auditListeners.get(auditId)!.push(callback);

  // Return unsubscribe function
  return () => {
    const listeners = auditListeners.get(auditId);
    if (listeners) {
      const idx = listeners.indexOf(callback);
      if (idx >= 0) listeners.splice(idx, 1);
    }
  };
}

export function cleanupAudit(auditId: string): void {
  // Clean up after audit is consumed (keep for 5 minutes for late subscribers)
  setTimeout(() => {
    auditEvents.delete(auditId);
    auditListeners.delete(auditId);
  }, 300000);
}
