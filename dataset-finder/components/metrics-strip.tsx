'use client';

import type { AgentState } from '@/lib/types';

interface MetricsStripProps {
  agents: AgentState[];
  searchTime: number;
}

export function MetricsStrip({ agents, searchTime }: MetricsStripProps) {
  const datasetsFound = agents.filter((a) => a.status === 'complete' && a.card).length;
  const sourcesQueried = agents.length;
  const notFound = agents.filter((a) => a.status === 'not_found' || a.status === 'error').length;
  const blocked = agents.filter((a) => a.status === 'blocked').length;
  const inProgress = agents.filter((a) => !['complete', 'blocked', 'not_found', 'error'].includes(a.status)).length;

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const metrics = [
    { label: 'Sources Queried', value: sourcesQueried, accent: false },
    { label: 'Datasets Found', value: datasetsFound, accent: true },
    { label: 'No Data', value: notFound, accent: false },
    { label: 'Blocked', value: blocked, accent: false },
    { label: 'In Progress', value: inProgress, accent: false },
    { label: 'Search Time', value: formatTime(searchTime), accent: false },
  ];

  return (
    <div className="border-t border-dashed border-border pt-4">
      <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
        {metrics.map((metric) => (
          <div key={metric.label} className="flex flex-col gap-0.5">
            <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground">
              {metric.label}
            </p>
            <p className={`text-lg font-semibold ${metric.accent ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
              {metric.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
