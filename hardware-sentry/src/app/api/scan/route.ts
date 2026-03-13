/**
 * POST /api/scan
 * Layer 2 (Orchestration): Intelligent routing for hardware scans
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

export async function POST(request: NextRequest) {
  const monitor = new PerformanceMonitor('POST /api/scan');

  // Apply rate limiting
  const rateLimitResponse = applyRateLimit(request);
  if (rateLimitResponse) {
    monitor.end(false, { reason: 'rate_limited' });
    return rateLimitResponse;
  }

  try {
    const body = await request.json();
    const { sku } = body;

    // Validate SKU
    if (!sku || typeof sku !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid SKU parameter' },
        { status: 400 }
      );
    }

    const skuConfig = getSKUConfig(sku);
    if (!skuConfig) {
      return NextResponse.json(
        { error: `Unknown SKU: ${sku}` },
        { status: 404 }
      );
    }

    console.log(`[API] Scan request for ${sku}`);

    // Check cache first (return if fresh)
    const cachedResult = await getCachedScan(sku);
    if (cachedResult && isCacheFresh(cachedResult)) {
      console.log(`[API] Returning fresh cached result for ${sku}`);
      monitor.end(true, { cached: true, sku });
      return createMonitoredResponse(
        monitor,
        { ...cachedResult, cached: true },
        { cached: true }
      );
    }

    // Acquire lock to prevent concurrent scans
    const lockAcquired = await acquireScanLock(sku);
    if (!lockAcquired) {
      // Another scan is in progress, return cached data or wait
      if (cachedResult) {
        console.log(`[API] Scan in progress, returning stale cache for ${sku}`);
        return NextResponse.json({
          ...cachedResult,
          cached: true,
          stale: true,
          message: 'Another scan is in progress, showing cached results',
        });
      }

      return NextResponse.json(
        { error: 'Scan already in progress, please try again in a moment' },
        { status: 429 }
      );
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
      monitor.end(true, {
        cached: false,
        sku,
        vendors: scanWithChanges.vendors.length,
      });
      return createMonitoredResponse(
        monitor,
        { ...scanWithChanges, cached: false },
        { cached: false }
      );
    } catch (scanError) {
      console.error('[API] Scan error:', scanError);

      // Special handling for circuit breaker errors
      const isCircuitBreakerError =
        scanError instanceof Error && scanError.name === 'CircuitBreakerError';

      // If scan fails, try to return cached data
      if (cachedResult) {
        console.log(`[API] Scan failed, returning stale cache for ${sku}`);
        return NextResponse.json({
          ...cachedResult,
          cached: true,
          stale: true,
          error: scanError instanceof Error ? scanError.message : 'Scan failed',
          circuitBreakerOpen: isCircuitBreakerError,
        });
      }

      // No cache available, return error with circuit breaker status
      if (isCircuitBreakerError) {
        return NextResponse.json(
          {
            error: 'TinyFish API is temporarily unavailable. Please try again in 30 seconds.',
            circuitBreakerOpen: true,
            retryAfter: 30,
          },
          { status: 503 }
        );
      }

      // No cache available, return error
      throw scanError;
    } finally {
      // Always release lock
      await releaseScanLock(sku);
    }
  } catch (error) {
    console.error('[API] Unhandled error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
