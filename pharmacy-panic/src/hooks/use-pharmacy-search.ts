'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchState } from '@/lib/types';
import { normalizePharmacyResult, isEmptyResult } from '@/lib/normalize';

export function usePharmacySearch(): {
  state: SearchState;
  search: (query: string, useCache?: boolean) => void;
  abort: () => void;
} {
  const [state, setState] = useState<SearchState>({
    results: [],
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
    (query: string, useCache?: boolean) => {
      abort();

      setState({
        results: [],
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
            body: JSON.stringify({ query, useCache: useCache ?? false }),
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
                const MAX_IFRAMES_PER_SEARCH = 5;
                setState((prev) => {
                  const url = String(event.siteUrl || '');
                  // Dedup: skip if we already have a streaming URL for this site
                  if (prev.streamingUrls.some(s => s.siteUrl === url)) return prev;
                  // Hard cap: don't accumulate more than MAX_IFRAMES_PER_SEARCH
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
              } else if (event.type === 'PHARMACY_RESULT') {
                const result = normalizePharmacyResult(event.result);

                if (isEmptyResult(result)) {
                  console.warn(
                    `[PHARMACY] Empty result from ${result.pharmacy} — 0 products found`
                  );
                }

                // The route sends pharmacy key (e.g. "longchau"), not the full URL.
                // Match streaming preview by checking if siteUrl contains the pharmacy key.
                const pharmacyKey = String(event.pharmacy || '');

                setState((prev) => ({
                  ...prev,
                  results: [...prev.results, result],
                  progress: {
                    ...prev.progress,
                    completed: prev.progress.completed + 1,
                  },
                  streamingUrls: prev.streamingUrls.map(s =>
                    s.siteUrl.toLowerCase().includes(pharmacyKey.toLowerCase())
                      ? { ...s, done: true }
                      : s
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
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            setState((prev) => ({
              ...prev,
              isSearching: false,
              // Suppress error if we already have results (connection dropped after partial success)
              error: prev.results.length > 0 ? null : errorMsg,
              // If results exist, mark elapsed as approximate
              elapsed: prev.results.length > 0 ? (prev.elapsed ?? 'partial') : prev.elapsed,
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
