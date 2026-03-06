import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Shield, Clock, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RestaurantResultCard } from './RestaurantResultCard';
import { ResultDetailPanel } from './ResultDetailPanel';
import { AgentLoadingCard } from './AgentLoadingCard';
import { LiveBrowserPreview } from '@/components/live/LiveBrowserPreview';
import type { RestaurantAgentState, SearchParams } from '@/types';
import { calculateAdjustedScore } from '@/lib/score-calculator';
import { ALLERGEN_INFO } from '@/lib/allergens';

interface ComparisonDashboardProps {
  agents: Record<string, RestaurantAgentState>;
  searchParams: SearchParams;
  searchStartedAt: number | null;
  searchCompletedAt: number | null;
  onCancel: () => void;
  onReset: () => void;
}

export function ComparisonDashboard({
  agents,
  searchParams,
  searchStartedAt,
  searchCompletedAt,
  onCancel,
  onReset,
}: ComparisonDashboardProps) {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<{ url: string; name: string } | null>(null);

  const agentList = Object.values(agents);
  const completedAgents = agentList.filter(a => a.status === 'complete' && a.result);
  const failedAgents = agentList.filter(a => a.status === 'error');
  const activeAgents = agentList.filter(a => a.status !== 'complete' && a.status !== 'error');
  const allDone = activeAgents.length === 0 && agentList.length > 0;

  // Rank completed agents by adjusted score
  const ranked = [...completedAgents].sort((a, b) => {
    const scoreA = calculateAdjustedScore(a.result!, searchParams.allergens, searchParams.preferences);
    const scoreB = calculateAdjustedScore(b.result!, searchParams.allergens, searchParams.preferences);
    return scoreB - scoreA;
  });

  const elapsedSeconds = searchStartedAt && searchCompletedAt
    ? Math.round((searchCompletedAt - searchStartedAt) / 1000)
    : null;

  const selectedAgent = selectedAgentId ? agents[selectedAgentId] : null;
  const selectedResult = selectedAgent?.result;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-5xl mx-auto"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">
              {allDone ? 'Safety Comparison Results' : 'Analyzing restaurants...'}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>"{searchParams.city}"</span>
            {searchParams.allergens.length > 0 && (
              <>
                <span className="text-border">|</span>
                <span>Allergens: {searchParams.allergens.map(a => ALLERGEN_INFO[a]?.label ?? a).join(', ')}</span>
              </>
            )}
            {elapsedSeconds !== null && (
              <>
                <span className="text-border">|</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {elapsedSeconds}s
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {!allDone && (
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="w-4 h-4 mr-1" />
              Cancel
            </Button>
          )}
          {allDone && (
            <Button variant="outline" onClick={onReset}>
              <RotateCcw className="w-4 h-4 mr-2" />
              New Search
            </Button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!allDone && (
        <div className="w-full bg-muted rounded-full h-1.5 mb-6">
          <motion.div
            className="bg-primary h-1.5 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${((completedAgents.length + failedAgents.length) / agentList.length) * 100}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      )}

      {/* Error summary */}
      {failedAgents.length > 0 && allDone && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive font-medium">
            {failedAgents.length} restaurant{failedAgents.length > 1 ? 's' : ''} could not be analyzed:
          </p>
          <ul className="mt-1 space-y-0.5">
            {failedAgents.map(a => (
              <li key={a.id} className="text-xs text-destructive/80">
                {a.restaurantName}: {a.error}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Card grid: completed cards + loading cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Completed result cards, ranked */}
        {ranked.map((agent, index) => (
          <RestaurantResultCard
            key={agent.id}
            result={agent.result!}
            searchParams={searchParams}
            rank={index + 1}
            index={index}
            onClick={() => setSelectedAgentId(agent.id)}
          />
        ))}

        {/* Failed agent cards (compact) */}
        {failedAgents.map((agent) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4">
              <h3 className="text-sm font-semibold text-foreground">{agent.restaurantName}</h3>
              <p className="text-xs text-destructive mt-1">{agent.error}</p>
            </div>
          </motion.div>
        ))}

        {/* Still-loading agent cards */}
        {activeAgents.map((agent) => (
          <AgentLoadingCard
            key={agent.id}
            agent={agent}
            onExpandPreview={(url, name) => setExpandedPreview({ url, name })}
          />
        ))}
      </div>

      {allDone && ranked.length === 0 && failedAgents.length > 0 && (
        <div className="text-center py-12">
          <p className="text-lg text-muted-foreground">
            No results could be retrieved. Please try again.
          </p>
          <Button className="mt-4" onClick={onReset}>Try Again</Button>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground/50 text-center mt-8">
        Safety scores are estimates based on publicly available data. Always inform restaurant staff of your allergens directly.
      </p>

      {/* Detail side panel */}
      <AnimatePresence>
        {selectedResult && (
          <ResultDetailPanel
            result={selectedResult}
            searchParams={searchParams}
            onClose={() => setSelectedAgentId(null)}
          />
        )}
      </AnimatePresence>

      {/* Expanded live browser preview */}
      <AnimatePresence>
        {expandedPreview && (
          <LiveBrowserPreview
            streamingUrl={expandedPreview.url}
            restaurantName={expandedPreview.name}
            onClose={() => setExpandedPreview(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
