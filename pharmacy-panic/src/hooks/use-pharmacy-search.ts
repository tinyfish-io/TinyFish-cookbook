'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SearchState } from '@/lib/types';
import { normalizePharmacyResult, isEmptyResult } from '@/lib/normalize';

export function usePharmacySearch(): {
  state: SearchState;
  search: (query: string) => void;
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
    (query: string) => {
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
          abortControllerRef.current = controller;

          const response = await fetch('/api/search', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
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
                const MAX_IFRAMES = 5;
                setState((prev) => {
                  const url = String(event.siteUrl || '');
                  if (prev.streamingUrls.some((s) => s.siteUrl === url)) return prev;
                  if (prev.streamingUrls.length >= MAX_IFRAMES) return prev;
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
                  console.warn(`[PHARMACY] Empty result from ${result.pharmacy}`);
                }

                const pharmacyKey = String(event.pharmacy || '');

                setState((prev) => ({
                  ...prev,
                  results: [...prev.results, result],
                  progress: {
                    ...prev.progress,
                    completed: prev.progress.completed + 1,
                  },
                  streamingUrls: prev.streamingUrls.map((s) =>
                    s.siteUrl.toLowerCase().includes(pharmacyKey.toLowerCase())
                      ? { ...s, done: true }
                      : s,
                  ),
                }));
              } else if (event.type === 'SEARCH_COMPLETE') {
                const total = Number(event.total ?? 0);
                const elapsed = String(event.elapsed ?? '');
                setState((prev) => ({
                  ...prev,
                  isSearching: false,
                  progress: { ...prev.progress, total },
                  elapsed,
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
              error: prev.results.length > 0 ? null : errorMsg,
              elapsed: prev.results.length > 0 ? (prev.elapsed ?? 'partial') : prev.elapsed,
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
