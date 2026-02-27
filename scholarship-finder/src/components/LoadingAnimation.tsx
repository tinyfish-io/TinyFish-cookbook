import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Monitor, Maximize2, X, CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Scholarship } from "@/types/scholarship";
import { ScholarshipCard } from "./ScholarshipCard";

interface ScholarshipUrl {
  name: string;
  url: string;
  description: string;
}

interface AgentStatus {
  agentId: string;
  siteName: string;
  siteUrl?: string;
  description?: string;
  status: "pending" | "running" | "complete" | "error";
  message?: string;
  streamingUrl?: string;
  scholarships?: Scholarship[];
  error?: string;
}

interface SearchState {
  step: number;
  stepMessage: string;
  urls: ScholarshipUrl[];
  agents: Record<string, AgentStatus>;
  completedScholarships: Scholarship[];
}

interface LoadingAnimationProps {
  searchState: SearchState;
}

export function LoadingAnimation({ searchState }: LoadingAnimationProps) {
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const agents = Object.values(searchState.agents);
  const runningAgents = agents.filter(a => a.status === "running" || a.status === "pending");
  const completedAgents = agents.filter(a => a.status === "complete");
  const errorAgents = agents.filter(a => a.status === "error");

  return (
    <div className="space-y-8">
      {/* Header with step info */}
      <div className="text-center space-y-4">
        <div className="relative inline-block">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <GraduationCap className="w-8 h-8 text-primary animate-pulse" />
          </div>
          <div 
            className="absolute inset-0 w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" 
            style={{ animationDuration: '2s' }} 
          />
        </div>

        <div>
          <p className="text-lg font-semibold text-foreground">
            {searchState.step === 1 ? "Step 1: Finding Sources" : "Step 2: Searching Websites"}
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={searchState.stepMessage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-sm text-muted-foreground"
            >
              {searchState.stepMessage}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Progress summary */}
        {agents.length > 0 && (
          <div className="flex items-center justify-center gap-4 text-sm">
            <span className="flex items-center gap-1 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              {runningAgents.length} running
            </span>
            <span className="flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" />
              {completedAgents.length} done
            </span>
            {errorAgents.length > 0 && (
              <span className="flex items-center gap-1 text-red-500">
                <AlertCircle className="w-4 h-4" />
                {errorAgents.length} failed
              </span>
            )}
          </div>
        )}
      </div>

      {/* Live Browser Previews Grid */}
      {agents.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent) => (
            <AgentCard 
              key={agent.agentId} 
              agent={agent} 
              isExpanded={expandedAgent === agent.agentId}
              onExpand={() => setExpandedAgent(expandedAgent === agent.agentId ? null : agent.agentId)}
            />
          ))}
        </div>
      )}

      {/* Expanded Preview Modal */}
      <AnimatePresence>
        {expandedAgent && searchState.agents[expandedAgent]?.streamingUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={() => setExpandedAgent(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="bg-card rounded-xl overflow-hidden max-w-4xl w-full max-h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-muted border-b border-border">
                <div className="flex items-center gap-2">
                  <Monitor className="w-4 h-4 text-primary" />
                  <span className="font-medium">{searchState.agents[expandedAgent]?.siteName}</span>
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-500 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                  </span>
                </div>
                <button onClick={() => setExpandedAgent(null)} className="p-1.5 hover:bg-primary/10 rounded-md">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <iframe
                src={searchState.agents[expandedAgent]?.streamingUrl}
                className="w-full h-[60vh] border-0"
                title="Live browser preview"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Real-time Results as they come in */}
      {searchState.completedScholarships.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h3 className="text-lg font-semibold">
              Found {searchState.completedScholarships.length} Scholarships
            </h3>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <AnimatePresence>
              {searchState.completedScholarships.map((scholarship, index) => (
                <motion.div
                  key={scholarship.id || index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <ScholarshipCard scholarship={scholarship} index={index} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Powered by */}
      <p className="text-center text-sm text-muted-foreground">
        powered by <span className="font-semibold text-primary">mino.ai</span>
      </p>
    </div>
  );
}

// Individual Agent Card Component
function AgentCard({ 
  agent, 
  isExpanded, 
  onExpand 
}: { 
  agent: AgentStatus; 
  isExpanded: boolean; 
  onExpand: () => void;
}) {
  const statusColors = {
    pending: "border-muted-foreground/30",
    running: "border-primary",
    complete: "border-green-500",
    error: "border-red-500",
  };

  const statusIcons = {
    pending: <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />,
    running: <Loader2 className="w-4 h-4 animate-spin text-primary" />,
    complete: <CheckCircle className="w-4 h-4 text-green-500" />,
    error: <AlertCircle className="w-4 h-4 text-red-500" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        "bg-card border-2 rounded-lg overflow-hidden transition-colors",
        statusColors[agent.status]
      )}
    >
      {/* Header */}
      <div className="px-3 py-2 bg-muted/50 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          {statusIcons[agent.status]}
          <span className="text-sm font-medium truncate">{agent.siteName}</span>
        </div>
        {agent.streamingUrl && agent.status === "running" && (
          <button 
            onClick={onExpand}
            className="p-1 hover:bg-primary/10 rounded transition-colors"
            title="Expand preview"
          >
            <Maximize2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="relative">
        {/* Mini Preview */}
        {agent.streamingUrl && agent.status === "running" ? (
          <div className="h-32 bg-white relative">
            <iframe
              src={agent.streamingUrl}
              className="w-full h-full border-0 pointer-events-none"
              title={`Preview of ${agent.siteName}`}
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-2">
              <p className="text-xs text-white truncate">{agent.message}</p>
            </div>
          </div>
        ) : (
          <div className="h-32 bg-muted/30 flex flex-col items-center justify-center p-3">
            {agent.status === "pending" && (
              <>
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground text-center">Waiting to start...</p>
              </>
            )}
            {agent.status === "complete" && (
              <>
                <CheckCircle className="w-6 h-6 text-green-500 mb-2" />
                <p className="text-xs text-center text-muted-foreground">
                  Found {agent.scholarships?.length || 0} scholarships
                </p>
              </>
            )}
            {agent.status === "error" && (
              <>
                <AlertCircle className="w-6 h-6 text-red-500 mb-2" />
                <p className="text-xs text-center text-red-500 truncate max-w-full">
                  {agent.error || "Failed"}
                </p>
              </>
            )}
          </div>
        )}
      </div>

      {/* Footer with link */}
      {agent.siteUrl && (
        <div className="px-3 py-2 bg-muted/30 border-t border-border">
          <a 
            href={agent.siteUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{agent.siteUrl}</span>
          </a>
        </div>
      )}
    </motion.div>
  );
}
