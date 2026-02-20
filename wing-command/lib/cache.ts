// ===========================================
// Wing Scout - Upstash Redis Cache
// ===========================================

import { Redis } from '@upstash/redis';
import { WingSpot, GeocodedLocation, ScrapeResponse, Menu, SuperBowlDeal, AggregatorDeal } from './types';

// Validate Redis environment variables
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!redisUrl || !redisToken) {
    console.warn('Warning: Redis environment variables not set. Caching will be disabled.');
}

// Initialize Redis client (may be null if env vars missing)
const redis = redisUrl && redisToken
    ? new Redis({ url: redisUrl, token: redisToken })
    : null;

// Cache TTL in seconds (2 hours — discovery app, restaurant data doesn't change fast)
const DEFAULT_TTL = 2 * 60 * 60;
const GEOCODE_TTL = 60 * 60 * 24 * 365; // 1 year for geocode (permanent)

/**
 * Cache key generators
 */
const keys = {
    wingSpots: (zip: string) => `wing_spots:${zip}`,
    geocode: (zip: string) => `geocode:${zip}`,
    scrapeResult: (zip: string) => `scrape_result:${zip}`,
    rateLimit: (ip: string) => `rate_limit:${ip}`,
    menuScouting: (spotId: string) => `menu:scouting:${spotId}`,
};

/**
 * Get cached wing spots for a zip code
 */
export async function getCachedWingSpots(zipCode: string): Promise<WingSpot[] | null> {
    if (!redis) return null;
    try {
        const data = await redis.get<WingSpot[]>(keys.wingSpots(zipCode));
        return data;
    } catch (error) {
        console.error('Redis getCachedWingSpots error:', error);
        return null;
    }
}

/**
 * Cache wing spots for a zip code
 */
export async function cacheWingSpots(
    zipCode: string,
    spots: WingSpot[],
    ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
    if (!redis) return;
    try {
        await redis.set(keys.wingSpots(zipCode), spots, { ex: ttlSeconds });
    } catch (error) {
        console.error('Redis cacheWingSpots error:', error);
    }
}

/**
 * Get cached geocode data
 */
export async function getCachedGeocode(zipCode: string): Promise<GeocodedLocation | null> {
    if (!redis) return null;
    try {
        const data = await redis.get<GeocodedLocation>(keys.geocode(zipCode));
        return data;
    } catch (error) {
        console.error('Redis getCachedGeocode error:', error);
        return null;
    }
}

/**
 * Cache geocode data (permanent)
 */
export async function cacheGeocode(geocode: GeocodedLocation): Promise<void> {
    if (!redis) return;
    try {
        await redis.set(keys.geocode(geocode.zip_code), geocode, { ex: GEOCODE_TTL });
    } catch (error) {
        console.error('Redis cacheGeocode error:', error);
    }
}

/**
 * Purge all cached data for a zip code (for clearing stale/incorrect data)
 */
export async function purgeZipCache(zipCode: string): Promise<void> {
    if (!redis) return;
    try {
        await redis.del(keys.wingSpots(zipCode));
        await redis.del(keys.scrapeResult(zipCode));
        console.log(`Purged Redis cache for zip: ${zipCode}`);
    } catch (error) {
        console.error('Redis purgeZipCache error:', error);
    }
}

/**
 * Get cached scrape result
 */
export async function getCachedScrapeResult(zipCode: string): Promise<ScrapeResponse | null> {
    if (!redis) return null;
    try {
        const data = await redis.get<ScrapeResponse>(keys.scrapeResult(zipCode));
        return data;
    } catch (error) {
        console.error('Redis getCachedScrapeResult error:', error);
        return null;
    }
}

/**
 * Cache scrape result
 */
export async function cacheScrapeResult(
    zipCode: string,
    result: ScrapeResponse,
    ttlSeconds: number = DEFAULT_TTL
): Promise<void> {
    if (!redis) return;
    try {
        await redis.set(keys.scrapeResult(zipCode), result, { ex: ttlSeconds });
    } catch (error) {
        console.error('Redis cacheScrapeResult error:', error);
    }
}

/**
 * Rate limiting check
 * Returns true if request is allowed, false if rate limited
 * SECURITY: Denies on error to prevent DoS attacks when Redis is down
 */
export async function checkRateLimit(
    ip: string,
    maxRequests: number = 10,
    windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
    // If Redis is not configured, allow requests (graceful degradation for dev)
    if (!redis) {
        return { allowed: true, remaining: maxRequests, resetIn: 0 };
    }

    try {
        const key = keys.rateLimit(ip);
        const current = await redis.incr(key);

        if (current === 1) {
            // First request, set expiry
            await redis.expire(key, windowSeconds);
        }

        const ttl = await redis.ttl(key);
        const allowed = current <= maxRequests;
        const remaining = Math.max(0, maxRequests - current);

        return { allowed, remaining, resetIn: ttl };
    } catch (error) {
        console.error('Redis checkRateLimit error:', error);
        // SECURITY: Deny on error to prevent rate limit bypass attacks
        return { allowed: false, remaining: 0, resetIn: windowSeconds };
    }
}

/**
 * Invalidate cache for a zip code
 */
export async function invalidateZipCache(zipCode: string): Promise<void> {
    if (!redis) return;
    try {
        await redis.del(keys.wingSpots(zipCode), keys.scrapeResult(zipCode));
    } catch (error) {
        console.error('Redis invalidateZipCache error:', error);
    }
}

/**
 * Get cache stats for monitoring
 */
export async function getCacheStats(): Promise<{
    connected: boolean;
    info: string;
}> {
    if (!redis) {
        return {
            connected: false,
            info: 'Redis not configured',
        };
    }
    try {
        const pingResult = await redis.ping();
        return {
            connected: pingResult === 'PONG',
            info: 'Redis connected',
        };
    } catch (error) {
        return {
            connected: false,
            info: `Redis error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        };
    }
}

// ===========================================
// Menu Caching
// ===========================================

// Menu cache TTL (1 hour for individual spots)
const MENU_TTL = 60 * 60;

// Chain menu cache TTL (6 hours — chain menus rarely change)
const CHAIN_MENU_TTL = 6 * 60 * 60;

/**
 * Cache key for menus (per-spot)
 */
const menuKey = (spotId: string) => `menu:${spotId}`;

/**
 * Cache key for chain menus (shared across all locations of the same chain)
 */
const chainMenuKey = (name: string) => `menu:chain:${normalizeChainName(name)}`;

/**
 * Normalize restaurant name for chain-level cache matching
 * "Buffalo Wild Wings" → "buffalo wild wings"
 * "Wingstop #1234" → "wingstop"
 * "The Original Hot Wings" → "original hot wings"
 */
function normalizeChainName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/\s*#\d+.*$/, '')        // Strip "#1234" store numbers
        .replace(/\s*-\s*.*$/, '')          // Strip " - Downtown" suffixes
        .replace(/^the\s+/, '')             // Strip leading "The"
        .replace(/['']/g, '')               // Strip apostrophes
        .replace(/\s+/g, ' ')              // Collapse whitespace
        .trim();
}

/**
 * Get cached menu for a spot
 */
export async function getCachedMenu(spotId: string): Promise<Menu | null> {
    if (!redis) return null;
    try {
        return await redis.get<Menu>(menuKey(spotId));
    } catch (error) {
        console.error('Redis getCachedMenu error:', error);
        return null;
    }
}

/**
 * Cache menu for a spot (1-hour TTL)
 */
export async function cacheMenu(spotId: string, menu: Menu): Promise<void> {
    if (!redis) return;
    try {
        await redis.set(menuKey(spotId), menu, { ex: MENU_TTL });
    } catch (error) {
        console.error('Redis cacheMenu error:', error);
    }
}

/**
 * Invalidate cached menu
 */
export async function invalidateMenuCache(spotId: string): Promise<void> {
    if (!redis) return;
    try {
        await redis.del(menuKey(spotId));
    } catch (error) {
        console.error('Redis invalidateMenuCache error:', error);
    }
}

// ===========================================
// Menu Scouting Lock (Redis-based deduplication)
// ===========================================

// Scouting lock TTL: 3 minutes (covers full Mino run + buffer)
const SCOUTING_LOCK_TTL = 3 * 60;

/**
 * Acquire a scouting lock for a spot (SET NX — atomic set-if-not-exists).
 * Returns true if WE acquired the lock (first request).
 * Returns false if another instance is already scouting this spot.
 */
export async function setScoutingLock(spotId: string): Promise<boolean> {
    if (!redis) return true; // No Redis = allow (dev mode)
    try {
        const result = await redis.set(
            keys.menuScouting(spotId),
            Date.now().toString(),
            { nx: true, ex: SCOUTING_LOCK_TTL }
        );
        return result === 'OK';
    } catch (error) {
        console.error('Redis setScoutingLock error:', error);
        return true; // Allow on error (graceful degradation)
    }
}

/**
 * Check if a scouting lock exists (another instance is scraping).
 */
export async function isScoutingInProgress(spotId: string): Promise<boolean> {
    if (!redis) return false;
    try {
        const val = await redis.get(keys.menuScouting(spotId));
        return val !== null;
    } catch (error) {
        console.error('Redis isScoutingInProgress error:', error);
        return false;
    }
}

/**
 * Clear the scouting lock after scrape completes (success or failure).
 */
export async function clearScoutingLock(spotId: string): Promise<void> {
    if (!redis) return;
    try {
        await redis.del(keys.menuScouting(spotId));
    } catch (error) {
        console.error('Redis clearScoutingLock error:', error);
    }
}

// ===========================================
// Chain-Level Menu Caching
// ===========================================

/**
 * Get cached menu for a chain restaurant by name
 * e.g., any "Wingstop" location shares the same cached menu
 */
export async function getCachedChainMenu(name: string): Promise<Menu | null> {
    if (!redis) return null;
    try {
        const key = chainMenuKey(name);
        return await redis.get<Menu>(key);
    } catch (error) {
        console.error('Redis getCachedChainMenu error:', error);
        return null;
    }
}

/**
 * Cache menu under the chain name (6-hour TTL)
 * All locations of the same restaurant chain share this cache
 */
export async function cacheChainMenu(name: string, menu: Menu): Promise<void> {
    if (!redis) return;
    try {
        const key = chainMenuKey(name);
        await redis.set(key, menu, { ex: CHAIN_MENU_TTL });
        console.log(`Cached chain menu: ${key}`);
    } catch (error) {
        console.error('Redis cacheChainMenu error:', error);
    }
}

// ===========================================
// Super Bowl Deals Caching
// ===========================================

const DEALS_TTL = 30 * 60; // 30 minutes
const DEALS_SCOUTING_LOCK_TTL = 5 * 60; // 5 minutes (deals scrapes can take 200-400s for slow sites)
const dealsKey = (spotId: string) => `deals:${spotId}`;
const dealsScoutingKey = (spotId: string) => `deals:scouting:${spotId}`;

/**
 * Get cached Super Bowl deals for a spot
 */
export async function getCachedDeals(spotId: string): Promise<SuperBowlDeal[] | null> {
    if (!redis) return null;
    try {
        return await redis.get<SuperBowlDeal[]>(dealsKey(spotId));
    } catch (error) {
        console.error('Redis getCachedDeals error:', error);
        return null;
    }
}

/**
 * Cache Super Bowl deals for a spot (30-min TTL)
 */
export async function cacheDeals(spotId: string, deals: SuperBowlDeal[]): Promise<void> {
    if (!redis) return;
    try {
        await redis.set(dealsKey(spotId), deals, { ex: DEALS_TTL });
    } catch (error) {
        console.error('Redis cacheDeals error:', error);
    }
}

// ===========================================
// Deals Scouting Lock (Redis-based deduplication)
// ===========================================

/**
 * Acquire a deals scouting lock (SET NX — atomic set-if-not-exists).
 * Returns true if WE acquired the lock (first request).
 * Returns false if another instance is already scouting deals for this spot.
 */
export async function setDealsScoutingLock(spotId: string): Promise<boolean> {
    if (!redis) return true; // No Redis = allow (dev mode)
    try {
        const result = await redis.set(
            dealsScoutingKey(spotId),
            Date.now().toString(),
            { nx: true, ex: DEALS_SCOUTING_LOCK_TTL }
        );
        return result === 'OK';
    } catch (error) {
        console.error('Redis setDealsScoutingLock error:', error);
        return true; // Allow on error (graceful degradation)
    }
}

/**
 * Check if a deals scouting lock exists (another instance is scraping deals).
 */
export async function isDealsScoutingInProgress(spotId: string): Promise<boolean> {
    if (!redis) return false;
    try {
        const val = await redis.get(dealsScoutingKey(spotId));
        return val !== null;
    } catch (error) {
        console.error('Redis isDealsScoutingInProgress error:', error);
        return false;
    }
}

/**
 * Clear the deals scouting lock after scrape completes (success or failure).
 */
export async function clearDealsScoutingLock(spotId: string): Promise<void> {
    if (!redis) return;
    try {
        await redis.del(dealsScoutingKey(spotId));
    } catch (error) {
        console.error('Redis clearDealsScoutingLock error:', error);
    }
}

// ===========================================
// Global Aggregator Deals Cache
// One scrape of deal roundup pages covers ALL chain restaurants
// ===========================================

const AGGREGATOR_TTL = 2 * 60 * 60; // 2 hours (aggregator pages rarely change intraday)
const AGGREGATOR_SCOUTING_LOCK_TTL = 5 * 60; // 5 minutes (covers parallel scrape of 3 pages)
const AGGREGATOR_KEY = 'deals:aggregator';
const AGGREGATOR_SCOUTING_KEY = 'deals:aggregator:scouting';

/**
 * Get cached aggregator deals (global — not per-spot)
 */
export async function getCachedAggregatorDeals(): Promise<AggregatorDeal[] | null> {
    if (!redis) return null;
    try {
        return await redis.get<AggregatorDeal[]>(AGGREGATOR_KEY);
    } catch (error) {
        console.error('Redis getCachedAggregatorDeals error:', error);
        return null;
    }
}

/**
 * Cache aggregator deals globally (2-hour TTL)
 */
export async function cacheAggregatorDeals(deals: AggregatorDeal[]): Promise<void> {
    if (!redis) return;
    try {
        await redis.set(AGGREGATOR_KEY, deals, { ex: AGGREGATOR_TTL });
    } catch (error) {
        console.error('Redis cacheAggregatorDeals error:', error);
    }
}

/**
 * Acquire global aggregator scouting lock (SET NX).
 * Only one Railway instance scrapes aggregator pages at a time.
 */
export async function setAggregatorScoutingLock(): Promise<boolean> {
    if (!redis) return true;
    try {
        const result = await redis.set(
            AGGREGATOR_SCOUTING_KEY,
            Date.now().toString(),
            { nx: true, ex: AGGREGATOR_SCOUTING_LOCK_TTL }
        );
        return result === 'OK';
    } catch (error) {
        console.error('Redis setAggregatorScoutingLock error:', error);
        return true;
    }
}

/**
 * Check if aggregator scouting is in progress.
 */
export async function isAggregatorScoutingInProgress(): Promise<boolean> {
    if (!redis) return false;
    try {
        const val = await redis.get(AGGREGATOR_SCOUTING_KEY);
        return val !== null;
    } catch (error) {
        console.error('Redis isAggregatorScoutingInProgress error:', error);
        return false;
    }
}

/**
 * Clear the aggregator scouting lock.
 */
export async function clearAggregatorScoutingLock(): Promise<void> {
    if (!redis) return;
    try {
        await redis.del(AGGREGATOR_SCOUTING_KEY);
    } catch (error) {
        console.error('Redis clearAggregatorScoutingLock error:', error);
    }
}

export { redis };
