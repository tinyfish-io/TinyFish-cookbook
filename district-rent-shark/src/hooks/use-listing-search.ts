'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  parseVietnamesePrice,
  parseArea,
  normalizeDistrict,
  detectPosterType,
  computeTrustSignals,
} from '@/lib/normalize';

export interface TrustSignals {
  is_likely_broker: boolean;
  price_suspicious: boolean;
  has_photos: boolean;
  is_fresh: boolean;
}

export interface BuildingRules {
  pets_allowed: 'yes' | 'no' | 'unknown';
  parking: string;
  curfew: string;
  notes: string;
}

export interface RentalListing {
  title_en: string;
  price_vnd_monthly: number | null;
  negotiable: boolean;
  area_m2: number | null;
  address_en: string;
  district: string;
  bedrooms: number | null;
  bathrooms: number | null;
  post_date: string;
  poster_name: string;
  poster_type: 'owner' | 'broker' | 'unknown';
  amenities: string[];
  description_en: string;
  listing_url: string;
  thumbnail_url: string;
  latitude: number | null;
  longitude: number | null;
  trust_signals: TrustSignals;
  building_rules: BuildingRules;
}

export interface PlatformResult {
  platform: string;
  city: string;
  listings: RentalListing[];
  source?: 'cache' | 'live';
  cached_at?: string;
}

export interface StreamingPreview {
  siteUrl: string;
  streamingUrl: string;
  done: boolean;
}

export interface ListingSearchState {
  platforms: PlatformResult[];
  isSearching: boolean;
  progress: { completed: number; total: number };
  error: string | null;
  elapsed: string | null;
  cachedCount: number;
  streamingUrls: StreamingPreview[];
}

const MAX_IFRAMES_PER_SEARCH = 5;

function normalizePlatformResult(raw: unknown): PlatformResult {
  const obj = raw as Record<string, unknown>;

  let rawListings: unknown[] = [];
  if (Array.isArray(obj.listings)) {
    rawListings = obj.listings;
  } else if (obj.listings && typeof obj.listings === 'object') {
    rawListings = [obj.listings];
  }

  const listings: RentalListing[] = rawListings
    .map((item) => {
      const l = item as Record<string, unknown>;
      const title_en = String(l.title_en || '').trim();
      if (!title_en) return null;

      const priceResult = parseVietnamesePrice(
        l.price_vnd_monthly !== null && l.price_vnd_monthly !== undefined
          ? String(l.price_vnd_monthly)
          : null,
      );

      const area_m2 =
        typeof l.area_m2 === 'number'
          ? l.area_m2
          : parseArea(l.area_m2 != null ? String(l.area_m2) : null);

      const district = normalizeDistrict(String(l.district || ''));
      const poster_name = String(l.poster_name || '');
      const poster_type = detectPosterType(poster_name);

      const rawTrust = (l.trust_signals || {}) as Record<string, unknown>;
      const rawRules = (l.building_rules || {}) as Record<string, unknown>;

      return {
        title_en,
        price_vnd_monthly: priceResult.vnd,
        negotiable: priceResult.negotiable,
        area_m2,
        address_en: String(l.address_en || ''),
        district,
        bedrooms: l.bedrooms != null ? Number(l.bedrooms) || null : null,
        bathrooms: l.bathrooms != null ? Number(l.bathrooms) || null : null,
        post_date: String(l.post_date || ''),
        poster_name,
        poster_type,
        amenities: Array.isArray(l.amenities)
          ? l.amenities.map((a: unknown) => String(a))
          : [],
        description_en: String(l.description_en || ''),
        listing_url: String(l.listing_url || ''),
        thumbnail_url: String(l.thumbnail_url || ''),
        latitude: l.latitude != null ? Number(l.latitude) || null : null,
        longitude: l.longitude != null ? Number(l.longitude) || null : null,
        trust_signals: {
          is_likely_broker: Boolean(rawTrust.is_likely_broker),
          price_suspicious: Boolean(rawTrust.price_suspicious),
          has_photos: Boolean(rawTrust.has_photos ?? Boolean(l.thumbnail_url)),
          is_fresh: Boolean(rawTrust.is_fresh),
        },
        building_rules: {
          pets_allowed: (['yes', 'no', 'unknown'].includes(
            String(rawRules.pets_allowed || 'unknown'),
          )
            ? String(rawRules.pets_allowed)
            : 'unknown') as BuildingRules['pets_allowed'],
          parking: String(rawRules.parking || ''),
          curfew: String(rawRules.curfew || ''),
          notes: String(rawRules.notes || ''),
        },
      };
    })
    .filter((listing): listing is RentalListing => listing !== null);

  // Recompute trust signals with batch context
  const batchContext = listings.map((l) => ({
    price_vnd: l.price_vnd_monthly,
    area_m2: l.area_m2,
    district: l.district,
  }));

  for (const listing of listings) {
    const computed = computeTrustSignals(
      {
        price_vnd: listing.price_vnd_monthly,
        area_m2: listing.area_m2,
        poster_type: listing.poster_type,
        thumbnail_url: listing.thumbnail_url,
        post_date: listing.post_date,
      },
      batchContext,
    );
    listing.trust_signals = computed;
  }

  return {
    platform: String(obj.platform || 'Unknown'),
    city: String(obj.city || ''),
    listings,
  };
}

export function useListingSearch(): {
  state: ListingSearchState;
  search: (city: string, useCache?: boolean) => void;
  abort: () => void;
} {
  const [state, setState] = useState<ListingSearchState>({
    platforms: [],
    isSearching: false,
    progress: { completed: 0, total: 0 },
    error: null,
    elapsed: null,
    cachedCount: 0,
    streamingUrls: [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (readerRef.current) {
      readerRef.current.cancel();
      readerRef.current = null;
    }
  }, []);

  const search = useCallback(
    (city: string, useCache?: boolean) => {
      abort();

      setState({
        platforms: [],
        isSearching: true,
        progress: { completed: 0, total: 0 },
        error: null,
        elapsed: null,
        cachedCount: 0,
        streamingUrls: [],
      });

      (async () => {
        try {
          const controller = new AbortController();
          abortControllerRef.current = controller;

          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city, useCache: useCache ?? false }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Search failed: ${response.status}`);
          }

          if (!response.body) {
            throw new Error('Response body is empty');
          }

          const reader = response.body.getReader();
          readerRef.current = reader;
          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;

              let event: Record<string, unknown>;
              try {
                event = JSON.parse(line.slice(6));
              } catch {
                continue;
              }

              if (event.type === 'STREAMING_URL') {
                setState((prev) => {
                  const url = String(event.siteUrl || '');
                  if (prev.streamingUrls.some((s) => s.siteUrl === url)) return prev;
                  if (prev.streamingUrls.length >= MAX_IFRAMES_PER_SEARCH) return prev;
                  return {
                    ...prev,
                    streamingUrls: [
                      ...prev.streamingUrls,
                      {
                        siteUrl: url,
                        streamingUrl: String(event.streamingUrl || ''),
                        done: false,
                      },
                    ],
                  };
                });
              } else if (event.type === 'LISTING_RESULT') {
                const platform = normalizePlatformResult(event.data);
                platform.source =
                  (event.source as PlatformResult['source']) ?? 'live';
                platform.cached_at = event.cached_at
                  ? String(event.cached_at)
                  : undefined;
                setState((prev) => ({
                  ...prev,
                  platforms: [...prev.platforms, platform],
                  progress: {
                    ...prev.progress,
                    completed: prev.progress.completed + 1,
                  },
                  streamingUrls: prev.streamingUrls.map((s) =>
                    s.siteUrl === String(event.siteUrl || '')
                      ? { ...s, done: true }
                      : s,
                  ),
                }));
              } else if (event.type === 'SEARCH_COMPLETE') {
                const total = Number(event.total ?? 0);
                const elapsed = String(event.elapsed ?? '');
                const cachedCount = Number(event.cached ?? 0);
                setState((prev) => ({
                  ...prev,
                  isSearching: false,
                  progress: { ...prev.progress, total },
                  elapsed,
                  cachedCount,
                }));
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            setState((prev) => ({ ...prev, isSearching: false }));
          } else {
            const errorMsg =
              err instanceof Error ? err.message : 'Unknown error';
            setState((prev) => ({
              ...prev,
              isSearching: false,
              error: errorMsg,
            }));
          }
        } finally {
          readerRef.current = null;
        }
      })();
    },
    [abort],
  );

  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return { state, search, abort };
}
