import { useCallback, useRef } from 'react';
import { useDiscoveryContext } from '@/context/DiscoveryContext';
import { generateSearchQueries } from '@/lib/query-generator';
import { generateSmartQueries } from '@/lib/openrouter-client';
import { executeSearches } from '@/lib/search-engines';
import { buildAgentGoal } from '@/lib/goal-builder';
import { startMinoAgent } from '@/lib/mino-client';
import { generateAgentId } from '@/lib/utils';
import type { ConceptData, LogEntry } from '@/types';

export function useConceptDiscovery() {
  const { state, dispatch } = useDiscoveryContext();
  const controllersRef = useRef<AbortController[]>([]);

  const addLog = useCallback(
    (message: string, type: LogEntry['type']) => {
      dispatch({
        type: 'ADD_LOG',
        payload: {
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          phase: state.phase,
          message,
          type,
        },
      });
    },
    [dispatch, state.phase]
  );

  const discover = useCallback(
    async (userInput: string) => {
      try {
        // Stage 0: Start discovery
        dispatch({ type: 'START_DISCOVERY', payload: { userInput } });
        addLog('🚀 Starting concept discovery...', 'info');

        // Stage 1: Generate search queries (LLM-powered with deterministic fallback)
        let queries;
        const hasOpenRouterKey = !!import.meta.env.VITE_OPENROUTER_API_KEY;

        if (hasOpenRouterKey) {
          addLog('🧠 Generating smart search queries with AI...', 'info');
          try {
            queries = await generateSmartQueries(userInput);
            addLog(`✓ AI generated ${queries.length} targeted queries`, 'success');
          } catch (err) {
            addLog(`⚠ AI query generation failed: ${(err as Error).message}. Using fallback...`, 'warning');
            queries = generateSearchQueries(userInput);
          }
        } else {
          addLog('🔍 Generating search queries...', 'info');
          queries = generateSearchQueries(userInput);
        }

        dispatch({ type: 'QUERIES_GENERATED', payload: { queries } });
        addLog(
          `✓ Generated ${queries.length} search queries across ${
            new Set(queries.map((q) => q.platform)).size
          } platforms`,
          'success'
        );

        // Stage 2: Execute searches
        addLog('🌐 Searching platforms for relevant URLs...', 'info');
        let results;
        try {
          results = await executeSearches(queries);
          dispatch({ type: 'SEARCH_COMPLETE', payload: { results } });
          addLog(
            `✓ Found ${results.length} relevant URLs (${
              results.filter((r) => r.platform === 'github').length
            } GitHub, ${
              results.filter((r) => r.platform === 'devto').length
            } Dev.to, ${
              results.filter((r) => r.platform === 'stackoverflow').length
            } Stack Overflow)`,
            'success'
          );
        } catch (error) {
          addLog(`✗ Search failed: ${(error as Error).message}`, 'error');
          return;
        }

        // Stage 3: Deduplicate and launch browser agents
        // Deduplicate by URL to avoid showing same project multiple times
        const seenUrls = new Set<string>();
        const uniqueResults = results.filter(result => {
          if (seenUrls.has(result.url)) {
            return false;
          }
          seenUrls.add(result.url);
          return true;
        });

        if (uniqueResults.length === 0) {
          addLog('⚠ No results found. Try a different search term.', 'warning');
          return;
        }

        addLog(`🤖 Dispatching ${uniqueResults.length} browser agents...`, 'info');

        // Track timeouts
        const timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();

        uniqueResults.forEach((result) => {
          const id = generateAgentId(result.platform);

            // Dispatch AGENT_CONNECTING
            dispatch({
              type: 'AGENT_CONNECTING',
              payload: { id, url: result.url, platform: result.platform },
            });

            // Build goal prompt (SO gets search result data for reasoning)
            const goal = buildAgentGoal(result.url, result.platform, userInput, result);

            // SO agents use a dummy URL — they reason about API data, not browse
            const agentUrl = result.platform === 'stackoverflow' ? 'https://example.com' : result.url;

            // Start Mino agent with SSE stream
            const controller = startMinoAgent(
              { url: agentUrl, goal },
              {
                onStep: (event) => {
                  const msg =
                    event.purpose || event.action || event.message || 'Processing...';
                  dispatch({ type: 'AGENT_STEP', payload: { id, step: msg } });
                },
                onStreamingUrl: (streamingUrl) => {
                  dispatch({
                    type: 'AGENT_STREAMING_URL',
                    payload: { id, streamingUrl },
                  });
                },
                onComplete: (resultJson) => {
                  // Clear timeout on completion
                  const timeout = timeoutMap.get(id);
                  if (timeout) {
                    clearTimeout(timeout);
                    timeoutMap.delete(id);
                  }

                  const data = resultJson as ConceptData;
                  dispatch({
                    type: 'AGENT_COMPLETE',
                    payload: { id, result: data },
                  });
                  addLog(`✓ Extracted: ${data.projectName}`, 'success');
                },
                onError: (error) => {
                  // Clear timeout on error
                  const timeout = timeoutMap.get(id);
                  if (timeout) {
                    clearTimeout(timeout);
                    timeoutMap.delete(id);
                  }

                  dispatch({ type: 'AGENT_ERROR', payload: { id, error } });
                  addLog(`✗ Agent failed for ${result.title}: ${error}`, 'error');
                },
              }
            );

            // Set 6-minute timeout
            const timeout = setTimeout(() => {
              controller.abort();
              timeoutMap.delete(id);
              dispatch({
                type: 'AGENT_ERROR',
                payload: { id, error: 'Timeout: Agent took longer than 6 minutes' }
              });
              addLog(`⏱ Timeout: ${result.title} exceeded 6 minutes`, 'warning');
            }, 360000); // 6 minutes = 360000ms

            timeoutMap.set(id, timeout);
            controllersRef.current.push(controller);
          });

        addLog(
          `⏳ Extraction in progress... Results will appear as they complete.`,
          'info'
        );
      } catch (error) {
        addLog(`✗ Discovery failed: ${(error as Error).message}`, 'error');
      }
    },
    [dispatch, addLog]
  );

  const cancelAll = useCallback(() => {
    controllersRef.current.forEach((c) => c.abort());
    controllersRef.current = [];
    addLog('⏸ Discovery cancelled', 'warning');
  }, [addLog]);

  const reset = useCallback(() => {
    cancelAll();
    dispatch({ type: 'RESET' });
  }, [cancelAll, dispatch]);

  return { discover, cancelAll, reset, state };
}
