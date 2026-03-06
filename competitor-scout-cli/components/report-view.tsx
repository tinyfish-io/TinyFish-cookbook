"use client";

import React from "react"

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, FileCode2 } from "lucide-react";
import type { ResearchEvent } from "@/lib/types";

interface ReportViewProps {
  report: string;
  summaries: ResearchEvent[];
}

function MarkdownBlock({ content }: { content: string }) {
  // Simple markdown renderer for reports
  const lines = content.split("\n");

  return (
    <div className="flex flex-col gap-1 font-mono text-sm leading-relaxed">
      {lines.map((line, i) => {
        const isSeparatorOnly = /^[\s\-|:]+$/.test(line.trim());
        if (isSeparatorOnly) return null;
        if (line.startsWith("# ")) {
          return (
            <h1
              key={i}
              className="text-lg font-bold text-foreground mt-4 mb-1"
            >
              {line.slice(2)}
            </h1>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h2
              key={i}
              className="text-base font-bold text-foreground mt-3 mb-1"
            >
              {line.slice(3)}
            </h2>
          );
        }
        if (line.startsWith("### ")) {
          return (
            <h3
              key={i}
              className="text-sm font-bold text-emerald-400 mt-2 mb-0.5"
            >
              {line.slice(4)}
            </h3>
          );
        }
        if (line.startsWith("| ")) {
          const cells = line
            .split("|")
            .filter((c) => c.trim())
            .map((c) => c.trim());
          const isHeader =
            i + 1 < lines.length && lines[i + 1]?.match(/^\|[\s-|]+$/);
          const isSeparator = line.match(/^\|[\s-|]+$/);

          if (isSeparator) return null;

          return (
            <div
              key={i}
              className={cn(
                "flex gap-0 border-b border-border/30",
                isHeader && "border-b-emerald-400/30"
              )}
            >
              {cells.map((cell, j) => (
                <span
                  key={j}
                  className={cn(
                    "flex-1 py-1 px-2 text-xs",
                    isHeader
                      ? "text-foreground font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  {renderInlineMarkdown(cell)}
                </span>
              ))}
            </div>
          );
        }
        if (line.startsWith("- ") || line.startsWith("* ")) {
          return (
            <div key={i} className="flex items-start gap-2 pl-2 text-muted-foreground">
              <span className="text-emerald-400/60 mt-0.5">-</span>
              <span>{renderInlineMarkdown(line.slice(2))}</span>
            </div>
          );
        }
        if (line.trim() === "") {
          return <div key={i} className="h-1" />;
        }
        return (
          <p key={i} className="text-muted-foreground">
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}

function renderInlineMarkdown(text: string): React.ReactNode {
  // Handle **bold** text
  const parts = text.split(/(\*\*[^*]+\*\*)/);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <span key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
}

type SourceLink = { url: string; title?: string };

function extractSources(raw: unknown): SourceLink[] {
  const seen = new Map<string, string | undefined>();
  const visited = new Set<unknown>();
  const sourceKeys = new Set([
    "sources",
    "source_urls",
    "sourceUrls",
    "source_links",
    "sourceLinks",
  ]);

  function addSource(url: string, title?: string) {
    const cleaned = url.replace(/[.,]$/, "");
    if (!seen.has(cleaned)) {
      seen.set(cleaned, title);
      return;
    }
    if (!seen.get(cleaned) && title) {
      seen.set(cleaned, title);
    }
  }

  function parseList(list: unknown[]) {
    for (const item of list) {
      if (typeof item === "string") {
        addSource(item);
        continue;
      }
      if (item && typeof item === "object") {
        const obj = item as Record<string, unknown>;
        const url =
          typeof obj.url === "string"
            ? obj.url
            : typeof obj.source_url === "string"
              ? obj.source_url
              : undefined;
        const title =
          typeof obj.title === "string"
            ? obj.title
            : typeof obj.name === "string"
              ? obj.name
              : typeof obj.feature_detail === "string"
                ? obj.feature_detail
                : typeof obj.featureDetail === "string"
                  ? obj.featureDetail
                  : undefined;
        if (url) addSource(url, title);
      }
    }
  }

  function walk(value: unknown, depth: number) {
    if (depth > 6) return;
    if (!value || typeof value === "boolean" || typeof value === "number") return;
    if (visited.has(value)) return;

    if (Array.isArray(value)) {
      visited.add(value);
      value.forEach((item) => walk(item, depth + 1));
      return;
    }

    if (typeof value === "object") {
      visited.add(value);
      const record = value as Record<string, unknown>;
      Object.entries(record).forEach(([key, val]) => {
        if (sourceKeys.has(key) && Array.isArray(val)) {
          parseList(val);
        } else {
          walk(val, depth + 1);
        }
      });
    }
  }

  walk(raw, 0);

  return Array.from(seen.entries()).map(([url, title]) => ({
    url,
    title,
  }));
}

function formatSourceLabel(url: string) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");
    const path = parsed.pathname && parsed.pathname !== "/" ? parsed.pathname : "";
    return `${host}${path}`;
  } catch {
    return url;
  }
}

function SourcesButton({ sources }: { sources: SourceLink[] }) {
  const [open, setOpen] = useState(false);

  if (sources.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-mono text-xs transition-colors self-start"
      >
        <span className="text-emerald-400/80">●</span>
        sources ({sources.length})
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-xl rounded-md border border-border/40 bg-background p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-sm text-foreground">
                source links
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground font-mono text-xs"
              >
                close
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto text-xs font-mono">
              {sources.map((source, i) => (
                <div key={`${source.url}-${i}`} className="py-1">
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 hover:underline break-all"
                    title={source.url}
                  >
                    {source.title?.trim()
                      ? source.title
                      : formatSourceLabel(source.url)}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function RawJsonViewer({ data }: { data: unknown }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="flex flex-col gap-1 mt-2">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground font-mono text-xs transition-colors self-start"
      >
        <FileCode2 className="h-3 w-3" />
        {expanded ? (
          <ChevronDown className="h-3 w-3" />
        ) : (
          <ChevronRight className="h-3 w-3" />
        )}
        raw json
      </button>
      {expanded && (
        <pre className="rounded-md bg-secondary/30 border border-border/30 p-3 text-xs text-muted-foreground overflow-x-auto max-h-48 overflow-y-auto font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function ReportView({ report, summaries }: ReportViewProps) {
  return (
    <div className="flex flex-col gap-6">
      {/* Per-competitor summaries */}
      {summaries.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xs">
              per-competitor findings
            </span>
            <div className="flex-1 h-px bg-border/40" />
          </div>
          {summaries.map((s, i) => (
            <div
              key={i}
              className="flex flex-col gap-2 rounded-md border border-border/30 bg-secondary/10 p-4"
            >
              <span className="font-mono text-sm font-semibold text-emerald-400">
                {s.competitor}
              </span>
              <MarkdownBlock content={s.message} />
              {Boolean(s.data) && (
                <SourcesButton
                  sources={extractSources((s.data as { rawResult: unknown }).rawResult)}
                />
              )}
              {Boolean(s.data) && (
                <RawJsonViewer
                  data={(s.data as { rawResult: unknown }).rawResult}
                />
              )}
            </div>
          ))}
        </div>
      )}

      {/* Comparison report */}
      {report && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <span className="text-emerald-400 font-mono text-xs">
              comparison report
            </span>
            <div className="flex-1 h-px bg-border/40" />
          </div>
          <div className="rounded-md border border-emerald-400/20 bg-secondary/10 p-5">
            <MarkdownBlock content={report} />
          </div>
        </div>
      )}
    </div>
  );
}
