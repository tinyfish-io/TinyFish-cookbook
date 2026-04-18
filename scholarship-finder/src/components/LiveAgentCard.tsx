import { Loader2, CheckCircle2, XCircle, Globe, Monitor } from 'lucide-react';
import type { AgentStatus } from '@/types/summer-school';

interface LiveAgentCardProps {
  agent: AgentStatus;
}

export function LiveAgentCard({ agent }: LiveAgentCardProps) {
  const getStatusBadge = () => {
    switch (agent.status) {
      case 'pending':
        return (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-muted-foreground animate-pulse" />
            <span className="text-xs">Waiting...</span>
          </div>
        );
      case 'running':
        return (
          <div className="flex items-center gap-1.5 text-primary">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span className="text-xs font-medium">Live</span>
          </div>
        );
      case 'completed':
        return (
          <div className="flex items-center gap-1.5 text-success">
            <CheckCircle2 className="w-3 h-3" />
            <span className="text-xs">Done</span>
          </div>
        );
      case 'error':
        return (
          <div className="flex items-center gap-1.5 text-destructive">
            <XCircle className="w-3 h-3" />
            <span className="text-xs">Error</span>
          </div>
        );
    }
  };

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  };

  const isActive = agent.status === 'running' || agent.status === 'pending';

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-300 ${
        agent.status === 'running' 
          ? 'border-primary shadow-orange ring-2 ring-primary/20' 
          : agent.status === 'completed'
          ? 'border-success/30'
          : agent.status === 'error'
          ? 'border-destructive/30'
          : 'border-border'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Globe className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <span className="text-xs font-medium truncate">{getDomain(agent.url)}</span>
        </div>
        {getStatusBadge()}
      </div>

      {/* Live Preview */}
      <div className="relative bg-muted/30" style={{ height: '180px' }}>
        {agent.streamingUrl && isActive ? (
          <iframe
            src={agent.streamingUrl}
            className="w-full h-full border-0"
            title={`Live preview for ${getDomain(agent.url)}`}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            {agent.status === 'running' ? (
              <>
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
                <p className="text-xs text-muted-foreground text-center px-3">
                  Connecting to browser...
                </p>
              </>
            ) : agent.status === 'pending' ? (
              <>
                <Monitor className="w-6 h-6 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Waiting to start</p>
              </>
            ) : agent.status === 'completed' ? (
              <>
                <CheckCircle2 className="w-6 h-6 text-success" />
                <p className="text-xs text-muted-foreground">Search completed</p>
              </>
            ) : (
              <>
                <XCircle className="w-6 h-6 text-destructive" />
                <p className="text-xs text-destructive text-center px-3">
                  {agent.error || 'Failed'}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Status Message */}
      <div className="px-3 py-2 bg-card border-t border-border">
        <p className="text-xs text-muted-foreground truncate">
          {agent.message}
        </p>
      </div>
    </div>
  );
}
