'use client';

import { useState, useCallback, useMemo } from 'react';
import type { Dataset, AgentState, UseCase, DatasetCard } from '@/lib/types';

export function useDatasetSearch() {
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [agents, setAgents] = useState<AgentState[]>([]);
  const [error, setError] = useState<string | null>(null);

  const updateAgent = useCallback((agentId: string, updates: Partial<AgentState>) => {
    setAgents((prev: AgentState[]) =>
      prev.map((a: AgentState) => (a.id === agentId ? { ...a, ...updates } : a))
    );
  }, []);

  const parseCard = (data: unknown): DatasetCard | null => {
    if (!data || typeof data !== 'object') return null;

    const d = data as Record<string, unknown>;
    const cardData = d.resultJson || d.result || d.data || d;

    let parsed: unknown = cardData;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        const jsonMatch = (parsed as string).match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            parsed = JSON.parse(jsonMatch[0]);
          } catch {
            return null;
          }
        } else {
          return null;
        }
      }
    }

    if (!parsed || typeof parsed !== 'object') return null;

    const p = parsed as Record<string, unknown>;
    if (!p.name && !p.dataset_name) return null;

    return {
      name: (p.name || p.dataset_name) as string,
      description: (p.description || '') as string,
      best_for: Array.isArray(p.best_for) ? p.best_for : [],
      data_type: (p.data_type || 'Unknown') as string,
      source: (p.source || p.platform || '') as string,
      access: (p.access || p.access_method || 'Unknown') as string,
      what_you_get: (p.what_you_get || {}) as DatasetCard['what_you_get'],
      notes: Array.isArray(p.notes) ? p.notes : [],
      direct_link: (p.direct_link || '') as string,
      status: (p.status || 'Partial') as DatasetCard['status'],
      usability_risk: (p.usability_risk || 'Medium') as DatasetCard['usability_risk'],
    };
  };

  const startAgent = useCallback(
    async (agentId: string, dataset: Dataset, useCase: UseCase) => {
      updateAgent(agentId, { status: 'connecting', statusMessage: 'Connecting to browser...', currentStep: null });

      try {
        const response = await fetch('/api/analyze-dataset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: dataset.source_url, datasetName: dataset.name, useCase }),
        });

        if (!response.ok) throw new Error('Failed to start agent');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('No response stream');

        const decoder = new TextDecoder();
        let buffer = '';
        let lastCard: DatasetCard | null = null;

        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            if (buffer.trim()) {
              for (const line of buffer.split('\n')) {
                if (line.startsWith('data: ')) {
                  const rawData = line.slice(6).trim();
                  if (rawData && rawData !== '[DONE]') {
                    try {
                      const card = parseCard(JSON.parse(rawData));
                      if (card) lastCard = card;
                    } catch { /* skip */ }
                  }
                }
              }
            }

            if (lastCard) {
              const isBlocked = lastCard.status === 'Blocked';
              updateAgent(agentId, {
                status: isBlocked ? 'blocked' : 'complete',
                statusMessage: isBlocked ? 'Access blocked' : 'Inspection complete',
                currentStep: null,
                card: lastCard,
              });
            } else {
              // No card produced — treat as "not found", not a harsh error
              updateAgent(agentId, {
                status: 'not_found',
                statusMessage: 'No results found',
                currentStep: null,
                error: null,
              });
            }
            break;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const rawData = line.slice(6).trim();
            if (!rawData || rawData === '[DONE]') continue;

            try {
              const data = JSON.parse(rawData);

              if (data.streaming_url) {
                updateAgent(agentId, {
                  status: 'browsing',
                  statusMessage: 'Browser connected',
                  streaming_url: data.streaming_url,
                });
              }

              if (data.type === 'STATUS' && data.message) {
                updateAgent(agentId, {
                  status: 'analyzing',
                  statusMessage: data.message,
                  currentStep: data.message,
                });
              }

              if (data.type === 'COMPLETE' || data.type === 'RESULT' || data.type === 'FINAL' || data.resultJson) {
                const card = parseCard(data);
                if (card) {
                  lastCard = card;
                  const isBlocked = card.status === 'Blocked';
                  updateAgent(agentId, {
                    status: isBlocked ? 'blocked' : 'complete',
                    statusMessage: isBlocked ? 'Access blocked' : 'Inspection complete',
                    currentStep: null,
                    card,
                  });
                }
              }

              if (data.type === 'ERROR') {
                updateAgent(agentId, {
                  status: 'not_found',
                  statusMessage: 'Could not retrieve data',
                  currentStep: null,
                  error: null,
                });
              }
            } catch { /* skip invalid JSON */ }
          }
        }
      } catch (err) {
        // Network/server failures are true errors
        updateAgent(agentId, {
          status: 'error',
          statusMessage: 'Connection failed',
          currentStep: null,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    },
    [updateAgent]
  );

  const discoverDatasets = useCallback(
    async (topic: string, useCase: UseCase) => {
      setIsDiscovering(true);
      setError(null);
      setAgents([]);

      try {
        const response = await fetch('/api/discover-datasets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topic, useCase }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Failed to discover datasets');
        }

        const { datasets } = (await response.json()) as { datasets: Dataset[] };

        const initialAgents: AgentState[] = datasets.map((dataset, index) => ({
          id: `agent-${index}-${Date.now()}`,
          dataset,
          status: 'pending' as const,
          statusMessage: 'Waiting to start...',
          currentStep: null,
          streaming_url: null,
          card: null,
          error: null,
        }));

        setAgents(initialAgents);
        setIsDiscovering(false);

        for (const agent of initialAgents) {
          startAgent(agent.id, agent.dataset, useCase);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setIsDiscovering(false);
      }
    },
    [startAgent]
  );

  const retryAgent = useCallback(
    (agentId: string, useCase: UseCase) => {
      const agent = agents.find((a: AgentState) => a.id === agentId);
      if (!agent) return;
      updateAgent(agentId, {
        status: 'pending',
        statusMessage: 'Retrying...',
        currentStep: null,
        streaming_url: null,
        card: null,
        error: null,
      });
      startAgent(agentId, agent.dataset, useCase);
    },
    [agents, startAgent, updateAgent]
  );

  // Sorted agents: complete first, then in-progress, then not_found/blocked/error last
  const sortedAgents = useMemo(() => {
    const priority: Record<AgentState['status'], number> = {
      complete: 0,
      analyzing: 1,
      browsing: 2,
      connecting: 3,
      pending: 4,
      blocked: 5,
      not_found: 6,
      error: 7,
    };
    return [...agents].sort((a: AgentState, b: AgentState) => priority[a.status] - priority[b.status]);
  }, [agents]);

  const reset = useCallback(() => {
    setAgents([]);
    setError(null);
    setIsDiscovering(false);
  }, []);

  return { isDiscovering, agents, sortedAgents, error, discoverDatasets, retryAgent, reset };
}
