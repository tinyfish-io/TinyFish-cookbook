// Cache helpers for property_cache Supabase table — all degrade gracefully

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase';
import type { SearchParams } from '@/lib/sites';

export const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

export interface CacheRow {
  source_site: string;
  listing_data: unknown;
  scraped_at: string;
}

/** Build a deterministic cache key from search params */
export function buildSearchKey(params: SearchParams): string {
  return [
    params.location.trim().toLowerCase(),
    params.listingType,
    params.propertyType,
    params.priceMin ?? '',
    params.priceMax ?? '',
  ].join('|');
}

/** Try to get Supabase client — returns null if env vars missing */
export function tryGetSupabase(): SupabaseClient | null {
  try {
    return getSupabaseAdmin();
  } catch {
    console.warn('[CACHE] Supabase not configured — caching disabled');
    return null;
  }
}

/** Get fresh cached results for a search key (within TTL). Returns map keyed by source_site URL. */
export async function getCachedResults(
  supabase: SupabaseClient,
  searchKey: string,
): Promise<Map<string, CacheRow>> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from('property_cache')
    .select('source_site, listing_data, scraped_at')
    .eq('search_key', searchKey)
    .gte('scraped_at', cutoff);

  if (error) {
    console.error('[CACHE] Read error:', error.message);
    return new Map();
  }

  const map = new Map<string, CacheRow>();
  for (const row of data ?? []) {
    map.set(row.source_site as string, row as CacheRow);
  }
  return map;
}

/** Upsert a single scrape result to cache (fire-and-forget). */
export async function cacheResult(
  supabase: SupabaseClient,
  searchKey: string,
  sourceSite: string,
  data: unknown,
): Promise<void> {
  const { error } = await supabase
    .from('property_cache')
    .upsert(
      {
        search_key: searchKey,
        source_site: sourceSite,
        listing_data: data,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: 'search_key,source_site', ignoreDuplicates: false },
    );

  if (error) {
    console.error(`[CACHE] Write error for ${sourceSite}:`, error.message);
  }
}
