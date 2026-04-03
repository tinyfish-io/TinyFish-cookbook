'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Venue, Deal, DealType, District, SearchState, StreamingPreview } from '../lib/types';
import { normalizeVenue } from '../lib/normalize';

export type { Venue, Deal, DealType, District, SearchState, StreamingPreview };

const MAX_IFRAMES_PER_SEARCH = 5;

export function useDealSearch(): {
  state: SearchState;
  search: (district: District, useCache?: boolean) => void;
  abort: () => void;
} {
  const [state, setState] = useState<SearchState>({
    venues: [],
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
    (district: District, useCache?: boolean) => {
      abort();

      setState({
        venues: [],
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
            body: JSON.stringify({ district, useCache: useCache ?? false }),
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
              } else if (event.type === 'VENUE_RESULT') {
                const venue = normalizeVenue(event.venue);
                if (!venue) continue;
                venue.source = (event.source as Venue['source']) ?? 'live';
                venue.cached_at = event.cached_at ? String(event.cached_at) : undefined;
                setState((prev) => ({
                  ...prev,
                  venues: [...prev.venues, venue],
                  progress: {
                    ...prev.progress,
                    completed: prev.progress.completed + 1,
                  },
                  streamingUrls: prev.streamingUrls.map((s) =>
                    s.siteUrl === String(event.siteUrl || '') ? { ...s, done: true } : s
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
                   streamingUrls: prev.streamingUrls.map((s) => ({ ...s, done: true })),
                 }));
               }
            }
          }
        } catch (err) {
          if (err instanceof Error && err.name === 'AbortError') {
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

  useEffect(() => {
    return () => {
      abort();
    };
  }, [abort]);

  return { state, search, abort };
}
