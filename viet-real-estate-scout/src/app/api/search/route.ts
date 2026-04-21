export const runtime = 'nodejs';
export const maxDuration = 800;

import { SITES, buildGoalPrompt, type SearchParams } from '@/lib/sites';
import { runTinyFishForSite, sseData, elapsedSeconds } from '@/lib/tinyfish-client';
import {
  buildSearchKey,
  tryGetSupabase,
  getCachedResults,
  cacheResult,
  type CacheRow,
} from '@/lib/property-cache';

type SearchBody = {
  location: string;
  listingType: 'rent' | 'buy';
  propertyType: 'apartment' | 'house' | 'land' | 'room' | 'all';
  priceMin?: number;
  priceMax?: number;
  useCache?: boolean;
};

export async function POST(request: Request): Promise<Response> {
  let body: SearchBody;

  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.location?.trim() || body.location.trim().length > 200) {
    return Response.json({ error: 'Invalid location (1-200 chars)' }, { status: 400 });
  }

  const validListingTypes = ['rent', 'buy'] as const;
  const validPropertyTypes = ['apartment', 'house', 'land', 'room', 'all'] as const;
  if (!validListingTypes.includes(body.listingType as typeof validListingTypes[number])) {
    return Response.json({ error: 'Invalid listingType' }, { status: 400 });
  }
  if (!validPropertyTypes.includes(body.propertyType as typeof validPropertyTypes[number])) {
    return Response.json({ error: 'Invalid propertyType' }, { status: 400 });
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return Response.json({ error: 'Missing TINYFISH_API_KEY' }, { status: 500 });
  }

  const params: SearchParams = {
    location: body.location.trim(),
    listingType: body.listingType,
    propertyType: body.propertyType,
    priceMin: body.priceMin,
    priceMax: body.priceMax,
  };

  const useCache = body.useCache ?? false;
  const searchKey = buildSearchKey(params);
  const goal = buildGoalPrompt(params);
  const siteUrls = SITES.map((s) => s.baseUrl);

  // ---- Cache lookup (graceful degradation) ----
  const supabase = tryGetSupabase();
  let cached = new Map<string, CacheRow>();

  if (supabase && useCache) {
    try {
      cached = await getCachedResults(supabase, searchKey);
      console.log(`[CACHE] ${cached.size}/${siteUrls.length} sites cached for "${searchKey}"`);
    } catch (err) {
      console.error('[CACHE] Lookup failed:', err);
    }
  }

  // Partition into cached vs uncached
  const cachedSites: { url: string; row: CacheRow }[] = [];
  const uncachedSites: string[] = [];

  for (const url of siteUrls) {
    const row = cached.get(url);
    if (row) {
      cachedSites.push({ url, row });
    } else {
      uncachedSites.push(url);
    }
  }

  const searchStartedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      // Immediate ping to establish stream and prevent proxy buffering
      controller.enqueue(encoder.encode(': ping\n\n'));

      const enqueue = (payload: unknown) => {
        controller.enqueue(encoder.encode(sseData(payload)));
      };

      // ---- Stream cached results instantly ----
      for (const { row } of cachedSites) {
        enqueue({
          type: 'LISTING_RESULT',
          listing: row.listing_data,
          source: 'cache',
          cached_at: row.scraped_at,
        });
      }

      // ---- Scrape uncached sites via TinyFish ----
      let liveSucceeded = 0;

      if (uncachedSites.length > 0) {
        const tasks = uncachedSites.map((url) =>
          (async () => {
            // Per-site enqueue wrapper: intercepts LISTING_RESULT to fire cache upsert
            const siteEnqueue = (payload: unknown) => {
              const event = payload as Record<string, unknown>;
              if (event.type === 'LISTING_RESULT') {
                // Cache first — must persist even if client disconnects
                if (supabase && useCache && event.listing) {
                  cacheResult(supabase, searchKey, url, event.listing).catch(() => {});
                }
                enqueue({ ...event, source: 'live' });
              } else {
                enqueue(payload);
              }
            };

            return runTinyFishForSite(url, goal, apiKey, siteEnqueue);
          })(),
        );

        const settled = await Promise.allSettled(tasks);
        liveSucceeded = settled.filter(
          (r): r is PromiseFulfilledResult<boolean> =>
            r.status === 'fulfilled' && r.value,
        ).length;
      }

      enqueue({
        type: 'SEARCH_COMPLETE',
        total: siteUrls.length,
        succeeded: cachedSites.length + liveSucceeded,
        cached: cachedSites.length,
        elapsed: `${elapsedSeconds(searchStartedAt)}s`,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
      'Transfer-Encoding': 'chunked',
    },
  });
}
