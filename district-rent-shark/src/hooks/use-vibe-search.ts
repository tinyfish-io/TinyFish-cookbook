'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface POICategory {
  count: number;
  top: { name: string; rating: number | null; address: string }[];
}

export interface DistrictVibe {
  district: string;
  city: string;
  amenities: {
    coworking: POICategory;
    gyms: POICategory;
    nightlife: POICategory;
    supermarkets: POICategory;
    pharmacies: POICategory;
  };
  walkability_score: number | null;
  source?: 'cache' | 'live';
  cached_at?: string;
}

export interface VibeSearchState {
  vibes: DistrictVibe[];
  isSearching: boolean;
  progress: { completed: number; total: number };
  error: string | null;
}

const DEFAULT_POI: POICategory = { count: 0, top: [] };

function normalizeVibeResult(raw: unknown): DistrictVibe {
  const obj = raw as Record<string, unknown>;
  const amenities = (obj.amenities || {}) as Record<string, unknown>;

  const normCategory = (cat: unknown): POICategory => {
    if (!cat || typeof cat !== 'object') return DEFAULT_POI;
    const c = cat as Record<string, unknown>;
    return {
      count: typeof c.count === 'number' ? c.count : 0,
      top: Array.isArray(c.top)
        ? c.top.map((t: unknown) => {
            const item = t as Record<string, unknown>;
            return {
              name: String(item.name || ''),
              rating: item.rating != null ? Number(item.rating) || null : null,
              address: String(item.address || ''),
            };
          })
        : [],
    };
  };

  return {
    district: String(obj.district || ''),
    city: String(obj.city || ''),
    amenities: {
      coworking: normCategory(amenities.coworking),
      gyms: normCategory(amenities.gyms),
      nightlife: normCategory(amenities.nightlife),
      supermarkets: normCategory(amenities.supermarkets),
      pharmacies: normCategory(amenities.pharmacies),
    },
    walkability_score:
      obj.walkability_score != null
        ? Number(obj.walkability_score) || null
        : null,
  };
}

export function useVibeSearch(): {
  state: VibeSearchState;
  search: (city: string, useCache?: boolean) => void;
  abort: () => void;
} {
  const [state, setState] = useState<VibeSearchState>({
    vibes: [],
    isSearching: false,
    progress: { completed: 0, total: 0 },
    error: null,
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
        vibes: [],
        isSearching: true,
        progress: { completed: 0, total: 0 },
        error: null,
      });

      (async () => {
        try {
          const controller = new AbortController();
          abortControllerRef.current = controller;

          const response = await fetch('/api/vibe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city, useCache: useCache ?? false }),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error(`Vibe search failed: ${response.status}`);
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
                // Vibe streaming URLs are informational only — no iframe preview needed
              } else if (event.type === 'VIBE_RESULT') {
                const vibe = normalizeVibeResult(event.data);
                vibe.source =
                  (event.source as DistrictVibe['source']) ?? 'live';
                vibe.cached_at = event.cached_at
                  ? String(event.cached_at)
                  : undefined;

                // Use district from event envelope if normalizer missed it
                if (!vibe.district && event.district) {
                  vibe.district = String(event.district);
                }

                setState((prev) => ({
                  ...prev,
                  vibes: [...prev.vibes, vibe],
                  progress: {
                    ...prev.progress,
                    completed: prev.progress.completed + 1,
                  },
                }));
              } else if (event.type === 'VIBE_COMPLETE') {
                const total = Number(event.total ?? 0);
                setState((prev) => ({
                  ...prev,
                  isSearching: false,
                  progress: { ...prev.progress, total },
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
