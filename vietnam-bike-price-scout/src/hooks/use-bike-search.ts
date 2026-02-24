'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Bike {
  name: string;
  engine_cc: number | null;
  type: 'scooter' | 'semi-auto' | 'manual' | 'adventure';
  price_daily_usd: number | null;
  price_weekly_usd: number | null;
  price_monthly_usd: number | null;
  currency: string;
  deposit_usd: number | null;
  available: boolean;
}

export interface BikeShop {
  shop_name: string;
  city: string;
  website: string;
  bikes: Bike[];
  notes: string | null;
  source?: 'cache' | 'live';
  cached_at?: string;
}

export interface SearchState {
  shops: BikeShop[];
  isSearching: boolean;
  progress: { completed: number; total: number };
  error: string | null;
  elapsed: string | null;
  cachedCount: number;
}

function normalizeShop(raw: unknown): BikeShop {
  const obj = raw as Record<string, unknown>;

  // Convert VND to USD if price > 1000 (assume VND, 1 USD = 25,000 VND)
  const convertPrice = (val: unknown): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    if (isNaN(n)) return null;
    return n > 1000 ? Math.round(n / 25000) : n;
  };

  // Ensure bikes is always an array
  let bikes: unknown[] = [];
  if (Array.isArray(obj.bikes)) {
    bikes = obj.bikes;
  } else if (obj.bikes && typeof obj.bikes === 'object') {
    bikes = [obj.bikes];
  }

  // Normalize each bike and filter out bikes with no name
  const normalizedBikes: Bike[] = bikes
    .map((bike) => {
      const b = bike as Record<string, unknown>;
      const name = String(b.name || '').trim();

      // Skip bikes with no name
      if (!name) return null;

      return {
        name,
        engine_cc: b.engine_cc ? Number(b.engine_cc) : null,
        type: (b.type as Bike['type']) || 'scooter',
        price_daily_usd: convertPrice(b.price_daily_usd),
        price_weekly_usd: convertPrice(b.price_weekly_usd),
        price_monthly_usd: convertPrice(b.price_monthly_usd),
        currency: String(b.currency || 'USD'),
        deposit_usd: convertPrice(b.deposit_usd),
        available: Boolean(b.available ?? true),
      };
    })
    .filter((bike): bike is Bike => bike !== null);

  return {
    shop_name: String(obj.shop_name || 'Unknown Shop'),
    city: String(obj.city || ''),
    website: String(obj.website || ''),
    bikes: normalizedBikes,
    notes: obj.notes ? String(obj.notes) : null,
  };
}

export function useBikeSearch(): {
  state: SearchState;
  search: (city: string) => void;
  abort: () => void;
} {
  const [state, setState] = useState<SearchState>({
    shops: [],
    isSearching: false,
    progress: { completed: 0, total: 0 },
    error: null,
    elapsed: null,
    cachedCount: 0,
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
    (city: string) => {
      // Abort any in-flight request
      abort();

      // Reset state
      setState({
        shops: [],
        isSearching: true,
        progress: { completed: 0, total: 0 },
        error: null,
        elapsed: null,
        cachedCount: 0,
      });

      (async () => {
        try {
          const controller = new AbortController();
          abortControllerRef.current = controller;

          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ city }),
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
              if (!line.startsWith('data: ')) {
                continue;
              }

              let event: Record<string, unknown>;
              try {
                event = JSON.parse(line.slice(6));
              } catch {
                continue;
              }

              if (event.type === 'SHOP_RESULT') {
                const shop = normalizeShop(event.shop);
                shop.source = (event.source as BikeShop['source']) ?? 'live';
                shop.cached_at = event.cached_at ? String(event.cached_at) : undefined;
                setState((prev) => ({
                  ...prev,
                  shops: [...prev.shops, shop],
                  progress: {
                    ...prev.progress,
                    completed: prev.progress.completed + 1,
                  },
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
            // User aborted, don't set error
            setState((prev) => ({ ...prev, isSearching: false }));
          } else {
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
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
    [abort]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return { state, search, abort };
}
