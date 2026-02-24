'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useBikeSearch } from '@/hooks/use-bike-search';
import { ResultsGrid } from '@/components/results-grid';

const CITIES = [
  { name: 'hcmc', label: '🏙️ HCMC' },
  { name: 'hanoi', label: '🏛️ Hanoi' },
  { name: 'danang', label: '🌊 Da Nang' },
  { name: 'nhatrang', label: '🏖️ Nha Trang' },
];

export default function Home() {
  const { state, search } = useBikeSearch();
  const [selectedCity, setSelectedCity] = useState<string | null>(null);

  const handleCitySelect = (city: string) => {
    if (state.isSearching) return;
    setSelectedCity(city);
    search(city);
  };

  return (
    <div className="min-h-screen bg-white text-zinc-950 font-sans">
      <main className="container mx-auto max-w-3xl px-4 py-12 flex flex-col gap-8">
        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight">🛵 Vietnam Bike Price Scout</h1>
          <p className="text-zinc-500 text-lg">
            Compare motorbike rental prices across Vietnam in seconds, not hours.
          </p>
        </div>

        {/* City Selectors */}
        <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
          {CITIES.map((city) => (
            <Button
              key={city.name}
              variant={selectedCity === city.name ? 'default' : 'outline'}
              onClick={() => handleCitySelect(city.name)}
              disabled={state.isSearching}
              className="h-12 px-6 text-base"
            >
              {city.label}
            </Button>
          ))}
        </div>

        {/* Error Message */}
        {state.error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
            Error: {state.error}
          </div>
        )}

        {/* Progress Section */}
        {(state.isSearching || state.progress.completed > 0) && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>
                {state.isSearching
                  ? 'Searching...'
                  : state.cachedCount > 0 && state.cachedCount === state.progress.total
                    ? `⚡ Instant results from cache`
                    : `Search complete — ${state.elapsed || '0s'}`}
              </span>
              <span>
                {state.progress.completed}
                {state.progress.total ? `/${state.progress.total}` : ''} shops
                {state.cachedCount > 0 && ` (${state.cachedCount} cached)`}
              </span>
            </div>
            <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-zinc-900 transition-all duration-500 ease-out"
                style={{
                  width: `${
                    state.progress.total > 0
                      ? (state.progress.completed / state.progress.total) * 100
                      : state.isSearching ? 5 : 100 // Show a tiny bit if searching but total unknown, or 100% if done
                  }%`,
                }}
              />
            </div>
            {selectedCity === 'nhatrang' && !state.isSearching && (
              <p className="text-xs text-zinc-400 text-center">
                Limited coverage in Nha Trang — only 2 shops available.
              </p>
            )}
          </div>
        )}

        {/* Results Area */}
        <div className="space-y-4">
          {!selectedCity && state.shops.length === 0 && (
            <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
              Select a city to start
            </div>
          )}

          {state.isSearching && state.shops.length === 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-32 w-full rounded-xl" />
              ))}
            </div>
          )}

          {!state.isSearching && state.elapsed && state.shops.length === 0 && (
            <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
              No results found for this city. Try another city or try again.
            </div>
          )}

          {state.shops.length > 0 && <ResultsGrid shops={state.shops} />}
        </div>
      </main>
    </div>
  );
}
