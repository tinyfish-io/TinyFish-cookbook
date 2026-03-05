import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';
import { useConceptDiscovery } from '@/hooks/useConceptDiscovery';
import { ConceptCard } from './ConceptCard';
import { ConceptCardLoading } from './ConceptCardLoading';
import { DetailPanel } from './DetailPanel';
import { AnalysisPanel } from './AnalysisPanel';
import type { ConceptAgentState, AppPhase, ConceptData } from '@/types';

function MemoizedAnalysis({ userInput, completed }: { userInput: string; completed: ConceptAgentState[] }) {
  const projects = useMemo(
    () => completed.map((a) => a.result!),
    [completed.length] // eslint-disable-line react-hooks/exhaustive-deps
  );
  return <AnalysisPanel userInput={userInput} projects={projects} />;
}

interface ResultsGridProps {
  agents: Record<string, ConceptAgentState>;
  phase: AppPhase;
  userInput: string;
}

export function ResultsGrid({ agents, phase, userInput }: ResultsGridProps) {
  const { reset } = useConceptDiscovery();
  const [selectedConcept, setSelectedConcept] = useState<ConceptData | null>(null);

  // Derive arrays from agents (exclude failed agents)
  const agentArray = Object.values(agents);

  // Only count completed agents with VALID data (must have platform and projectName)
  const completedWithValidData = agentArray.filter(
    (a) => a.status === 'complete' &&
           a.result &&
           a.result.platform &&
           a.result.projectName
  );

  // Deduplicate by project name + platform (keep first occurrence)
  const seenProjects = new Set<string>();
  const completed = completedWithValidData.filter((agent) => {
    const key = `${agent.result!.platform}:${agent.result!.projectName.toLowerCase()}`;
    if (seenProjects.has(key)) {
      return false; // Skip duplicate
    }
    seenProjects.add(key);
    return true;
  });

  const loading = agentArray.filter(
    (a) => a.status !== 'complete' && a.status !== 'error'
  );
  const failed = agentArray.filter((a) => a.status === 'error');

  // Only count non-failed agents in progress
  const activeAgents = completed.length + loading.length;
  const totalAgents = activeAgents + failed.length;
  const progress = totalAgents > 0 ? (completed.length / totalAgents) * 100 : 0;
  const allDone = phase === 'complete';

  return (
    <>
      <div className="space-y-6">
        {/* Header with progress */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">
              Discovered Projects
              <span className="text-muted-foreground ml-2">
                ({completed.length} found)
              </span>
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Searching for: "{userInput}"
            </p>
          </div>

          {allDone && (
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg hover:bg-card/80 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              New Search
            </button>
          )}
        </div>

        {/* Progress bar */}
        {!allDone && totalAgents > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                Progress: {completed.length} / {activeAgents} agents completed
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {/* Completed cards */}
            {completed.map((agent, index) => (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
              >
                <ConceptCard
                  data={agent.result!}
                  onClick={() => setSelectedConcept(agent.result!)}
                />
              </motion.div>
            ))}

            {/* Loading cards */}
            {loading.map((agent) => (
              <motion.div
                key={agent.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.3 }}
              >
                <ConceptCardLoading agent={agent} />
              </motion.div>
            ))}

            {/* Failed cards are hidden (not displayed) */}
          </AnimatePresence>
        </div>

        {/* Empty state */}
        {totalAgents === 0 && phase !== 'complete' && (
          <div className="text-center py-12">
            <div className="h-16 w-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">
              Initializing discovery agents...
            </p>
          </div>
        )}

        {/* AI Analysis - shown after all agents complete */}
        {allDone && completed.length > 0 && (
          <MemoizedAnalysis userInput={userInput} completed={completed} />
        )}
      </div>

      {/* Detail Panel */}
      {selectedConcept && (
        <DetailPanel
          data={selectedConcept}
          onClose={() => setSelectedConcept(null)}
        />
      )}
    </>
  );
}
