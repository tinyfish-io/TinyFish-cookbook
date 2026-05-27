'use client';

import { cn } from '@/lib/utils';
import type { AgentState } from '@/lib/types';

interface AgentStatusGridProps {
  agents: AgentState[];
}

function getStatusLabel(status: AgentState['status']): string {
  switch (status) {
    case 'pending': return 'QUEUED';
    case 'connecting': return 'CONNECTING';
    case 'browsing': return 'BROWSING';
    case 'analyzing': return 'ANALYZING';
    case 'complete': return 'FOUND';
    case 'blocked': return 'BLOCKED';
    case 'not_found': return 'NO DATA';
    case 'error': return 'FAILED';
  }
}

function getProgress(status: AgentState['status']): number {
  switch (status) {
    case 'pending': return 10;
    case 'connecting': return 30;
    case 'browsing': return 50;
    case 'analyzing': return 75;
    case 'complete':
    case 'blocked':
    case 'not_found':
    case 'error': return 100;
  }
}

export function AgentStatusGrid({ agents }: AgentStatusGridProps) {
  if (agents.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="font-mono text-sm font-semibold uppercase tracking-wide text-foreground">
        Agent Activity
      </h3>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {agents.map((agent) => {
          const label = getStatusLabel(agent.status);
          const progress = getProgress(agent.status);
          const isActiveAgent = ['connecting', 'browsing', 'analyzing'].includes(agent.status);
          const isSuccess = agent.status === 'complete';
          const isFailed = agent.status === 'not_found' || agent.status === 'error';
          const isBlockedAgent = agent.status === 'blocked';

          return (
            <div
              key={agent.id}
              className={cn(
                'rounded-lg border p-2.5 transition-all duration-300',
                isSuccess && 'border-emerald-500/30 bg-emerald-500/5',
                isActiveAgent && 'border-primary/40 bg-primary/5',
                isBlockedAgent && 'border-amber-500/30 bg-amber-500/5',
                isFailed && 'border-border bg-muted/30',
                !isSuccess && !isActiveAgent && !isBlockedAgent && !isFailed && 'border-border bg-card'
              )}
            >
              <p className="truncate text-[11px] font-medium text-foreground mb-0.5">
                {agent.dataset.name}
              </p>
              <p
                className={cn(
                  'text-[9px] font-mono uppercase tracking-widest',
                  isSuccess && 'text-emerald-600 dark:text-emerald-400',
                  isActiveAgent && 'text-primary',
                  isBlockedAgent && 'text-amber-600 dark:text-amber-400',
                  isFailed && 'text-muted-foreground',
                  !isSuccess && !isActiveAgent && !isBlockedAgent && !isFailed && 'text-muted-foreground'
                )}
              >
                {label}
              </p>
              <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-border">
                <div
                  className={cn(
                    'h-full transition-all duration-700 ease-out',
                    isSuccess && 'bg-emerald-500',
                    isActiveAgent && 'bg-primary',
                    isBlockedAgent && 'bg-amber-500',
                    isFailed && 'bg-muted-foreground/30',
                    !isSuccess && !isActiveAgent && !isBlockedAgent && !isFailed && 'bg-primary/50'
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
