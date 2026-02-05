"use client";

import { cn } from "@/lib/utils";
import type { GenerationPhase } from "@/types";
import { Check, Loader2 } from "lucide-react";

interface PhaseIndicatorProps {
  phase: GenerationPhase;
}

const phases: { key: GenerationPhase; label: string }[] = [
  { key: "identifying", label: "Finding Sources" },
  { key: "scraping", label: "Scraping Content" },
  { key: "synthesizing", label: "Generating Guide" },
];

export function PhaseIndicator({ phase }: PhaseIndicatorProps) {
  if (phase === "idle" || phase === "error") return null;

  const currentIndex = phases.findIndex((p) => p.key === phase);
  const isComplete = phase === "complete";

  return (
    <div className="flex items-center justify-center gap-2">
      {phases.map((p, index) => {
        const isPast = isComplete || index < currentIndex;
        const isCurrent = !isComplete && index === currentIndex;
        const isFuture = !isComplete && index > currentIndex;

        return (
          <div key={p.key} className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium transition-colors",
                  isPast && "bg-green-500/20 text-green-500",
                  isCurrent && "bg-primary/20 text-primary",
                  isFuture && "bg-secondary text-muted-foreground"
                )}
              >
                {isPast ? (
                  <Check className="h-3.5 w-3.5" />
                ) : isCurrent ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium",
                  isPast && "text-green-500",
                  isCurrent && "text-foreground",
                  isFuture && "text-muted-foreground"
                )}
              >
                {p.label}
              </span>
            </div>

            {index < phases.length - 1 && (
              <div
                className={cn(
                  "h-px w-8 transition-colors",
                  isPast ? "bg-green-500/50" : "bg-border"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
