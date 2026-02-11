'use client';

import { Check, Loader2 } from 'lucide-react';
import type { AppPhase } from '@/lib/types';

const STEPS: { phase: AppPhase; label: string }[] = [
  { phase: 'analyzing', label: 'Analyzing Code' },
  { phase: 'searching', label: 'Searching' },
  { phase: 'extracting', label: 'Extracting' },
];

const PHASE_ORDER: AppPhase[] = ['input', 'analyzing', 'searching', 'extracting', 'complete'];

interface PipelineProgressProps {
  currentPhase: AppPhase;
}

export function PipelineProgress({ currentPhase }: PipelineProgressProps) {
  const currentIndex = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="flex items-center gap-1 px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
      {STEPS.map((step, i) => {
        const stepIndex = PHASE_ORDER.indexOf(step.phase);
        const isActive = step.phase === currentPhase;
        const isDone = currentIndex > stepIndex;

        return (
          <div key={step.phase} className="flex items-center">
            {i > 0 && (
              <div
                className={`w-8 h-px mx-1 ${
                  isDone ? 'bg-blue-500' : 'bg-zinc-700'
                }`}
              />
            )}
            <div className="flex items-center gap-1.5">
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                  isDone
                    ? 'bg-blue-500 text-white'
                    : isActive
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500'
                    : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
                }`}
              >
                {isDone ? (
                  <Check className="w-3 h-3" />
                ) : isActive ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <span>{i + 1}</span>
                )}
              </div>
              <span
                className={`text-xs ${
                  isActive
                    ? 'text-blue-400 font-medium'
                    : isDone
                    ? 'text-zinc-300'
                    : 'text-zinc-500'
                }`}
              >
                {step.label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
