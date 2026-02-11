'use client';

import { Code2, Package, Puzzle, Workflow } from 'lucide-react';
import type { CodeAnalysis } from '@/lib/types';

interface AnalysisSummaryProps {
  analysis: CodeAnalysis;
}

export function AnalysisSummary({ analysis }: AnalysisSummaryProps) {
  return (
    <div className="px-6 py-4 bg-zinc-900/30 border-b border-zinc-800">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Code2 className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs text-zinc-400">Language:</span>
          <span className="text-xs font-medium text-zinc-200 bg-zinc-800 px-2 py-0.5 rounded">
            {analysis.language}
          </span>
        </div>

        {analysis.libraries.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-green-400" />
            <span className="text-xs text-zinc-400">Libraries:</span>
            <div className="flex flex-wrap gap-1">
              {analysis.libraries.map((lib) => (
                <span
                  key={lib}
                  className="text-xs text-green-300 bg-green-900/30 px-2 py-0.5 rounded"
                >
                  {lib}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.apis.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Puzzle className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-xs text-zinc-400">APIs:</span>
            <div className="flex flex-wrap gap-1">
              {analysis.apis.map((api) => (
                <span
                  key={api}
                  className="text-xs text-purple-300 bg-purple-900/30 px-2 py-0.5 rounded"
                >
                  {api}
                </span>
              ))}
            </div>
          </div>
        )}

        {analysis.patterns.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Workflow className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs text-zinc-400">Patterns:</span>
            <div className="flex flex-wrap gap-1">
              {analysis.patterns.map((p) => (
                <span
                  key={p}
                  className="text-xs text-amber-300 bg-amber-900/30 px-2 py-0.5 rounded"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
