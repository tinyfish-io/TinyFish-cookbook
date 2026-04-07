'use client';

import { useState } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePharmacySearch } from '@/hooks/use-pharmacy-search';
import { ResultsGrid } from '@/components/results-grid';
import { LivePreviewGrid } from '@/components/live-preview-grid';
import { SavingsBanner } from '@/components/savings-banner';

const PRESETS = [
  'Paracetamol',
  'Vitamin C',
  'Amoxicillin',
  'Sữa bột trẻ em',
  'Kem chống nắng',
  'Thuốc ho',
];

export default function Home() {
  const [query, setQuery] = useState('');
  const [useCache, setUseCache] = useState(false);
  const [triggered, setTriggered] = useState(false);

  const { state, search, abort } = usePharmacySearch();

  const handleSearch = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed || state.isSearching) return;
    setTriggered(true);
    search(trimmed, useCache);
  };

  const handlePreset = (preset: string) => {
    if (state.isSearching) return;
    setQuery(preset);
    setTriggered(true);
    search(preset, useCache);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch(query);
  };

  const progressWidth =
    state.progress.total > 0
      ? (state.progress.completed / state.progress.total) * 100
      : state.isSearching
      ? 5
      : 100;

  return (
    <div className="min-h-screen bg-white text-zinc-950 font-sans">
      <main className="container mx-auto max-w-3xl px-4 py-12 flex flex-col gap-8">

        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight">💊 Pharmacy Panic</h1>
          <p className="text-zinc-500 text-lg">
            Compare medicine prices across Vietnam&apos;s pharmacy chains in seconds.
          </p>
        </div>

        {/* Category preset buttons */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
            Quick search
          </p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset}
                variant="outline"
                size="sm"
                disabled={state.isSearching}
                onClick={() => handlePreset(preset)}
                className="text-xs"
              >
                {preset}
              </Button>
            ))}
          </div>
        </div>

        {/* Search form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search for medicine, vitamins, skincare..."
              disabled={state.isSearching}
              className="flex-1 h-11 px-4 rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 disabled:opacity-50 transition-shadow text-sm"
            />
            {state.isSearching ? (
              <Button
                variant="destructive"
                onClick={abort}
                className="h-11 px-4"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            ) : (
              <Button
                onClick={() => handleSearch(query)}
                disabled={!query.trim()}
                className="h-11 px-6"
              >
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            )}
          </div>

          {!state.isSearching && (
            <button
              type="button"
              onClick={() => setUseCache((c) => !c)}
              className={`inline-flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border transition-colors ${
                useCache
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : 'bg-zinc-50 border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-700'
              }`}
            >
              {useCache ? '⚡ Using cached results' : '🔴 Live scraping'}
            </button>
          )}
        </div>

        {/* Progress section */}
        {triggered && (state.isSearching || state.elapsed) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-zinc-600">
              <span className="flex items-center gap-1.5">
                {state.isSearching && <Loader2 className="h-3 w-3 animate-spin" />}
                {state.isSearching
                  ? 'Searching...'
                  : state.cachedCount > 0 && state.cachedCount === state.progress.total
                  ? '⚡ Instant from cache'
                  : `Complete — ${state.elapsed}`}
              </span>
              <span>
                {state.progress.completed}
                {state.progress.total ? `/${state.progress.total}` : ''} pharmacies
                {state.cachedCount > 0 && ` (${state.cachedCount} cached)`}
              </span>
            </div>
            <progress
              value={progressWidth}
              max={100}
              className="w-full h-2 rounded-full appearance-none [&::-webkit-progress-bar]:rounded-full [&::-webkit-progress-bar]:bg-zinc-100 [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-zinc-900 [&::-webkit-progress-value]:transition-all [&::-webkit-progress-value]:duration-500 [&::-moz-progress-bar]:bg-zinc-900 [&::-moz-progress-bar]:rounded-full"
            />
          </div>
        )}

        {/* Live preview iframes — removed when search finishes */}
        {state.isSearching && state.streamingUrls.length > 0 && (
          <LivePreviewGrid previews={state.streamingUrls} />
        )}

        {/* Loading skeletons */}
        {state.isSearching && state.results.length === 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Error */}
        {state.error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-lg border border-red-100 text-sm">
            Error: {state.error}
          </div>
        )}

        {/* Savings banner */}
        {state.results.length > 0 && (
          <SavingsBanner results={state.results} />
        )}

        {/* Results */}
        {state.results.length > 0 && (
          <ResultsGrid results={state.results} />
        )}

        {/* Empty state */}
        {!triggered && (
          <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
            Select a category or search for a product
          </div>
        )}

        {/* No results state */}
        {triggered && !state.isSearching && state.elapsed && state.results.length === 0 && !state.error && (
          <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
            No results found. Try a different search term.
          </div>
        )}

      </main>
    </div>
  );
}
