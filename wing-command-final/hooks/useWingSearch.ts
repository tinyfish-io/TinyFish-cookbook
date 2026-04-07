'use client';

import { useState, useCallback, useRef } from 'react';
import { WingSpot, FlavorPersona } from '@/lib/types';

export interface WingSearchState {
  spots: WingSpot[];
  isSearching: boolean;
  isDone: boolean;
  location: { city: string; state: string } | null;
  message: string;
  sourceCount: number;
}

const initialState: WingSearchState = {
  spots: [],
  isSearching: false,
  isDone: false,
  location: null,
  message: '',
  sourceCount: 0,
};

export function useWingSearch() {
  const [state, setState] = useState<WingSearchState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const search = useCallback(async (zip: string, flavor: FlavorPersona | null) => {
    // Cancel any in-flight search
    abortRef.current?.abort();
    const abort = new AbortController();
    abortRef.current = abort;

    setState({ ...initialState, isSearching: true, message: 'Scouting wing spots...' });

    try {
      const params = new URLSearchParams({ zip, ...(flavor ? { flavor } : {}) });
      const res = await fetch(`/api/scout?${params}`, { signal: abort.signal });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      if (!res.body) throw new Error('No response body');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === 'LOCATION') {
              setState((prev) => ({ ...prev, location: data.location }));
            }
            if (data.type === 'SOURCES') {
              setState((prev) => ({ ...prev, sourceCount: data.count }));
            }
            // Stream spots in immediately as each agent completes
            if (data.type === 'SPOTS') {
              setState((prev) => ({
                ...prev,
                spots: [...prev.spots, ...data.spots],
              }));
            }
            if (data.type === 'DONE') {
              setState((prev) => ({
                ...prev,
                isSearching: false,
                isDone: true,
                message: data.message || '',
              }));
            }
            if (data.type === 'ERROR') {
              setState((prev) => ({
                ...prev,
                isSearching: false,
                isDone: true,
                message: data.message || 'Search failed',
              }));
            }
          } catch { /* ignore parse errors */ }
        }
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setState((prev) => ({
        ...prev,
        isSearching: false,
        isDone: true,
        message: err instanceof Error ? err.message : 'Search failed',
      }));
    }
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setState(initialState);
  }, []);

  return { ...state, search, reset };
}
