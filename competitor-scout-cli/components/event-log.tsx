"use client";

import { useEffect, useRef } from "react";
import type { ResearchEvent } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Brain,
  Send,
  Clock,
  CheckCircle2,
  FileText,
  AlertCircle,
  Flag,
  Target,
} from "lucide-react";

function getEventIcon(type: ResearchEvent["type"]) {
  switch (type) {
    case "planning":
      return Brain;
    case "goals":
      return Target;
    case "submitting":
      return Send;
    case "polling":
      return Clock;
    case "result":
      return CheckCircle2;
    case "summarizing":
      return FileText;
    case "summary":
      return FileText;
    case "error":
      return AlertCircle;
    case "done":
      return Flag;
    default:
      return Clock;
  }
}

function getEventColor(type: ResearchEvent["type"]) {
  switch (type) {
    case "planning":
      return "text-sky-400";
    case "goals":
      return "text-sky-400";
    case "submitting":
      return "text-amber-400";
    case "polling":
      return "text-muted-foreground";
    case "result":
      return "text-emerald-400";
    case "summarizing":
      return "text-sky-400";
    case "summary":
      return "text-emerald-400";
    case "error":
      return "text-red-400";
    case "done":
      return "text-emerald-400";
    default:
      return "text-muted-foreground";
  }
}

interface EventLogProps {
  events: ResearchEvent[];
}

export function EventLog({ events }: EventLogProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  if (events.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground font-mono text-xs">
          agent log
        </span>
        <div className="flex-1 h-px bg-border/40" />
      </div>
      <div
        ref={scrollRef}
        className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1 scrollbar-thin"
      >
        {events.map((event, i) => {
          const Icon = getEventIcon(event.type);
          const color = getEventColor(event.type);

          // Skip verbose polling repeats
          if (
            event.type === "polling" &&
            i > 0 &&
            events[i - 1].type === "polling" &&
            events[i - 1].competitor === event.competitor
          ) {
            return null;
          }

          return (
            <div
              key={`${event.type}-${i}`}
              className={cn(
                "flex items-start gap-2 py-1 font-mono text-xs animate-in fade-in-0 slide-in-from-bottom-1 duration-200",
                event.type === "done" && "mt-1"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5", color)} />
              <span className="text-muted-foreground leading-relaxed">
                {event.competitor && (
                  <span className={cn("font-medium", color)}>
                    [{event.competitor}]{" "}
                  </span>
                )}
                {event.message.length > 120
                  ? `${event.message.slice(0, 120)}...`
                  : event.message}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
