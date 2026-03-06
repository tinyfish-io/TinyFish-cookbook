'use client';

import { useCallback, useRef } from 'react';
import { useAppContext } from '@/context/AppContext';
import type {
  OrchestratorEvent,
  CodeAnalysis,
  SearchQuery,
  SearchResult,
  ReferenceData,
  SourcePlatform,
} from '@/lib/types';

export function useCodeAnalysis() {
  const { state, dispatch } = useAppContext();
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(
    async (code: string) => {
      // Cancel any in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      dispatch({ type: 'START_ANALYSIS', payload: { code } });

      try {
        const response = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
          signal: controller.signal,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        if (!response.body) {
          throw new Error('No response stream');
        }

        // Read SSE stream
        const reader = response.body.getReader();
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

            let event: OrchestratorEvent;
            try {
              event = JSON.parse(line.slice(6));
            } catch {
              continue;
            }

            switch (event.type) {
              case 'analysis_complete':
                dispatch({
                  type: 'ANALYSIS_COMPLETE',
                  payload: {
                    analysis: event.data.analysis as CodeAnalysis,
                    queries: event.data.queries as SearchQuery[],
                  },
                });
                break;

              case 'search_complete':
                dispatch({
                  type: 'SEARCH_COMPLETE',
                  payload: {
                    results: event.data.results as SearchResult[],
                  },
                });
                break;

              case 'agent_connecting':
                dispatch({
                  type: 'AGENT_CONNECTING',
                  payload: {
                    id: event.data.id as string,
                    url: event.data.url as string,
                    platform: event.data.platform as SourcePlatform,
                  },
                });
                break;

              case 'agent_step':
                dispatch({
                  type: 'AGENT_STEP',
                  payload: {
                    id: event.data.id as string,
                    step: event.data.step as string,
                  },
                });
                break;

              case 'agent_streaming_url':
                dispatch({
                  type: 'AGENT_STREAMING_URL',
                  payload: {
                    id: event.data.id as string,
                    streamingUrl: event.data.streamingUrl as string,
                  },
                });
                break;

              case 'agent_complete':
                dispatch({
                  type: 'AGENT_COMPLETE',
                  payload: {
                    id: event.data.id as string,
                    result: event.data.result as ReferenceData,
                  },
                });
                break;

              case 'agent_error':
                dispatch({
                  type: 'AGENT_ERROR',
                  payload: {
                    id: event.data.id as string,
                    error: event.data.error as string,
                  },
                });
                break;
            }
          }
        }
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Analysis failed:', error);
        }
      }
    },
    [dispatch]
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const reset = useCallback(() => {
    cancel();
    dispatch({ type: 'RESET' });
  }, [cancel, dispatch]);

  return { analyze, cancel, reset, state };
}
