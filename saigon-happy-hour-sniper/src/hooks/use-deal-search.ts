'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Venue, Deal, DealType, District, StreamingPreview } from '../lib/types';
import { normalizeVenue } from '../lib/normalize';

export type { Venue, Deal, DealType, District, StreamingPreview };

export interface SearchState {
  venues: Venue[];
  isSearching: boolean;
  progress: { completed: number; total: number };
  error: string | null;
  elapsed: string | null;
  streamingUrls: StreamingPreview[];
}

const MAX_IFRAMES_PER_SEARCH = 5;

export function useDealSearch(): {
  state: SearchState;
  search: (district: District) => void;
  abort: () => void;
} {
  const [state, setState] = useState<SearchState>({
    venues: [],
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
    (district: District) => {
      abort();

      setState({
        venues: [],
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
            body: JSON.stringify({ district }),
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
                setState((prev) => ({
                  ...prev,
                  progress: { ...prev.progress, total: Number(event.total ?? 0) },
                }));
              } else if (event.type === 'STREAMING_URL') {
                setState((prev) => {
                  const url = String(event.siteUrl || '');
                  const streamingUrl = String(event.streamingUrl || '');
                  if (!streamingUrl) return prev;
                  if (prev.streamingUrls.some((s) => s.siteUrl === url)) return prev;
                  if (prev.streamingUrls.length >= MAX_IFRAMES_PER_SEARCH) return prev;
                  return {
                    ...prev,
                    streamingUrls: [...prev.streamingUrls, { siteUrl: url, streamingUrl, done: false }],
                  };
                });
              } else if (event.type === 'VENUE_RESULT') {
                const venue = normalizeVenue(event.venue);
                if (!venue) continue;
                venue.source = 'live';
                setState((prev) => ({
                  ...prev,
                  venues: [...prev.venues, venue],
                  progress: { ...prev.progress, completed: prev.progress.completed + 1 },
                  streamingUrls: prev.streamingUrls.map((s) =>
                    s.siteUrl === String(event.siteUrl || '') ? { ...s, done: true } : s
                  ),
                }));
              } else if (event.type === 'STREAMING_DONE') {
                setState((prev) => ({
                  ...prev,
                  streamingUrls: prev.streamingUrls.map((s) =>
                    s.siteUrl === String(event.siteUrl || '') ? { ...s, done: true } : s
                  ),
                }));
              } else if (event.type === 'SEARCH_COMPLETE') {
                setState((prev) => ({
                  ...prev,
                  isSearching: false,
                  progress: { ...prev.progress, total: Number(event.total ?? prev.progress.total) },
                  elapsed: String(event.elapsed ?? ''),
                  streamingUrls: prev.streamingUrls.map((s) => ({ ...s, done: true })),
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
