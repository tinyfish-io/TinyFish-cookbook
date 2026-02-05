"use client";

import { useEffect, useState, useRef } from "react";
import { useGeneration } from "@/hooks/use-generation";
import { getSettings } from "@/lib/storage";
import { formatDuration } from "@/lib/utils";
import type { Settings, SourceType } from "@/types";
import { DEFAULT_SETTINGS, SOURCE_CONFIG } from "@/types";
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  History,
  Settings as SettingsIcon,
  ChevronRight,
} from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
import Link from "next/link";
import { marked } from "marked";

// ASCII dot spinner component
function AsciiSpinner({ className = "" }: { className?: string }) {
  const [frame, setFrame] = useState(0);
  const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

  useEffect(() => {
    const interval = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, 80);
    return () => clearInterval(interval);
  }, [frames.length]);

  return <span className={className}>{frames[frame]}</span>;
}

export default function HomePage() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"preview" | "raw" | "sources">("preview");
  const [copied, setCopied] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSettings(getSettings());
    inputRef.current?.focus();
  }, []);

  const {
    phase,
    topic,
    enabledSources,
    identifiedSources,
    skillMd,
    error,
    isGenerating,
    scrapeProgressArray,
    totalWords,
    setTopic,
    toggleSource,
    generate,
    cancel,
    reset,
  } = useGeneration(settings);

  useEffect(() => {
    if (phase === "identifying") {
      setStartTime(Date.now());
    }
  }, [phase]);

  // Auto-scroll output when streaming, but only if user hasn't scrolled up
  const [userScrolledUp, setUserScrolledUp] = useState(false);

  useEffect(() => {
    if (phase === "synthesizing" && outputRef.current && !userScrolledUp) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
    // Reset scroll lock when generation completes or starts fresh
    if (phase === "idle" || phase === "identifying") {
      setUserScrolledUp(false);
    }
  }, [skillMd, phase, userScrolledUp]);

  const handleOutputScroll = () => {
    if (outputRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = outputRef.current;
      // User scrolled up if they're more than 100px from bottom
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setUserScrolledUp(!isNearBottom);
    }
  };

  const duration = startTime ? Date.now() - startTime : 0;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isGenerating && topic.trim()) {
      e.preventDefault();
      generate();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(skillMd);
      setCopied(true);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    const blob = new Blob([skillMd], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SKILL-${topic.toLowerCase().replace(/\s+/g, "-")}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Downloaded SKILL.md");
  };

  const getHtml = () => {
    if (!skillMd) return "";
    const parsed = marked.parse(skillMd);
    return typeof parsed === "string" ? parsed : "";
  };

  return (
    <div className="min-h-screen">
      {/* Minimal Header */}
      <header className="px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image
            src="/tinyfish.avif"
            alt="TinySkills"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="font-semibold text-lg tracking-tight font-display">TinySkills<span className="text-primary">.md</span></span>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href="/history"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <History className="w-4 h-4" />
          </Link>
          <Link
            href="/settings"
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <SettingsIcon className="w-4 h-4" />
          </Link>
        </nav>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Image
              src="/tinyfish.avif"
              alt="TinySkills"
              width={48}
              height={48}
              className="rounded-xl"
            />
            <h1 className="text-4xl font-semibold tracking-tight text-secondary font-display">
              TinySkills<span className="text-primary">.md</span>
            </h1>
          </div>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Enter a topic and we&apos;ll synthesize docs, GitHub issues, Stack Overflow,
            and dev blogs into a ready-to-use skill file.
          </p>
        </div>

        {/* Terminal Input */}
        <div
          className={`terminal mb-6 ${isFocused || isGenerating ? "terminal-active" : ""}`}
        >
          <div className="terminal-header">
            <div className="terminal-dot red" />
            <div className="terminal-dot yellow" />
            <div className="terminal-dot green" />
            <span className="ml-3 text-xs text-white/40 font-mono">tinyskills</span>
          </div>
          <div className="terminal-body">
            <div className="flex items-center gap-2">
              <span className="terminal-prompt">$</span>
              <span className="text-white/60">generate</span>
              <input
                ref={inputRef}
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                disabled={isGenerating}
                placeholder="react server components"
                className="terminal-input flex-1"
              />
                            {isGenerating && (
                <AsciiSpinner className="text-primary font-mono" />
              )}
            </div>

            {/* Command hint */}
            {topic && !isGenerating && (
              <div className="mt-4 flex items-center gap-2 text-xs text-white/30">
                <span>Press</span>
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">
                  Enter
                </kbd>
                <span>to generate</span>
              </div>
            )}

            {/* Status messages */}
            {phase === "identifying" && (
              <div className="mt-4 text-xs text-white/50">
                <span className="text-primary">→</span> Finding relevant sources for &quot;{topic}&quot;...
              </div>
            )}
            {phase === "scraping" && (
              <div className="mt-4 text-xs text-white/50">
                <span className="text-primary">→</span> Scraping {scrapeProgressArray.length} sources...
              </div>
            )}
            {phase === "synthesizing" && (
              <div className="mt-4 text-xs text-white/50">
                <span className="text-primary">→</span> Generating skill guide...
              </div>
            )}
            {phase === "complete" && (
              <div className="mt-4 text-xs text-green-400">
                <span>✓</span> Generated {totalWords.toLocaleString()} words from {identifiedSources.length} sources in {formatDuration(duration)}
              </div>
            )}
            {phase === "error" && (
              <div className="mt-4 text-xs text-red-400">
                <span>✗</span> {error}
              </div>
            )}
          </div>
        </div>

        {/* Source Toggles */}
        <div className="mb-8">
          <p className="section-label mb-3">Sources</p>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(SOURCE_CONFIG) as SourceType[]).map((source) => {
              const isEnabled = enabledSources.includes(source);
              const config = SOURCE_CONFIG[source];
              return (
                <button
                  key={source}
                  onClick={() => toggleSource(source)}
                  disabled={isGenerating}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${isGenerating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
                    ${isEnabled
                      ? "bg-primary text-white"
                      : "bg-white text-muted-foreground border border-border hover:border-primary/30 hover:text-foreground"
                    }
                  `}
                >
                  {isEnabled && <Check className="w-3.5 h-3.5" />}
                  <span>{config.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Buttons */}
        {(phase === "complete" || phase === "error") && (
          <div className="mb-8 flex gap-3">
            <button
              onClick={reset}
              className="px-4 py-2 bg-primary text-white rounded-md text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              New Generation
            </button>
            {phase === "error" && (
              <button
                onClick={generate}
                className="px-4 py-2 bg-secondary text-white rounded-md text-sm font-medium hover:bg-secondary/90 transition-colors"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {isGenerating && (
          <div className="mb-8">
            <button
              onClick={cancel}
              className="px-4 py-2 border border-border rounded-md text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Scraping Progress - only show during active scraping */}
        {phase === "scraping" && scrapeProgressArray.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AsciiSpinner className="text-primary font-mono text-sm" />
                <span className="text-sm text-muted-foreground">Gathering sources</span>
              </div>
              <span className="text-xs tabular-nums text-muted-foreground">
                {scrapeProgressArray.filter((p) => p.status === "complete").length}/{scrapeProgressArray.length}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
              {scrapeProgressArray.map((item) => (
                <div
                  key={item.source.url}
                  className={`
                    group relative px-3 py-2.5 rounded-md transition-all
                    ${item.status === "pending" ? "bg-muted/30" : ""}
                    ${item.status === "scraping" ? "bg-primary/5" : ""}
                    ${item.status === "complete" ? "bg-green-50" : ""}
                    ${item.status === "error" ? "bg-red-50" : ""}
                  `}
                >
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 font-mono text-xs">
                      {item.status === "pending" && (
                        <span className="text-muted-foreground/40">○</span>
                      )}
                      {item.status === "scraping" && (
                        <AsciiSpinner className="text-primary" />
                      )}
                      {item.status === "complete" && (
                        <span className="text-green-500">✓</span>
                      )}
                      {item.status === "error" && (
                        <span className="text-destructive">✗</span>
                      )}
                    </span>
                    <span className={`text-xs truncate ${item.status === "pending" ? "text-muted-foreground/60" : "text-foreground"}`}>
                      {item.source.title}
                    </span>
                  </div>
                  {item.status === "complete" && item.wordCount && (
                    <p className="text-[10px] text-muted-foreground mt-0.5 ml-5">
                      {item.wordCount.toLocaleString()} words
                    </p>
                  )}
                  {item.streamingUrl && item.status === "scraping" && (
                    <a
                      href={item.streamingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-2.5 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-foreground transition-all"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Output Panel */}
        {(phase === "synthesizing" || phase === "complete") && skillMd && (
          <div className="output-panel">
            <div className="output-tabs px-2">
              <button
                onClick={() => setActiveTab("preview")}
                className={`output-tab ${activeTab === "preview" ? "active" : ""}`}
              >
                Preview
              </button>
              <button
                onClick={() => setActiveTab("raw")}
                className={`output-tab ${activeTab === "raw" ? "active" : ""}`}
              >
                Raw
              </button>
              <button
                onClick={() => setActiveTab("sources")}
                className={`output-tab ${activeTab === "sources" ? "active" : ""}`}
              >
                Sources
                <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-muted">
                  {identifiedSources.length}
                </span>
              </button>
              <div className="ml-auto flex items-center gap-1 py-2">
                <button
                  onClick={handleCopy}
                  disabled={phase === "synthesizing"}
                  className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleDownload}
                  disabled={phase === "synthesizing"}
                  className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div ref={outputRef} onScroll={handleOutputScroll} className="h-[500px] overflow-y-auto p-6">
              {activeTab === "preview" && (
                <div
                  className="prose-skill"
                  dangerouslySetInnerHTML={{ __html: getHtml() }}
                />
              )}
              {activeTab === "raw" && (
                <pre className="font-mono text-sm text-muted-foreground whitespace-pre-wrap">
                  {skillMd}
                </pre>
              )}
              {activeTab === "sources" && (
                <div className="space-y-4">
                  {(Object.keys(SOURCE_CONFIG) as SourceType[]).map((type) => {
                    const typeSources = identifiedSources.filter((s) => s.type === type);
                    if (typeSources.length === 0) return null;
                    return (
                      <div key={type}>
                        <p className="section-label mb-2">{SOURCE_CONFIG[type].label}</p>
                        <div className="space-y-2">
                          {typeSources.map((source) => (
                            <a
                              key={source.url}
                              href={source.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block p-3 rounded-md border border-border hover:border-primary hover:bg-muted/30 transition-all group"
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium group-hover:text-primary">
                                  {source.title}
                                </span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                              </div>
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {source.url}
                              </p>
                            </a>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="text-primary font-medium">Tinyfish</span> web agent
        </p>
      </footer>
    </div>
  );
}
