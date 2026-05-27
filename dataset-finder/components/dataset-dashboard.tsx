'use client';

import { useState, useEffect } from 'react';
import { RotateCcw, Sun, Moon } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { SearchForm } from './search-form';
import { AgentCard } from './agent-card';
import { AgentStatusGrid } from './agent-status-grid';
import { MetricsStrip } from './metrics-strip';
import { LiveBrowserPreview } from './live-browser-preview';
import { useDatasetSearch } from '@/hooks/use-dataset-search';
import type { UseCase } from '@/lib/types';

function SearchingAnimation() {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative w-28 h-28 mb-6">
        <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-pulse" />
        <div
          className="absolute inset-2 rounded-full border-2 border-dashed border-primary/30 animate-spin"
          style={{ animationDuration: '4s' }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg width="40" height="40" viewBox="0 0 48 48" fill="none">
            <circle cx="22" cy="22" r="12" className="stroke-primary" strokeWidth="2.5" fill="none" />
            <line x1="31" y1="31" x2="42" y2="42" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        </div>
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">Scanning sources...</h3>
      <p className="text-muted-foreground text-center text-sm max-w-sm">
        Parallel agents are searching trusted sources for relevant datasets
      </p>
    </div>
  );
}

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="h-9 w-9" />;

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-9 w-9"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      aria-label="Toggle theme"
    >
      {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}

export function DatasetDashboard() {
  const { isDiscovering, agents, sortedAgents, error, discoverDatasets, retryAgent, reset } = useDatasetSearch();
  const [expandedPreview, setExpandedPreview] = useState<{ url: string; name: string } | null>(null);
  const [searchTime, setSearchTime] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [lastUseCase, setLastUseCase] = useState<UseCase>('machine-learning');

  const handleSearch = (topic: string, useCase: UseCase) => {
    setSearchTime(0);
    setTimerActive(true);
    setLastUseCase(useCase);
    setExpandedPreview(null);
    discoverDatasets(topic, useCase);
  };

  useEffect(() => {
    if (!timerActive) return;
    const interval = setInterval(() => setSearchTime((prev) => prev + 100), 100);
    return () => clearInterval(interval);
  }, [timerActive]);

  // Stop timer when all agents are in a terminal state
  useEffect(() => {
    if (agents.length === 0 || isDiscovering) return;
    const allDone = agents.every((a) => ['complete', 'blocked', 'not_found', 'error'].includes(a.status));
    if (allDone && timerActive) setTimerActive(false);
  }, [agents, isDiscovering, timerActive]);

  // Auto-close expanded preview when all agents finish
  useEffect(() => {
    if (agents.length === 0) return;
    const allDone = agents.every((a) => ['complete', 'blocked', 'not_found', 'error'].includes(a.status));
    if (allDone && expandedPreview) setExpandedPreview(null);
  }, [agents, expandedPreview]);

  const hasResults = agents.length > 0;
  const isProcessing = agents.some((a) => !['complete', 'blocked', 'not_found', 'error'].includes(a.status));
  const datasetsFound = agents.filter((a) => a.status === 'complete' && a.card).length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="shrink-0">
                <rect width="32" height="32" rx="8" className="fill-primary" />
                <circle cx="14" cy="14" r="6" stroke="white" strokeWidth="2" fill="none" />
                <line x1="18.5" y1="18.5" x2="24" y2="24" stroke="white" strokeWidth="2" strokeLinecap="round" />
                <rect x="11" y="12" width="6" height="1.5" rx="0.75" fill="white" opacity="0.6" />
                <rect x="11" y="15" width="4" height="1.5" rx="0.75" fill="white" opacity="0.4" />
              </svg>
              <div>
                <h1 className="font-mono text-xl font-bold uppercase tracking-wider text-foreground">
                  DataScout
                </h1>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Parallel Dataset Discovery
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              {hasResults && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setTimerActive(false);
                    setSearchTime(0);
                    setExpandedPreview(null);
                    reset();
                  }}
                  className="font-mono text-xs uppercase tracking-wide"
                >
                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        {/* Initial Search State */}
        {!hasResults && !isDiscovering && (
          <section className="max-w-2xl mx-auto space-y-6">
            <div className="text-center space-y-3 mb-8">
              <h2 className="font-mono text-2xl font-semibold uppercase tracking-wide text-foreground">
                Initiate Dataset Scan
              </h2>
              <p className="text-muted-foreground">
                Enter a domain or problem to begin parallel dataset discovery
              </p>
            </div>
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <SearchForm onSearch={handleSearch} isLoading={isDiscovering} />
            </div>
          </section>
        )}

        {/* Searching Animation */}
        {isDiscovering && agents.length === 0 && <SearchingAnimation />}

        {/* Error State */}
        {error && (
          <div className="max-w-2xl mx-auto rounded-lg border border-destructive/30 bg-destructive/5 p-4 mb-6">
            <p className="font-mono text-sm text-destructive">Scan Error: {error}</p>
          </div>
        )}

        {/* Results Dashboard */}
        {hasResults && (
          <div className="space-y-6">
            {/* Compact Search */}
            <section className="rounded-lg border border-border bg-card p-4 shadow-sm">
              <SearchForm onSearch={handleSearch} isLoading={isDiscovering || isProcessing} />
            </section>

            {/* Agent Status Grid */}
            <AgentStatusGrid agents={agents} />

            {/* Metrics Strip */}
            <MetricsStrip agents={agents} searchTime={searchTime} />

            {/* Results Section */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-mono text-sm font-semibold uppercase tracking-wide text-foreground">
                  Scan Results
                </h2>
                <p className="text-xs text-muted-foreground">
                  {isProcessing ? (
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                      Scanning {agents.length} sources...
                    </span>
                  ) : (
                    <span>
                      {datasetsFound} of {agents.length} sources returned results
                    </span>
                  )}
                </p>
              </div>
              <div className="border-t border-dashed border-border" />

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                {sortedAgents.map((agent) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    onExpandPreview={(url, name) => setExpandedPreview({ url, name })}
                    onRetry={() => retryAgent(agent.id, lastUseCase)}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Expanded Live Preview */}
      {expandedPreview && (
        <LiveBrowserPreview
          streamingUrl={expandedPreview.url}
          platformName={expandedPreview.name}
          onClose={() => setExpandedPreview(null)}
        />
      )}
    </div>
  );
}
