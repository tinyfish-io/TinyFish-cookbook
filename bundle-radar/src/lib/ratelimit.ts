import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

let ratelimit: Ratelimit | null = null;

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute per identifier
    analytics: true,
  });
}

export type RateLimitResult =
  | { ok: true }
  | { ok: false; message: string };

export async function checkRateLimit(userId: string): Promise<RateLimitResult> {
  if (!ratelimit) return { ok: true };
  const { success } = await ratelimit.limit(`scan:${userId}`);
  if (!success) {
    return { ok: false, message: 'Too many requests. Try again in a minute.' };
  }
  return { ok: true };
}
