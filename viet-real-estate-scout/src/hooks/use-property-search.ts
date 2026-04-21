'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchParams } from '@/lib/sites';

export type { SearchParams };

export interface Property {
  title: string;
  price_vnd: number | null;
  price_display: string;
  area_sqm: number | null;
  address: string;
  bedrooms: number | null;
  bathrooms: number | null;
  property_type: 'apartment' | 'house' | 'land' | 'room';
  listing_type: 'rent' | 'buy';
  image_url: string | null;
  detail_url: string | null;
  posted_date: string | null;
  lat?: number;
  lng?: number;
}

export interface PropertyListing {
  source: string;
  website: string;
  location_searched: string;
  listings: Property[];
  source_type?: 'cache' | 'live';
}

export interface StreamingPreview {
  siteUrl: string;
  streamingUrl: string;
  done: boolean;
}

export interface SearchState {
  results: PropertyListing[];
  isSearching: boolean;
  progress: { completed: number; total: number };
  error: string | null;
  elapsed: string | null;
  streamingUrls: StreamingPreview[];
}

const VALID_PROPERTY_TYPES = new Set(['apartment', 'house', 'land', 'room']);

function normalizePropertyType(raw: unknown): Property['property_type'] {
  const t = String(raw || '').toLowerCase().trim();
  if (VALID_PROPERTY_TYPES.has(t)) return t as Property['property_type'];
  return 'apartment';
}

function normalizeListing(raw: unknown): PropertyListing {
  const obj = raw as Record<string, unknown>;

  const rawListings = Array.isArray(obj.listings) ? obj.listings : [];
  const listings: Property[] = rawListings
    .map((item) => {
      const p = item as Record<string, unknown>;
      const title = String(p.title || '').trim();
      if (!title) return null;

      return {
        title,
        price_vnd: p.price_vnd != null ? Number(p.price_vnd) || null : null,
        price_display: String(p.price_display || ''),
        area_sqm: p.area_sqm != null ? Number(p.area_sqm) || null : null,
        address: String(p.address || ''),
        bedrooms: p.bedrooms != null ? Number(p.bedrooms) || null : null,
        bathrooms: p.bathrooms != null ? Number(p.bathrooms) || null : null,
        property_type: normalizePropertyType(p.property_type),
        listing_type: p.listing_type === 'rent' ? 'rent' : 'buy',
        image_url: p.image_url ? String(p.image_url).trim() || null : null,
        detail_url: p.detail_url ? String(p.detail_url).trim() || null : null,
        posted_date: p.posted_date ? String(p.posted_date) : null,
      } satisfies Property;
    })
    .filter((p): p is Property => p !== null);

  return {
    source: String(obj.source || 'Unknown'),
    website: String(obj.website || ''),
    location_searched: String(obj.location_searched || ''),
    listings,
  };
}

const MAX_STREAMING_PREVIEWS = 5;

export function usePropertySearch(): {
  state: SearchState;
  search: (params: SearchParams) => void;
  abort: () => void;
} {
  const [state, setState] = useState<SearchState>({
    results: [],
    isSearching: false,
    progress: { completed: 0, total: 0 },
    error: null,
    elapsed: null,
    streamingUrls: [],
  });

  const abortRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const abort = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    readerRef.current?.cancel();
    readerRef.current = null;
  }, []);

  const search = useCallback(
    (params: SearchParams) => {
      abort();
      setState({
        results: [],
        isSearching: true,
        progress: { completed: 0, total: 0 },
        error: null,
        elapsed: null,
        streamingUrls: [],
      });

      (async () => {
        try {
          const controller = new AbortController();
          abortRef.current = controller;

          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params),
            signal: controller.signal,
          });

          if (!response.ok) throw new Error(`Search failed: ${response.status}`);
          if (!response.body) throw new Error('Response body is empty');

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
                const siteUrl = String(event.siteUrl || '');
                setState((prev) => {
                  if (prev.streamingUrls.some((s) => s.siteUrl === siteUrl)) return prev;
                  if (prev.streamingUrls.length >= MAX_STREAMING_PREVIEWS) return prev;
                  return {
                    ...prev,
                    streamingUrls: [
                      ...prev.streamingUrls,
                      { siteUrl, streamingUrl: String(event.streamingUrl || ''), done: false },
                    ],
                  };
                });
              } else if (event.type === 'LISTING_RESULT') {
                const listing = normalizeListing(event.listing);
                const siteUrl = String(event.siteUrl || '');
                setState((prev) => ({
                  ...prev,
                  results: [...prev.results, listing],
                  progress: { ...prev.progress, completed: prev.progress.completed + 1 },
                  streamingUrls: prev.streamingUrls.map((s) =>
                    s.siteUrl === siteUrl ? { ...s, done: true } : s,
                  ),
                }));
              } else if (event.type === 'SEARCH_COMPLETE') {
                setState((prev) => ({
                  ...prev,
                  isSearching: false,
                  progress: { ...prev.progress, total: Number(event.total ?? 0) },
                  elapsed: String(event.elapsed ?? ''),
                }));
              }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
            setState((prev) => ({ ...prev, isSearching: false }));
          } else {
            setState((prev) => ({
              ...prev,
              isSearching: false,
              error: err instanceof Error ? err.message : 'Unknown error',
            }));
          }
        } finally {
          readerRef.current = null;
        }
      })();
    },
    [abort],
  );

  useEffect(() => () => abort(), [abort]);

  return { state, search, abort };
}
