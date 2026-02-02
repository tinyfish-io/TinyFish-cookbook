"use client";

import { cn } from "@/lib/utils";
import type { ScrapeProgress, SourceType } from "@/types";
import { SOURCE_CONFIG } from "@/types";
import {
  FileText,
  Github,
  MessageSquare,
  BookOpen,
  Loader2,
  Check,
  X,
  Clock,
  ExternalLink,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const icons: Record<SourceType, React.ReactNode> = {
  docs: <FileText className="h-4 w-4" />,
  github: <Github className="h-4 w-4" />,
  stackoverflow: <MessageSquare className="h-4 w-4" />,
  blog: <BookOpen className="h-4 w-4" />,
};

const colorClasses: Record<SourceType, string> = {
  docs: "text-chart-1",
  github: "text-chart-2",
  stackoverflow: "text-chart-3",
  blog: "text-chart-4",
};

const bgClasses: Record<SourceType, string> = {
  docs: "bg-chart-1/10",
  github: "bg-chart-2/10",
  stackoverflow: "bg-chart-3/10",
  blog: "bg-chart-4/10",
};

interface SourceProgressProps {
  progress: ScrapeProgress[];
}

export function SourceProgress({ progress }: SourceProgressProps) {
  if (progress.length === 0) return null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {progress.map((item) => (
        <SourceProgressCard key={item.source.url} progress={item} />
      ))}
    </div>
  );
}

function SourceProgressCard({ progress }: { progress: ScrapeProgress }) {
  const { source, status, steps, wordCount, error, streamingUrl } = progress;
  const type = source.type;
  const config = SOURCE_CONFIG[type];

  const StatusIcon = () => {
    switch (status) {
      case "pending":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "scraping":
        return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
      case "complete":
        return <Check className="h-4 w-4 text-green-500" />;
      case "error":
        return <X className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-all",
        status === "scraping" && "border-primary/30",
        status === "complete" && "border-green-500/30",
        status === "error" && "border-destructive/30"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className={cn("rounded-md p-1.5", bgClasses[type])}>
            <span className={colorClasses[type]}>{icons[type]}</span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium">
                {source.title}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {config.label}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {streamingUrl && status === "scraping" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <a
                  href={streamingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </TooltipTrigger>
              <TooltipContent>Watch live</TooltipContent>
            </Tooltip>
          )}
          <StatusIcon />
        </div>
      </div>

      {/* Progress details */}
      {status === "scraping" && steps.length > 0 && (
        <div className="mt-2">
          <p className="truncate text-xs text-muted-foreground">
            {steps[steps.length - 1]}
          </p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            {steps.length} step{steps.length !== 1 ? "s" : ""} completed
          </p>
        </div>
      )}

      {status === "complete" && wordCount && (
        <div className="mt-2">
          <p className="text-xs text-green-500/80">
            Extracted {wordCount.toLocaleString()} words
          </p>
        </div>
      )}

      {status === "error" && error && (
        <div className="mt-2">
          <p className="truncate text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
