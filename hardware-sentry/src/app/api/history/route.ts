/**
 * GET /api/history?sku={id}
 * Layer 2 (Orchestration): Retrieve scan history for a SKU
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSKUConfig } from '@/lib/config';
import { getScanHistory } from '@/lib/redis';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sku = searchParams.get('sku');
    const limitParam = searchParams.get('limit');

    // Validate SKU
    if (!sku) {
      return NextResponse.json(
        { error: 'Missing SKU parameter' },
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

    // Parse limit (default 10, max 50)
    let limit = 10;
    if (limitParam) {
      const parsedLimit = parseInt(limitParam, 10);
      if (!isNaN(parsedLimit) && parsedLimit > 0) {
        limit = Math.min(parsedLimit, 50);
      }
    }

    console.log(`[API] History request for ${sku} (limit: ${limit})`);

    // Fetch history from Redis
    const history = await getScanHistory(sku, limit);

    return NextResponse.json({
      sku,
      skuName: skuConfig.displayName,
      count: history.length,
      scans: history,
    });
  } catch (error) {
    console.error('[API] History error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
