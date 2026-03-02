'use client';

import { useState } from 'react';
import { PipelineProgress } from './PipelineProgress';
import { AnalysisSummary } from './AnalysisSummary';
import { ReferenceGrid } from './ReferenceGrid';
import { LiveBrowserPreview } from './LiveBrowserPreview';
import { StopCircle } from 'lucide-react';
import type { AppState } from '@/lib/types';

interface DashboardProps {
  state: AppState;
  onCancel: () => void;
}

export function Dashboard({ state, onCancel }: DashboardProps) {
  const [preview, setPreview] = useState<{
    url: string;
    title: string;
  } | null>(null);

  const isRunning =
    state.phase === 'analyzing' ||
    state.phase === 'searching' ||
    state.phase === 'extracting';

  const completedCount = Object.values(state.agents).filter(
    (a) => a.status === 'complete'
  ).length;
  const totalCount = Object.values(state.agents).length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Progress bar */}
      <PipelineProgress currentPhase={state.phase} />

      {/* Analysis summary */}
      {state.analysis && <AnalysisSummary analysis={state.analysis} />}

      {/* Status bar */}
      <div className="flex items-center justify-between px-6 py-2 border-b border-zinc-800">
        <div className="flex items-center gap-4">
          {state.searchResults.length > 0 && (
            <span className="text-xs text-zinc-500">
              {state.searchResults.length} sources found
            </span>
          )}
          {totalCount > 0 && (
            <span className="text-xs text-zinc-500">
              {completedCount}/{totalCount} agents done
            </span>
          )}
        </div>
        {isRunning && (
          <button
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1 text-xs text-red-400 hover:text-red-300 hover:bg-red-950/30 rounded transition-colors"
          >
            <StopCircle className="w-3.5 h-3.5" />
            Cancel
          </button>
        )}
      </div>

      {/* Reference grid */}
      <div className="flex-1 overflow-y-auto">
        <ReferenceGrid
          agents={state.agents}
          onPreviewClick={(url, title) => setPreview({ url, title })}
        />
      </div>

      {/* Live browser preview overlay */}
      {preview && (
        <LiveBrowserPreview
          streamingUrl={preview.url}
          title={preview.title}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}
