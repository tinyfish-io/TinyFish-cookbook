import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, BookOpen, UtensilsCrossed, Brain, Loader2, Monitor, Maximize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import type { RestaurantAgentState, AgentStatus } from '@/types';
import { cn } from '@/lib/utils';

interface AgentLoadingCardProps {
  agent: RestaurantAgentState;
  onExpandPreview?: (streamingUrl: string, restaurantName: string) => void;
}

const STATUS_CONFIG: Record<AgentStatus, { icon: typeof Search; label: string }> = {
  idle: { icon: Loader2, label: 'Waiting...' },
  connecting: { icon: Loader2, label: 'Connecting...' },
  searching_maps: { icon: Search, label: 'Searching Google Maps' },
  reading_reviews: { icon: BookOpen, label: 'Reading reviews' },
  checking_menu: { icon: UtensilsCrossed, label: 'Checking menu' },
  analyzing: { icon: Brain, label: 'Analyzing safety signals' },
  complete: { icon: Search, label: 'Complete' },
  error: { icon: Search, label: 'Error' },
};

export function AgentLoadingCard({ agent, onExpandPreview }: AgentLoadingCardProps) {
  const config = STATUS_CONFIG[agent.status];
  const Icon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      layout
    >
      <Card className="border-dashed border-primary/30 bg-card/50">
        <CardContent className="p-4">
          {/* Name */}
          <h3 className="text-base font-semibold text-foreground mb-3">
            {agent.restaurantName}
          </h3>

          {/* Status indicator */}
          <div className="flex items-center gap-2.5 mb-3">
            <Icon className={cn('w-4 h-4 text-primary', agent.status !== 'complete' && 'animate-spin')} />
            <span className="text-sm font-medium text-primary">{config.label}</span>
            <span className="relative flex h-2 w-2 ml-auto">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
          </div>

          {/* Current step */}
          <p className="text-xs text-muted-foreground truncate mb-3">
            {agent.currentStep}
          </p>

          {/* Live browser preview — sole progress indicator */}
          {agent.streamingUrl ? (
            <div
              className="rounded-lg overflow-hidden border border-primary/20 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => onExpandPreview?.(agent.streamingUrl!, agent.restaurantName)}
            >
              <div className="flex items-center justify-between px-2 py-1.5 bg-muted/50 border-b border-border">
                <div className="flex items-center gap-1.5">
                  <Monitor className="w-3 h-3 text-primary" />
                  <span className="text-[10px] font-medium text-muted-foreground">Live Preview</span>
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-primary" />
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>Expand</span>
                  <Maximize2 className="w-3 h-3" />
                </div>
              </div>
              <div className="min-h-[220px] h-[220px] bg-muted/30">
                <iframe
                  src={agent.streamingUrl}
                  className="w-full h-full border-0 pointer-events-none"
                  title={`Live preview for ${agent.restaurantName}`}
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
            </div>
          ) : (
            <div className="min-h-[220px] h-[220px] rounded-lg border border-dashed border-muted-foreground/20 flex items-center justify-center bg-muted/10">
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-xs">Waiting for browser...</span>
              </div>
            </div>
          )}

          {/* Elapsed time */}
          {agent.startedAt && <ElapsedTime startedAt={agent.startedAt} />}
        </CardContent>
      </Card>
    </motion.div>
  );
}

function ElapsedTime({ startedAt }: { startedAt: number }) {
  const [, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  return (
    <p className="text-[10px] text-muted-foreground/60 text-right mt-2">
      {elapsed}s
    </p>
  );
}
