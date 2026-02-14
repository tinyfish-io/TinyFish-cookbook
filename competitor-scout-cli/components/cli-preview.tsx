"use client";

import type { Competitor, ResearchEvent } from "@/lib/types";
import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface CliPreviewProps {
  competitors: Competitor[];
  question: string;
  events: ResearchEvent[];
}

export function CliPreview({ competitors, question, events }: CliPreviewProps) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [events]);

  const commands = [
    "# Install the CLI tool",
    "npx competitor-scout init",
    "",
    "# Add competitors",
    ...competitors.map(
      (c) => `npx competitor-scout add --name "${c.name}" --url "${c.url}"`
    ),
    "",
    "# Run a research query",
    `npx competitor-scout research "${question || "What sign-in methods do my competitors support?"}"`,
  ];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs">
          cli equivalent
        </span>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      <div className="rounded-md border border-border/30 bg-secondary/20 p-4 font-mono text-xs leading-relaxed">
        {commands.map((line, i) => (
          <div
            key={i}
            className={cn(
              line.startsWith("#")
                ? "text-muted-foreground/60"
                : line === ""
                  ? "h-3"
                  : "text-foreground"
            )}
          >
            {line.startsWith("#") ? line : line !== "" && (
              <>
                <span className="text-emerald-400">$ </span>
                {line}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-muted-foreground font-mono text-xs">
          cli log
        </span>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      <div
        ref={logRef}
        className="rounded-md border border-border/30 bg-secondary/20 p-4 font-mono text-xs leading-relaxed max-h-56 overflow-y-auto"
      >
        {events.length === 0 ? (
          <span className="text-muted-foreground/60">
            No CLI output yet. Run a query to see the full log.
          </span>
        ) : (
          events.map((event, i) => (
            <div key={`${event.type}-${i}`} className="text-foreground">
              <span className="text-emerald-400">$ </span>
              {event.competitor ? `[${event.competitor}] ` : ""}
              {event.message}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
