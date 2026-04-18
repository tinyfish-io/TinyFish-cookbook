import { useCallback, useRef } from 'react';
import { useDiscoveryContext } from '@/context/DiscoveryContext';
import { generateSearchQueries } from '@/lib/query-generator';
import { extractConceptFromText, generateSmartQueries } from '@/lib/openrouter-client';
import { AGENT_TIMEOUT } from '@/lib/constants';
import { buildAgentGoal } from '@/lib/goal-builder';
import { executeSearches } from '@/lib/search-engines';
import { startTinyFishAgent } from '@/lib/tinyfish-client';
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

        const hasOpenRouterKeyForExtraction = !!import.meta.env.VITE_OPENROUTER_API_KEY;
        const nonSO = uniqueResults.filter((r) => r.platform !== 'stackoverflow');
        const previewTargets = nonSO.slice(0, 2); // keep 2 live streams for UX
        const fetchTargets = nonSO.slice(2);
        const soTargets = uniqueResults.filter((r) => r.platform === 'stackoverflow');

        addLog(
          `🤖 Dispatching ${previewTargets.length} live agents + fetching ${fetchTargets.length} pages...`,
          'info'
        );

        // Track timeouts
        const timeoutMap = new Map<string, ReturnType<typeof setTimeout>>();

        const startStreamingAgent = (result: (typeof uniqueResults)[number]) => {
          const id = generateAgentId(result.platform);

          dispatch({
            type: 'AGENT_CONNECTING',
            payload: { id, url: result.url, platform: result.platform },
          });

          const goal = buildAgentGoal(result.url, result.platform, userInput, result);

          const agentUrl = result.url;

          const controller = startTinyFishAgent(
            { url: agentUrl, goal },
            {
              onStep: (event) => {
                const msg = event.purpose || event.action || event.message || 'Processing...';
                dispatch({ type: 'AGENT_STEP', payload: { id, step: msg } });
              },
              onStreamingUrl: (streamingUrl) => {
                dispatch({
                  type: 'AGENT_STREAMING_URL',
                  payload: { id, streamingUrl },
                });
              },
              onComplete: (resultJson) => {
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

          const timeout = setTimeout(() => {
            controller.abort();
            timeoutMap.delete(id);
            dispatch({
              type: 'AGENT_ERROR',
              payload: { id, error: 'Timeout: Agent took longer than 6 minutes' },
            });
            addLog(`⏱ Timeout: ${result.title} exceeded 6 minutes`, 'warning');
          }, AGENT_TIMEOUT);

          timeoutMap.set(id, timeout);
          controllersRef.current.push(controller);
        };

        // 1) Start two live streaming agents
        previewTargets.forEach(startStreamingAgent);

        /** Run async work with bounded concurrency (no return values). */
        async function runPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>) {
          if (items.length === 0) return;
          const queue = [...items];
          const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
            while (queue.length > 0) {
              const item = queue.shift();
              if (!item) break;
              await fn(item);
            }
          });
          await Promise.all(workers);
        }

        // 2) StackOverflow: extract via OpenRouter from existing snippet/apiData when available
        if (soTargets.length > 0) {
          if (!hasOpenRouterKeyForExtraction) {
            soTargets.forEach(startStreamingAgent);
          } else {
            await runPool(soTargets, 3, async (result) => {
              const id = generateAgentId(result.platform);
              dispatch({
                type: 'AGENT_CONNECTING',
                payload: { id, url: result.url, platform: result.platform },
              });
              dispatch({ type: 'AGENT_STEP', payload: { id, step: 'Analyzing Stack Overflow data...' } });
              try {
                const text = [
                  `Title: ${result.title}`,
                  `URL: ${result.url}`,
                  `Snippet: ${result.snippet ?? ''}`,
                  result.apiData ? `API Data: ${JSON.stringify(result.apiData)}` : '',
                ].join('\n');

                const data = await extractConceptFromText({
                  userInput,
                  platform: 'stackoverflow',
                  url: result.url,
                  title: result.title,
                  snippet: result.snippet,
                  text,
                });
                dispatch({ type: 'AGENT_COMPLETE', payload: { id, result: data } });
                addLog(`✓ Extracted: ${data.projectName}`, 'success');
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                dispatch({ type: 'AGENT_ERROR', payload: { id, error: msg } });
                addLog(`✗ Extract failed for ${result.title}: ${msg}`, 'error');
              }
            });
          }
        }

        // 3) Remaining pages: batch Fetch + OpenRouter extraction (fallback to agents if no OpenRouter)
        if (fetchTargets.length > 0) {
          if (!hasOpenRouterKeyForExtraction) {
            fetchTargets.forEach(startStreamingAgent);
          } else {
            const urls = fetchTargets.map((r) => r.url);
            const fetchRes = await fetch('/api/tinyfish/fetch', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ urls, format: 'markdown', links: true, image_links: false }),
            });

            if (!fetchRes.ok) {
              fetchTargets.forEach(startStreamingAgent);
            } else {
              const fetched = (await fetchRes.json()) as {
                results?: Array<{ url?: string; text?: string; title?: string; description?: string }>;
                errors?: Array<{ url?: string; error?: string }>;
              };

              const byUrl = new Map<string, { text: string; title?: string; description?: string }>();
              for (const r of fetched.results ?? []) {
                if (typeof r.url === 'string' && typeof r.text === 'string') {
                  byUrl.set(r.url, { text: r.text, title: r.title, description: r.description });
                }
              }

              await runPool(fetchTargets, 3, async (result) => {
                const id = generateAgentId(result.platform);
                dispatch({
                  type: 'AGENT_CONNECTING',
                  payload: { id, url: result.url, platform: result.platform },
                });
                dispatch({ type: 'AGENT_STEP', payload: { id, step: 'Fetching & summarizing…' } });

                const page = byUrl.get(result.url);
                if (!page?.text) {
                  dispatch({ type: 'AGENT_ERROR', payload: { id, error: 'Fetch failed' } });
                  addLog(`✗ Fetch failed for ${result.title}`, 'error');
                  return;
                }

                try {
                  const data = await extractConceptFromText({
                    userInput,
                    platform: result.platform,
                    url: result.url,
                    title: page.title || result.title,
                    snippet: page.description || result.snippet,
                    text: page.text,
                  });
                  dispatch({ type: 'AGENT_COMPLETE', payload: { id, result: data } });
                  addLog(`✓ Extracted: ${data.projectName}`, 'success');
                } catch (e) {
                  const msg = e instanceof Error ? e.message : String(e);
                  dispatch({ type: 'AGENT_ERROR', payload: { id, error: msg } });
                  addLog(`✗ Extract failed for ${result.title}: ${msg}`, 'error');
                }
              });
            }
          }
        }

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
