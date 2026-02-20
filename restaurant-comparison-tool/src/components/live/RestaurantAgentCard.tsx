import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AgentStatusIndicator } from './AgentStatusIndicator';
import { MiniPreview } from './LiveBrowserPreview';
import type { RestaurantAgentState } from '@/types';

interface RestaurantAgentCardProps {
  agent: RestaurantAgentState;
  onExpandPreview: (streamingUrl: string, restaurantName: string) => void;
}

export function RestaurantAgentCard({ agent, onExpandPreview }: RestaurantAgentCardProps) {
  const [showSteps, setShowSteps] = useState(false);
  const isActive = !['idle', 'complete', 'error'].includes(agent.status);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`transition-all duration-300 ${isActive ? 'border-primary/40 shadow-md' : ''} ${agent.status === 'error' ? 'border-destructive/40' : ''}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            {agent.restaurantName}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <AgentStatusIndicator
            status={agent.status}
            currentStep={agent.currentStep}
          />

          {agent.error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {agent.error}
            </p>
          )}

          {agent.streamingUrl && isActive && (
            <MiniPreview
              streamingUrl={agent.streamingUrl}
              onClick={() => onExpandPreview(agent.streamingUrl!, agent.restaurantName)}
            />
          )}

          {agent.steps.length > 0 && (
            <div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-between text-xs text-muted-foreground h-7"
                onClick={() => setShowSteps(!showSteps)}
              >
                <span>{agent.steps.length} steps completed</span>
                {showSteps ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </Button>
              {showSteps && (
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1 px-2">
                  {agent.steps.map((step, i) => (
                    <p key={i} className="text-xs text-muted-foreground">
                      <span className="text-muted-foreground/50">{i + 1}.</span> {step.message}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {isActive && agent.startedAt && (
            <ElapsedTime startedAt={agent.startedAt} />
          )}
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
    <p className="text-xs text-muted-foreground text-right">
      {elapsed}s elapsed
    </p>
  );
}
