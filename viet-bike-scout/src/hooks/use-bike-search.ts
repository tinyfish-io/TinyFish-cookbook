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
  url: string | null;
}

export interface BikeShop {
  shop_name: string;
  city: string;
  website: string;
  bikes: Bike[];
  notes: string | null;
}

export interface StreamingPreview {
  siteUrl: string;
  streamingUrl: string;
  done: boolean;
}

export interface SearchState {
  shops: BikeShop[];
  isSearching: boolean;
  progress: { completed: number; total: number };
  error: string | null;
  elapsed: string | null;
  streamingUrls: StreamingPreview[];
}

const normalizeType = (raw: unknown): Bike['type'] => {
  const t = String(raw || '').toLowerCase().trim();
  const typeMap: Record<string, Bike['type']> = {
    scooter: 'scooter',
    automatic: 'scooter',
    auto: 'scooter',
    moped: 'scooter',
    'step-through': 'scooter',
    'semi-auto': 'semi-auto',
    'semi-automatic': 'semi-auto',
    'semi automatic': 'semi-auto',
    underbone: 'semi-auto',
    manual: 'manual',
    standard: 'manual',
    sport: 'manual',
    naked: 'manual',
    adventure: 'adventure',
    enduro: 'adventure',
    'dual-sport': 'adventure',
    'off-road': 'adventure',
    touring: 'adventure',
    trail: 'adventure',
  };
  return typeMap[t] ?? 'scooter';
};

function normalizeShop(raw: unknown): BikeShop {
  const obj = raw as Record<string, unknown>;

  const convertPrice = (val: unknown): number | null => {
    if (val === null || val === undefined || val === '') return null;
    const n = Number(val);
    if (isNaN(n)) return null;
    return n > 1000 ? Math.round(n / 25000) : n;
  };

  let bikes: unknown[] = [];
  if (Array.isArray(obj.bikes)) {
    bikes = obj.bikes;
  } else if (obj.bikes && typeof obj.bikes === 'object') {
    bikes = [obj.bikes];
  }

  const normalizedBikes: Bike[] = bikes
    .map((bike) => {
      const b = bike as Record<string, unknown>;
      const name = String(b.name || '').trim();
      if (!name) return null;
      return {
        name,
        engine_cc: b.engine_cc ? Number(b.engine_cc) : null,
        type: normalizeType(b.type),
        price_daily_usd: convertPrice(b.price_daily_usd),
        price_weekly_usd: convertPrice(b.price_weekly_usd),
        price_monthly_usd: convertPrice(b.price_monthly_usd),
        currency: String(b.currency || 'USD'),
        deposit_usd: convertPrice(b.deposit_usd),
        available: Boolean(b.available ?? true),
        url: b.url ? String(b.url).trim() || null : null,
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

function markStreamingPreviewDone(previews: StreamingPreview[], siteUrl: string): StreamingPreview[] {
  return previews.map((p) => (p.siteUrl === siteUrl ? { ...p, done: true } : p));
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
    streamingUrls: [],
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const abort = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    readerRef.current?.cancel();
    readerRef.current = null;
  }, []);

  const search = useCallback(
    (city: string) => {
      abort();

      setState({
        shops: [],
        isSearching: true,
        progress: { completed: 0, total: 0 },
        error: null,
        elapsed: null,
        streamingUrls: [],
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

              if (event.type === 'SEARCH_STARTED') {
                // Set total immediately so progress bar is accurate from the start
                setState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, total: Number(event.total ?? 0) },
                }));
              } else if (event.type === 'STREAMING_URL') {
                const MAX_IFRAMES = 5;
                setState((prev) => {
                  const url = String(event.siteUrl || '');
                  const streamingUrl = String(event.streaming_url || '');
                  if (!streamingUrl) return prev;
                  if (prev.streamingUrls.some((s) => s.siteUrl === url)) return prev;
                  if (prev.streamingUrls.length >= MAX_IFRAMES) return prev;
                  return {
                    ...prev,
                    streamingUrls: [...prev.streamingUrls, { siteUrl: url, streamingUrl, done: false }],
                  };
                });
              } else if (event.type === 'SHOP_RESULT') {
                const shop = normalizeShop(event.shop);
                setState((prev) => ({
                  ...prev,
                  shops: [...prev.shops, shop],
                  progress: { ...prev.progress, completed: prev.progress.completed + 1 },
                  streamingUrls: markStreamingPreviewDone(prev.streamingUrls, String(event.siteUrl || '')),
                }));
              } else if (event.type === 'STREAMING_DONE') {
                setState((prev) => ({
                  ...prev,
                  streamingUrls: markStreamingPreviewDone(prev.streamingUrls, String(event.siteUrl || '')),
                }));
              } else if (event.type === 'SEARCH_COMPLETE') {
                setState((prev) => ({
                  ...prev,
                  isSearching: false,
                  progress: { ...prev.progress, total: Number(event.total ?? prev.progress.total) },
                  elapsed: String(event.elapsed ?? ''),
                  streamingUrls: prev.streamingUrls.map((p) => ({ ...p, done: true })),
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
    [abort]
  );

  useEffect(() => () => abort(), [abort]);

  return { state, search, abort };
}
