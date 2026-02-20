"use client";

import { useState, useCallback } from "react";
import type { Competitor, ResearchEvent } from "@/lib/types";
import { CompetitorPanel } from "@/components/competitor-panel";
import { QueryInput } from "@/components/query-input";
import { EventLog } from "@/components/event-log";
import { ReportView } from "@/components/report-view";
import { CliPreview } from "@/components/cli-preview";
import { Radar, Terminal, Github } from "lucide-react";

export default function Home() {
  console.log("[v0] Home page rendering");
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [events, setEvents] = useState<ResearchEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [report, setReport] = useState("");
  const [summaries, setSummaries] = useState<ResearchEvent[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [showCliPreview, setShowCliPreview] = useState(false);

  const addCompetitor = useCallback((competitor: Competitor) => {
    setCompetitors((prev) => [...prev, competitor]);
  }, []);

  const removeCompetitor = useCallback((id: string) => {
    setCompetitors((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleResearch = useCallback(
    async (question: string) => {
      if (competitors.length === 0) return;

      setIsLoading(true);
      setEvents([]);
      setReport("");
      setSummaries([]);
      setCurrentQuestion(question);

      try {
        const response = await fetch("/api/research", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ competitors, question }),
        });

        if (!response.ok) {
          const err = await response.text();
          setEvents([{ type: "error", message: `Request failed: ${err}` }]);
          setIsLoading(false);
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) return;

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const event: ResearchEvent = JSON.parse(line.slice(6));
                if (event.type === "summary") {
                  setSummaries((prev) => [...prev, event]);
                } else if (event.type === "done") {
                  setReport(event.message);
                }
                setEvents((prev) => [...prev, event]);
              } catch {
                // skip malformed events
              }
            }
          }
        }
      } catch (err) {
        setEvents([
          {
            type: "error",
            message: `Network error: ${err instanceof Error ? err.message : "Unknown"}`,
          },
        ]);
      }

      setIsLoading(false);
    },
    [competitors]
  );

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border/40 px-6 py-4">
        <div className="flex items-center gap-3">
          <Radar className="h-5 w-5 text-emerald-400" />
          <h1 className="font-mono text-base font-semibold text-foreground tracking-tight">
            competitor-scout
          </h1>
          <span className="rounded-sm bg-emerald-400/10 px-1.5 py-0.5 font-mono text-[10px] text-emerald-400 border border-emerald-400/20">
            v1.0
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setShowCliPreview(!showCliPreview)}
            className="flex items-center gap-1.5 rounded-md border border-border/50 px-3 py-1.5 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
          >
            <Terminal className="h-3.5 w-3.5" />
            {showCliPreview ? "hide cli" : "show cli"}
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <Github className="h-4 w-4" />
            <span className="sr-only">GitHub</span>
          </a>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-8">
        {/* Hero text */}
        <div className="flex flex-col gap-2">
          <p className="font-mono text-sm text-muted-foreground leading-relaxed max-w-2xl text-pretty">
            Set up your competitors below, then ask a question about their
            features. AI agents will visit each site and compile a comparison
            report.
          </p>
        </div>

        {/* Two column layout: competitors + query */}
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Left: Competitor panel */}
          <div className="w-full lg:w-72 shrink-0">
            <CompetitorPanel
              competitors={competitors}
              onAdd={addCompetitor}
              onRemove={removeCompetitor}
            />
          </div>

          {/* Right: Query + Results */}
          <div className="flex flex-1 flex-col gap-6 min-w-0">
            <QueryInput
              onSubmit={handleResearch}
              disabled={competitors.length === 0 || isLoading}
              isLoading={isLoading}
            />

            {competitors.length === 0 && (
              <div className="flex items-center gap-2 rounded-md border border-border/30 bg-secondary/10 px-4 py-3">
                <span className="font-mono text-xs text-muted-foreground">
                  Add at least one competitor to get started.
                </span>
              </div>
            )}

            {/* CLI Preview */}
            {showCliPreview && (
              <CliPreview
                competitors={competitors}
                question={currentQuestion}
                events={events}
              />
            )}

            {/* Event Log */}
            <EventLog events={events} />

            {/* Results */}
            {(report || summaries.length > 0) && (
              <ReportView report={report} summaries={summaries} />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/20 px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="font-mono text-[10px] text-muted-foreground/60">
            powered by tinyfish + openai
          </span>
          <span className="font-mono text-[10px] text-muted-foreground/60">
            competitor-scout
          </span>
        </div>
      </footer>
    </div>
  );
}
