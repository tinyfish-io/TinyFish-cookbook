import { useState, useEffect } from 'react';
import { Loader2, Maximize2 } from 'lucide-react';
import { formatElapsedTime, getElapsedSeconds } from '@/lib/utils';
import { PLATFORM_INFO } from '@/lib/constants';
import type { ConceptAgentState } from '@/types';

interface ConceptCardLoadingProps {
  agent: ConceptAgentState;
}

export function ConceptCardLoading({ agent }: ConceptCardLoadingProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!agent.startedAt) return;

    const interval = setInterval(() => {
      setElapsed(getElapsedSeconds(agent.startedAt!));
    }, 1000);

    return () => clearInterval(interval);
  }, [agent.startedAt]);

  return (
    <div className="p-4 bg-card border border-border/50 rounded-lg h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
          <span className="text-xs text-primary font-medium">
            {PLATFORM_INFO[agent.platform].name}
          </span>
        </div>
        <span className="text-xs text-muted-foreground font-mono">
          {formatElapsedTime(elapsed)}
        </span>
      </div>

      {/* Status */}
      <p className="text-sm text-muted-foreground mb-3">
        {agent.currentStep || 'Initializing...'}
      </p>

      {/* Live Browser Preview */}
      {agent.streamingUrl ? (
        <div className="relative flex-1 bg-muted/20 rounded border border-border overflow-hidden min-h-[200px] group">
          <iframe
            src={agent.streamingUrl}
            className="w-full h-full border-0 pointer-events-none"
            title="Live agent preview"
            sandbox="allow-scripts allow-same-origin"
          />
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              className="p-2 bg-background/80 backdrop-blur-sm border border-border rounded hover:bg-background transition-colors"
              onClick={() => window.open(agent.streamingUrl, '_blank')}
            >
              <Maximize2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-muted/20 rounded border border-border flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Waiting for browser...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
