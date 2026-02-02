"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface TerminalInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}

export function TerminalInput({
  value,
  onChange,
  onSubmit,
  disabled = false,
  loading = false,
  placeholder = "Enter a topic to generate a skill guide...",
}: TerminalInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!disabled && !loading && inputRef.current) {
      inputRef.current.focus();
    }
  }, [disabled, loading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !disabled && !loading) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className={cn(
        "terminal-glow rounded-lg border border-border bg-card p-4 transition-all",
        disabled && "opacity-60"
      )}
    >
      <div className="flex items-center gap-3">
        <span className="font-mono text-primary select-none">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            ">_"
          )}
        </span>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading}
          placeholder={placeholder}
          className={cn(
            "flex-1 bg-transparent font-mono text-foreground outline-none",
            "placeholder:text-muted-foreground/50",
            "disabled:cursor-not-allowed"
          )}
        />
      </div>

      {value && !loading && (
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span>Press</span>
          <kbd className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[10px]">
            Enter
          </kbd>
          <span>to generate</span>
        </div>
      )}
    </div>
  );
}
