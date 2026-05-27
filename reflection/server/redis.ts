import { Redis } from "@upstash/redis";

/**
 * Upstash Redis client for caching and real-time features
 * Credentials will be added via environment variables
 */
let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
      throw new Error(
        "Missing Upstash Redis credentials. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
      );
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}

/**
 * Redis key patterns for organized data storage
 */
export const RedisKeys = {
  // Content cache
  content: (contentId: number) => `content:${contentId}`,
  
  // User feed (sorted set by publishedAt timestamp)
  userFeed: (userId: number) => `user:${userId}:feed`,
  
  // Unread items set
  userUnread: (userId: number) => `user:${userId}:unread`,
  
  // User preferences
  userPrefs: (userId: number) => `user:${userId}:prefs`,
  
  // Source tracking
  source: (sourceId: number) => `source:${sourceId}`,
  userSources: (userId: number) => `user:${userId}:sources`,
  
  // Job queues
  fetchQueue: () => `queue:fetch`,
  summarizeQueue: () => `queue:summarize`,
  
  // Rate limiting
  rateLimit: (userId: number, action: string) => `ratelimit:${userId}:${action}`,
} as const;

/**
 * Helper: Get user's content feed with pagination
 */
export async function getUserFeed(userId: number, limit = 20, offset = 0) {
  const client = getRedis();
  const feedKey = RedisKeys.userFeed(userId);
  
  // Get content IDs sorted by publishedAt (newest first)
  const contentIds = await client.zrange(feedKey, offset, offset + limit - 1, { rev: true });
  
  if (!contentIds || contentIds.length === 0) {
    return [];
  }
  
  // Fetch content details
  const pipeline = client.pipeline();
  (contentIds as (string | number)[]).forEach((id) => {
    pipeline.hgetall(RedisKeys.content(Number(id)));
  });
  
  const results = await pipeline.exec();
  return results.filter(Boolean);
}

/**
 * Helper: Add content item to user's feed
 */
export async function addContentToFeed(
  userId: number,
  contentId: number,
  publishedAt: number,
  ttl = 86400 // 24 hours default
) {
  const client = getRedis();
  
  // Add to sorted set (score = publishedAt for chronological ordering)
  await client.zadd(RedisKeys.userFeed(userId), {
    score: publishedAt,
    member: contentId.toString(),
  });
  
  // Add to unread set
  await client.sadd(RedisKeys.userUnread(userId), contentId.toString());
  
  // Set TTL on feed key
  await client.expire(RedisKeys.userFeed(userId), ttl);
}

/**
 * Helper: Mark content as read
 */
export async function markAsRead(userId: number, contentId: number) {
  const client = getRedis();
  await client.srem(RedisKeys.userUnread(userId), contentId.toString());
}

/**
 * Helper: Get unread count for user
 */
export async function getUnreadCount(userId: number): Promise<number> {
  const client = getRedis();
  const count = await client.scard(RedisKeys.userUnread(userId));
  return count || 0;
}

/**
 * Helper: Cache content item
 */
export async function cacheContent(
  contentId: number,
  content: Record<string, unknown>,
  ttl = 86400 // 24 hours
) {
  const client = getRedis();
  await client.hset(RedisKeys.content(contentId), content);
  await client.expire(RedisKeys.content(contentId), ttl);
}

/**
 * Helper: Get cached content
 */
export async function getCachedContent(contentId: number) {
  const client = getRedis();
  return await client.hgetall(RedisKeys.content(contentId));
}

/**
 * Helper: Add source to fetch queue
 */
export async function queueSourceFetch(sourceId: number) {
  const client = getRedis();
  await client.rpush(RedisKeys.fetchQueue(), sourceId.toString());
}

/**
 * Helper: Add content to summarize queue
 */
export async function queueContentSummarize(contentId: number) {
  const client = getRedis();
  await client.rpush(RedisKeys.summarizeQueue(), contentId.toString());
}

/**
 * Helper: Check rate limit
 */
export async function checkRateLimit(
  userId: number,
  action: string,
  limit: number,
  windowSeconds: number
): Promise<boolean> {
  const client = getRedis();
  const key = RedisKeys.rateLimit(userId, action);
  
  const current = await client.incr(key);
  
  if (current === 1) {
    await client.expire(key, windowSeconds);
  }
  
  return current <= limit;
}
