'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Github, MessageCircle, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { MiniPreview } from './LiveBrowserPreview';
import type { ReferenceAgentState } from '@/lib/types';

interface AgentCardProps {
  agent: ReferenceAgentState;
  onPreviewClick: (streamingUrl: string, title: string) => void;
}

export function AgentCard({ agent, onPreviewClick }: AgentCardProps) {
  const [showSteps, setShowSteps] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (agent.status === 'complete' || agent.status === 'error') return;
    if (!agent.startedAt) return;

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - agent.startedAt!) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [agent.status, agent.startedAt]);

  const isGitHub = agent.platform === 'github';
  const statusColor =
    agent.status === 'error'
      ? 'text-red-400'
      : agent.status === 'complete'
      ? 'text-green-400'
      : 'text-blue-400';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 min-h-[160px]"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {isGitHub ? (
            <Github className="w-4 h-4 text-zinc-400 shrink-0" />
          ) : (
            <MessageCircle className="w-4 h-4 text-orange-400 shrink-0" />
          )}
          <span className="text-sm font-medium text-zinc-200 truncate">
            {agent.url.replace('https://', '')}
          </span>
        </div>
        <div className={`flex items-center gap-1 ${statusColor}`}>
          {agent.status !== 'complete' && agent.status !== 'error' && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          )}
          {agent.status === 'error' && <AlertCircle className="w-3.5 h-3.5" />}
          <span className="text-xs capitalize">{agent.status}</span>
        </div>
      </div>

      {/* Current step */}
      <p className="text-xs text-zinc-400 mb-2 truncate">
        {agent.currentStep}
      </p>

      {/* Elapsed time */}
      {agent.startedAt && (
        <p className="text-[10px] text-zinc-600 mb-2">
          {agent.completedAt
            ? `Completed in ${Math.floor((agent.completedAt - agent.startedAt) / 1000)}s`
            : `${elapsed}s elapsed`}
        </p>
      )}

      {/* Error message */}
      {agent.error && (
        <p className="text-xs text-red-400/80 bg-red-950/30 rounded px-2 py-1 mb-2">
          {agent.error}
        </p>
      )}

      {/* Mini preview */}
      {agent.streamingUrl && agent.status !== 'complete' && agent.status !== 'error' && (
        <MiniPreview
          streamingUrl={agent.streamingUrl}
          onClick={() => onPreviewClick(agent.streamingUrl!, agent.url)}
        />
      )}

      {/* Step history toggle */}
      {agent.steps.length > 0 && (
        <button
          onClick={() => setShowSteps(!showSteps)}
          className="flex items-center gap-1 mt-2 text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          {showSteps ? (
            <ChevronUp className="w-3 h-3" />
          ) : (
            <ChevronDown className="w-3 h-3" />
          )}
          {agent.steps.length} steps
        </button>
      )}

      {showSteps && (
        <div className="mt-1 max-h-32 overflow-y-auto space-y-0.5">
          {agent.steps.map((step, i) => (
            <p key={i} className="text-[10px] text-zinc-600 truncate">
              {step.message}
            </p>
          ))}
        </div>
      )}
    </motion.div>
  );
}
