/**
 * POST /api/scan/batch
 * Layer 2 (Orchestration): Batch scan multiple SKUs in parallel
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSKUConfig } from '@/lib/config';
import { scanHardware } from '@/lib/tinyfish';
import {
  getCachedScan,
  saveScanResult,
  acquireScanLock,
  releaseScanLock,
  isCacheFresh,
  detectChanges,
} from '@/lib/redis';
import { isMockModeEnabled, getMockScanResult } from '@/lib/mockData';
import {
  applyRateLimit,
  PerformanceMonitor,
  createMonitoredResponse,
} from '@/lib/middleware';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 second timeout for Vercel

interface BatchScanRequest {
  skus: string[];
}

interface BatchScanResponse {
  results: Record<string, unknown>;
  errors: Record<string, string>;
  metadata: {
    total: number;
    successful: number;
    failed: number;
    cached: number;
  };
}

export async function POST(request: NextRequest) {
  const monitor = new PerformanceMonitor('POST /api/scan/batch');

  // Apply rate limiting (same limit as single scans)
  const rateLimitResponse = applyRateLimit(request);
  if (rateLimitResponse) {
    monitor.end(false, { reason: 'rate_limited' });
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { skus } = body as BatchScanRequest;

    // Validate SKUs array
    if (!Array.isArray(skus) || skus.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid "skus" array parameter' },
        { status: 400 }
      );
    }

    // Limit batch size to prevent abuse
    if (skus.length > 5) {
      return NextResponse.json(
        { error: 'Batch size limit exceeded (maximum 5 SKUs per request)' },
        { status: 400 }
      );
    }

    console.log(`[API] Batch scan request for ${skus.length} SKUs`);

    // Process each SKU in parallel
    const scanPromises = skus.map((sku) => processSingleScan(sku));
    const results = await Promise.allSettled(scanPromises);

    // Aggregate results
    const response: BatchScanResponse = {
      results: {},
      errors: {},
      metadata: {
        total: skus.length,
        successful: 0,
        failed: 0,
        cached: 0,
      },
    };

    results.forEach((result, index) => {
      const sku = skus[index];

      if (result.status === 'fulfilled') {
        response.results[sku] = result.value;
        response.metadata.successful++;

        // Check if result was cached
        if (
          typeof result.value === 'object' &&
          result.value !== null &&
          'cached' in result.value &&
          result.value.cached
        ) {
          response.metadata.cached++;
        }
      } else {
        response.errors[sku] =
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error';
        response.metadata.failed++;
      }
    });

    console.log(
      `[API] Batch scan completed: ${response.metadata.successful} successful, ${response.metadata.failed} failed`
    );

    monitor.end(true, {
      total: skus.length,
      successful: response.metadata.successful,
      failed: response.metadata.failed,
    });

    return createMonitoredResponse(monitor, response, { cached: false });
  } catch (error) {
    console.error('[API] Batch scan error:', error);
    monitor.end(false, { reason: 'unhandled_error' });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}

/**
 * Process a single SKU scan (same logic as single scan endpoint)
 */
async function processSingleScan(sku: string) {
  // Validate SKU
  if (!sku || typeof sku !== 'string') {
    throw new Error(`Invalid SKU: ${sku}`);
  }

  const skuConfig = getSKUConfig(sku);
  if (!skuConfig) {
    throw new Error(`Unknown SKU: ${sku}`);
  }

  console.log(`[API] Processing SKU: ${sku}`);

  // Check cache first (return if fresh)
  const cachedResult = await getCachedScan(sku);
  if (cachedResult && isCacheFresh(cachedResult)) {
    console.log(`[API] Returning fresh cached result for ${sku}`);
    return { ...cachedResult, cached: true };
  }

  // Acquire lock to prevent concurrent scans
  const lockAcquired = await acquireScanLock(sku);
  if (!lockAcquired) {
    // Another scan is in progress, return cached data or wait
    if (cachedResult) {
      console.log(`[API] Scan in progress, returning stale cache for ${sku}`);
      return {
        ...cachedResult,
        cached: true,
        stale: true,
        message: 'Another scan is in progress, showing cached results',
      };
    }

    throw new Error('Scan already in progress, please try again in a moment');
  }

  try {
    // Perform scan (use mock data if enabled)
    let scanResult;

    if (isMockModeEnabled()) {
      console.log(`[API] Using mock data for ${sku} (ENABLE_MOCK_DATA=true)`);
      scanResult = await getMockScanResult(sku);
    } else {
      console.log(`[API] Starting TinyFish scan for ${sku}`);
      scanResult = await scanHardware(sku, skuConfig.vendors);
    }

    // Detect changes compared to previous scan
    const scanWithChanges = detectChanges(scanResult, cachedResult);

    // Save to cache
    await saveScanResult(scanResult);

    console.log(`[API] Scan completed successfully for ${sku}`);
    return { ...scanWithChanges, cached: false };
  } catch (scanError) {
    console.error(`[API] Scan error for ${sku}:`, scanError);

    // Special handling for circuit breaker errors
    const isCircuitBreakerError =
      scanError instanceof Error && scanError.name === 'CircuitBreakerError';

    // If scan fails, try to return cached data
    if (cachedResult) {
      console.log(`[API] Scan failed, returning stale cache for ${sku}`);
      return {
        ...cachedResult,
        cached: true,
        stale: true,
        error: scanError instanceof Error ? scanError.message : 'Scan failed',
        circuitBreakerOpen: isCircuitBreakerError,
      };
    }

    // No cache available, throw error
    throw scanError;
  } finally {
    // Always release lock
    await releaseScanLock(sku);
  }
}
