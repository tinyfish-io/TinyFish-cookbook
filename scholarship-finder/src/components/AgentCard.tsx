import { Loader2, CheckCircle2, XCircle, Globe } from 'lucide-react';
import type { AgentStatus } from '@/types/summer-school';

interface AgentCardProps {
  agent: AgentStatus;
}

export function AgentCard({ agent }: AgentCardProps) {
  const getStatusIcon = () => {
    switch (agent.status) {
      case 'pending':
        return <div className="w-4 h-4 rounded-full bg-muted animate-pulse" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'error':
        return <XCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getStatusColor = () => {
    switch (agent.status) {
      case 'pending':
        return 'border-border';
      case 'running':
        return 'border-primary/50 bg-accent/30';
      case 'completed':
        return 'border-success/30 bg-success/5';
      case 'error':
        return 'border-destructive/30 bg-destructive/5';
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  return (
    <div
      className={`rounded-xl border p-4 transition-all duration-300 ${getStatusColor()}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getStatusIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <span className="text-sm font-medium truncate">
              {getDomain(agent.url)}
            </span>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2">
            {agent.message}
          </p>
        </div>
      </div>
    </div>
  );
}
