import { Monitor, Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types/tutor';

interface AgentPreviewCardProps {
  agent: AgentStatus;
}

export function AgentPreviewCard({ agent }: AgentPreviewCardProps) {
  const isActive = agent.status === 'searching';
  const isComplete = agent.status === 'complete';
  const isError = agent.status === 'error';

  return (
    <div
      className={cn(
        'relative rounded-xl border-2 overflow-hidden bg-card transition-all duration-300',
        isActive && 'border-primary/50 shadow-lg',
        isComplete && 'border-success/50',
        isError && 'border-destructive/50'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2">
          <Monitor className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground truncate max-w-[150px]">
            {agent.websiteName}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs text-muted-foreground">Searching...</span>
            </>
          )}
          {isComplete && (
            <>
              <CheckCircle2 className="w-4 h-4 text-success" />
              <span className="text-xs text-success">
                {agent.tutors.length} found
              </span>
            </>
          )}
          {isError && (
            <>
              <XCircle className="w-4 h-4 text-destructive" />
              <span className="text-xs text-destructive">Error</span>
            </>
          )}
        </div>
      </div>

      {/* Preview Area */}
      <div className="h-[140px] bg-muted/30 relative">
        {agent.streamingUrl ? (
          <iframe
            src={agent.streamingUrl}
            className="w-full h-full border-0"
            title={`Live preview for ${agent.websiteName}`}
            sandbox="allow-scripts allow-same-origin"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {isActive && (
              <>
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">{agent.message}</span>
              </>
            )}
            {isComplete && (
              <span className="text-sm text-muted-foreground">Search complete</span>
            )}
            {isError && (
              <span className="text-sm text-destructive">{agent.message}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
