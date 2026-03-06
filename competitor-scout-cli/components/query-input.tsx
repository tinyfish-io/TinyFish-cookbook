"use client";

import React from "react"

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Search, Loader2 } from "lucide-react";

interface QueryInputProps {
  onSubmit: (question: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function QueryInput({ onSubmit, disabled, isLoading }: QueryInputProps) {
  const [question, setQuestion] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim() || disabled) return;
    onSubmit(question.trim());
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="text-emerald-400 font-mono text-sm">$</span>
        <span className="font-mono text-sm text-foreground">research</span>
      </div>
      <div className="flex items-start gap-2">
        <div className="flex flex-1 items-center gap-2 rounded-md border border-border/50 bg-secondary/20 px-3 py-2.5 focus-within:border-emerald-400/60 transition-colors">
          {isLoading ? (
            <Loader2 className="h-4 w-4 shrink-0 text-emerald-400 animate-spin" />
          ) : (
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What sign-in methods do my competitors support?"
            disabled={disabled}
            className={cn(
              "flex-1 bg-transparent font-mono text-sm text-foreground placeholder:text-muted-foreground/40",
              "outline-none disabled:opacity-50"
            )}
          />
        </div>
        <button
          type="submit"
          disabled={!question.trim() || disabled}
          className={cn(
            "shrink-0 font-mono text-sm font-medium",
            "rounded-md bg-emerald-500/90 px-4 py-2.5 text-background",
            "hover:bg-emerald-400 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-emerald-500/90",
            "transition-colors"
          )}
        >
          {isLoading ? "running..." : "go"}
        </button>
      </div>
    </form>
  );
}
