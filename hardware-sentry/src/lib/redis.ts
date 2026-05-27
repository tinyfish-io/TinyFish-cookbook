/**
 * Upstash Redis Client Wrapper
 * Layer 3 (Execution): Deterministic Redis operations
 */

import { Redis } from '@upstash/redis';
import { ScanResult, VendorResult } from './tinyfish';

const CACHE_TTL_SECONDS = 3600; // 1 hour
const LOCK_TTL_SECONDS = 120; // 2 minutes
const MAX_HISTORY_SCANS = 10;

let redisClient: Redis | null = null;

/**
 * Get or initialize Redis client
 * Returns null if Redis is not properly configured (graceful degradation)
 */
export function getRedisClient(): Redis | null {
  if (redisClient !== null) {
    return redisClient;
  }

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  // Validate Redis configuration
  if (!url || !token || url.includes('your_upstash') || token.includes('your_upstash')) {
    if (redisClient === null) {
      // Log once on first attempt
      console.warn('[Redis] Redis not configured (using placeholder values). Caching disabled.');
      console.warn('[Redis] Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in .env.local to enable caching.');
      redisClient = undefined as any; // Mark as checked
    }
    return null;
  }

  // Validate URL format
  if (!url.startsWith('https://')) {
    console.error(`[Redis] Invalid Redis URL (must start with https://). Received: "${url}"`);
    return null;
  }

  try {
    redisClient = new Redis({
      url,
      token,
    });
    console.log('[Redis] Client initialized successfully');
    return redisClient;
  } catch (error) {
    console.error('[Redis] Failed to initialize client:', error);
    return null;
  }
}

/**
 * Get latest cached scan result
 */
export async function getCachedScan(sku: string): Promise<ScanResult | null> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return null; // Redis not configured, skip caching
    }

    const key = `scan:${sku}:latest`;
    const cached = await redis.get<ScanResult>(key);

    if (cached) {
      console.log(`[Redis] Cache hit for ${sku}`);
      return cached;
    }

    console.log(`[Redis] Cache miss for ${sku}`);
    return null;
  } catch (error) {
    console.error('[Redis] Error getting cached scan:', error);
    return null;
  }
}

/**
 * Save scan result to cache
 */
export async function saveScanResult(scanResult: ScanResult): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return; // Redis not configured, skip caching
    }

    const { sku } = scanResult;

    // Save as latest
    const latestKey = `scan:${sku}:latest`;
    await redis.set(latestKey, scanResult, { ex: CACHE_TTL_SECONDS });

    // Add to history (sorted set by timestamp)
    const historyKey = `scan:${sku}:history`;
    const timestamp = new Date(scanResult.scannedAt).getTime();
    await redis.zadd(historyKey, { score: timestamp, member: JSON.stringify(scanResult) });

    // Trim history to keep only last N scans
    const count = await redis.zcard(historyKey);
    if (count > MAX_HISTORY_SCANS) {
      const removeCount = count - MAX_HISTORY_SCANS;
      await redis.zpopmin(historyKey, removeCount);
    }

    console.log(`[Redis] Saved scan result for ${sku}`);
  } catch (error) {
    console.error('[Redis] Error saving scan result:', error);
    // Don't throw - gracefully degrade without caching
  }
}

/**
 * Get scan history for a SKU
 */
export async function getScanHistory(sku: string, limit = 10): Promise<ScanResult[]> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return []; // Redis not configured, no history available
    }

    const historyKey = `scan:${sku}:history`;

    // Get most recent scans (sorted by timestamp descending)
    const results = await redis.zrange(historyKey, -limit, -1, { rev: true });

    if (!results || results.length === 0) {
      return [];
    }

    const scans: ScanResult[] = results
      .map((item) => {
        try {
          return JSON.parse(item as string) as ScanResult;
        } catch {
          return null;
        }
      })
      .filter((scan): scan is ScanResult => scan !== null);

    console.log(`[Redis] Retrieved ${scans.length} historical scans for ${sku}`);
    return scans;
  } catch (error) {
    console.error('[Redis] Error getting scan history:', error);
    return [];
  }
}

/**
 * Acquire a lock to prevent concurrent scans
 */
export async function acquireScanLock(sku: string): Promise<boolean> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return true; // Redis not configured, always grant lock
    }

    const lockKey = `scan:${sku}:lock`;

    // Use SET NX (set if not exists) with expiry
    const result = await redis.set(lockKey, Date.now().toString(), {
      nx: true,
      ex: LOCK_TTL_SECONDS,
    });

    const acquired = result === 'OK';
    console.log(`[Redis] Lock ${acquired ? 'acquired' : 'failed'} for ${sku}`);
    return acquired;
  } catch (error) {
    console.error('[Redis] Error acquiring lock:', error);
    return true; // On error, grant lock to allow operation to proceed
  }
}

/**
 * Release scan lock
 */
export async function releaseScanLock(sku: string): Promise<void> {
  try {
    const redis = getRedisClient();
    if (!redis) {
      return; // Redis not configured, no lock to release
    }

    const lockKey = `scan:${sku}:lock`;
    await redis.del(lockKey);
    console.log(`[Redis] Lock released for ${sku}`);
  } catch (error) {
    console.error('[Redis] Error releasing lock:', error);
  }
}

/**
 * Check if cached result is still fresh (less than 5 minutes old)
 */
export function isCacheFresh(scanResult: ScanResult, maxAgeMinutes = 5): boolean {
  const scannedAt = new Date(scanResult.scannedAt);
  const ageMinutes = (Date.now() - scannedAt.getTime()) / 1000 / 60;
  return ageMinutes < maxAgeMinutes;
}

/**
 * Detect changes between two scan results
 * Returns enriched vendor results with change indicators
 */
export interface VendorChange {
  priceChange?: {
    old: number | null;
    new: number | null;
    delta: number;
    percentChange: number;
    isSignificant: boolean; // >£1 or >2%
  };
  stockChange?: {
    old: boolean;
    new: boolean;
    changed: boolean;
  };
}

export interface VendorResultWithChanges extends VendorResult {
  changes?: VendorChange;
}

export function detectChanges(
  currentScan: ScanResult,
  previousScan: ScanResult | null
): ScanResult & { vendors: VendorResultWithChanges[] } {
  if (!previousScan) {
    return { ...currentScan, vendors: currentScan.vendors };
  }

  const vendorsWithChanges: VendorResultWithChanges[] = currentScan.vendors.map(
    (currentVendor) => {
      // Find matching vendor in previous scan
      const previousVendor = previousScan.vendors.find(
        (v) => v.name === currentVendor.name || v.url === currentVendor.url
      );

      if (!previousVendor) {
        return currentVendor; // No previous data to compare
      }

      const changes: VendorChange = {};

      // Detect price changes
      if (
        currentVendor.price !== null ||
        previousVendor.price !== null
      ) {
        const oldPrice = previousVendor.price;
        const newPrice = currentVendor.price;

        if (oldPrice !== newPrice) {
          const delta =
            newPrice !== null && oldPrice !== null ? newPrice - oldPrice : 0;
          const percentChange =
            oldPrice !== null && oldPrice !== 0 ? (delta / oldPrice) * 100 : 0;

          // Significant if >£1 or >2%
          const isSignificant =
            Math.abs(delta) > 1 || Math.abs(percentChange) > 2;

          changes.priceChange = {
            old: oldPrice,
            new: newPrice,
            delta,
            percentChange,
            isSignificant,
          };
        }
      }

      // Detect stock changes
      if (currentVendor.inStock !== previousVendor.inStock) {
        changes.stockChange = {
          old: previousVendor.inStock,
          new: currentVendor.inStock,
          changed: true,
        };
      }

      return {
        ...currentVendor,
        changes: Object.keys(changes).length > 0 ? changes : undefined,
      };
    }
  );

  return {
    ...currentScan,
    vendors: vendorsWithChanges,
  };
}
