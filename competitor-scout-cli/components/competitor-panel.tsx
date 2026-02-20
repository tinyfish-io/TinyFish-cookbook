"use client";

import React from "react"

import { useState } from "react";
import type { Competitor } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Plus, X, Globe } from "lucide-react";

interface CompetitorPanelProps {
  competitors: Competitor[];
  onAdd: (competitor: Competitor) => void;
  onRemove: (id: string) => void;
}

export function CompetitorPanel({
  competitors,
  onAdd,
  onRemove,
}: CompetitorPanelProps) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !url.trim()) return;

    let cleanUrl = url.trim();
    if (!cleanUrl.startsWith("http://") && !cleanUrl.startsWith("https://")) {
      cleanUrl = `https://${cleanUrl}`;
    }

    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      url: cleanUrl,
    });
    setName("");
    setUrl("");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 font-mono text-sm">$</span>
        <h2 className="font-mono text-sm font-medium text-foreground">
          competitors
        </h2>
        <span className="text-muted-foreground font-mono text-xs">
          ({competitors.length})
        </span>
      </div>

      {competitors.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {competitors.map((c) => (
            <div
              key={c.id}
              className="group flex items-center gap-2 rounded-md border border-border/50 bg-secondary/30 px-3 py-2"
            >
              <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              <div className="flex flex-1 flex-col gap-0 overflow-hidden">
                <span className="font-mono text-sm text-foreground truncate">
                  {c.name}
                </span>
                <span className="font-mono text-xs text-muted-foreground truncate">
                  {c.url}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onRemove(c.id)}
                className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
              >
                <X className="h-3.5 w-3.5" />
                <span className="sr-only">Remove {c.name}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs">name:</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Notion"
            className={cn(
              "flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50",
              "border-b border-border/50 focus:border-emerald-400/60 outline-none py-1 px-1 transition-colors"
            )}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground font-mono text-xs whitespace-nowrap">
            url:
          </span>
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="www.notion.com"
            className={cn(
              "flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/50",
              "border-b border-border/50 focus:border-emerald-400/60 outline-none py-1 px-1 transition-colors"
            )}
          />
        </div>
        <button
          type="submit"
          disabled={!name.trim() || !url.trim()}
          className={cn(
            "flex items-center gap-1.5 self-start font-mono text-xs",
            "rounded-md border border-border/50 px-3 py-1.5 mt-1",
            "text-muted-foreground hover:text-emerald-400 hover:border-emerald-400/40",
            "disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-muted-foreground disabled:hover:border-border/50",
            "transition-colors"
          )}
        >
          <Plus className="h-3 w-3" />
          add
        </button>
      </form>
    </div>
  );
}
