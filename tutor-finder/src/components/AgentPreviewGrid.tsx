import { AgentPreviewCard } from './AgentPreviewCard';
import type { AgentStatus } from '@/types/tutor';

interface AgentPreviewGridProps {
  agents: AgentStatus[];
}

export function AgentPreviewGrid({ agents }: AgentPreviewGridProps) {
  // Only show agents that are still searching
  const activeAgents = agents.filter(a => a.status === 'searching');

  if (activeAgents.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-4">
        <h3 className="text-lg font-semibold text-foreground">Live Search</h3>
        <span className="text-sm text-muted-foreground">
          {activeAgents.length} agent{activeAgents.length !== 1 ? 's' : ''} searching
        </span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {activeAgents.map((agent) => (
          <AgentPreviewCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
