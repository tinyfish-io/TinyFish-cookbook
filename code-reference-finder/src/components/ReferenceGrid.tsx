'use client';

import { AnimatePresence } from 'framer-motion';
import { AgentCard } from './AgentCard';
import { ReferenceCard } from './ReferenceCard';
import type { ReferenceAgentState } from '@/lib/types';

interface ReferenceGridProps {
  agents: Record<string, ReferenceAgentState>;
  onPreviewClick: (streamingUrl: string, title: string) => void;
}

export function ReferenceGrid({ agents, onPreviewClick }: ReferenceGridProps) {
  const agentList = Object.values(agents);

  if (agentList.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-zinc-500 text-sm">
        Waiting for search results...
      </div>
    );
  }

  // Sort: completed first (by relevance score desc), then in-progress, then errors
  const sorted = [...agentList].sort((a, b) => {
    if (a.status === 'complete' && b.status !== 'complete') return -1;
    if (a.status !== 'complete' && b.status === 'complete') return 1;
    if (a.status === 'error' && b.status !== 'error') return 1;
    if (a.status !== 'error' && b.status === 'error') return -1;
    if (a.result && b.result) {
      return b.result.relevanceScore - a.result.relevanceScore;
    }
    return 0;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-6">
      <AnimatePresence mode="popLayout">
        {sorted.map((agent) =>
          agent.status === 'complete' && agent.result ? (
            <ReferenceCard key={agent.id} data={agent.result} />
          ) : (
            <AgentCard
              key={agent.id}
              agent={agent}
              onPreviewClick={onPreviewClick}
            />
          )
        )}
      </AnimatePresence>
    </div>
  );
}
