"use client";

import { cn } from "@/lib/utils";
import type { SourceType } from "@/types";
import { SOURCE_CONFIG } from "@/types";
import {
  FileText,
  Github,
  MessageSquare,
  BookOpen,
} from "lucide-react";

const icons: Record<SourceType, React.ReactNode> = {
  docs: <FileText className="h-3.5 w-3.5" />,
  github: <Github className="h-3.5 w-3.5" />,
  stackoverflow: <MessageSquare className="h-3.5 w-3.5" />,
  blog: <BookOpen className="h-3.5 w-3.5" />,
};

const colorClasses: Record<SourceType, { active: string; inactive: string }> = {
  docs: {
    active: "bg-chart-1/20 text-chart-1 border-chart-1/30",
    inactive:
      "bg-transparent text-muted-foreground border-border hover:border-chart-1/30 hover:text-chart-1",
  },
  github: {
    active: "bg-chart-2/20 text-chart-2 border-chart-2/30",
    inactive:
      "bg-transparent text-muted-foreground border-border hover:border-chart-2/30 hover:text-chart-2",
  },
  stackoverflow: {
    active: "bg-chart-3/20 text-chart-3 border-chart-3/30",
    inactive:
      "bg-transparent text-muted-foreground border-border hover:border-chart-3/30 hover:text-chart-3",
  },
  blog: {
    active: "bg-chart-4/20 text-chart-4 border-chart-4/30",
    inactive:
      "bg-transparent text-muted-foreground border-border hover:border-chart-4/30 hover:text-chart-4",
  },
};

interface SourceTogglesProps {
  enabledSources: SourceType[];
  onToggle: (source: SourceType) => void;
  disabled?: boolean;
}

export function SourceToggles({
  enabledSources,
  onToggle,
  disabled = false,
}: SourceTogglesProps) {
  const sources: SourceType[] = ["docs", "github", "stackoverflow", "blog"];

  return (
    <div className="flex flex-wrap gap-2">
      {sources.map((source) => {
        const isEnabled = enabledSources.includes(source);
        const config = SOURCE_CONFIG[source];
        const colors = colorClasses[source];

        return (
          <button
            key={source}
            onClick={() => onToggle(source)}
            disabled={disabled}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
              isEnabled ? colors.active : colors.inactive,
              disabled && "cursor-not-allowed opacity-50"
            )}
          >
            {icons[source]}
            <span>{config.label}</span>
          </button>
        );
      })}
    </div>
  );
}
