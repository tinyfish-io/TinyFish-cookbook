'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useBikeSearch } from '@/hooks/use-bike-search';
import type { Bike, BikeShop } from '@/hooks/use-bike-search';
import { ResultsGrid } from '@/components/results-grid';

const CITIES = [
  { name: 'hcmc', label: '🏙️ HCMC' },
  { name: 'hanoi', label: '🏛️ Hanoi' },
  { name: 'danang', label: '🌊 Da Nang' },
  { name: 'nhatrang', label: '🏖️ Nha Trang' },
];

const BIKE_TYPES: { name: Bike['type']; label: string; activeClass: string }[] = [
  { name: 'scooter',   label: '🛵 Scooter',   activeClass: 'bg-blue-500   hover:bg-blue-600   text-white border-blue-500'   },
  { name: 'semi-auto', label: '⚙️ Semi-Auto', activeClass: 'bg-green-500  hover:bg-green-600  text-white border-green-500'  },
  { name: 'manual',    label: '🏍️ Manual',    activeClass: 'bg-orange-500 hover:bg-orange-600 text-white border-orange-500' },
  { name: 'adventure', label: '🏔️ Adventure', activeClass: 'bg-purple-500 hover:bg-purple-600 text-white border-purple-500' },
];

const CITY_LABELS: Record<string, string> = {
  hcmc:     '🏙️ HCMC',
  hanoi:    '🏛️ Hanoi',
  danang:   '🌊 Da Nang',
  nhatrang: '🏖️ Nha Trang',
};

const MAX_SLOTS = 4;

function filterShops(shops: BikeShop[], types: Set<Bike['type']>): BikeShop[] {
  if (types.size === 0) return shops;
  return shops
    .map(shop => ({ ...shop, bikes: shop.bikes.filter(b => types.has(b.type)) }))
    .filter(shop => shop.bikes.length > 0);
}

export default function Home() {
  // 4 fixed hook instances — React rules: hooks must be called unconditionally
  const hook0 = useBikeSearch();
  const hook1 = useBikeSearch();
  const hook2 = useBikeSearch();
  const hook3 = useBikeSearch();
  const allHooks = [hook0, hook1, hook2, hook3];

  // activeSlotHookIndices maps slot position → hook index (0-3).
  // Decoupling slots from hooks lets us remove any slot without shifting hook state.
  // e.g. [0] = 1 slot using hook0 | [0, 2] = slots using hook0 and hook2
  const [activeSlotHookIndices, setActiveSlotHookIndices] = useState<number[]>([0]);

  // All data keyed by hook index (not slot position) so removes don't corrupt other slots
  const [cities,   setCities]   = useState<(string | null)[]>([null, null, null, null]);
  const [typeSets, setTypeSets] = useState<Set<Bike['type']>[]>([new Set(), new Set(), new Set(), new Set()]);
  const [triggered, setTriggered] = useState<boolean[]>([false, false, false, false]);
  const [useCache, setUseCache] = useState(false);

  const slotCount    = activeSlotHookIndices.length;
  const anySearching = activeSlotHookIndices.some(hi => allHooks[hi].state.isSearching);
  const canSearchAll = activeSlotHookIndices.every(hi => !!cities[hi] && typeSets[hi].size > 0) && !anySearching;
  const anyTriggered = activeSlotHookIndices.some(hi => triggered[hi]);

  // ── handlers ────────────────────────────────────────────────────────────────

  const handleCitySelect = (slotPos: number, city: string) => {
    if (anySearching) return;
    const hi = activeSlotHookIndices[slotPos];
    setCities(prev   => prev.map((c, i) => i === hi ? city      : c));
    setTypeSets(prev => prev.map((t, i) => i === hi ? new Set() : t));
    setTriggered(prev => prev.map((t, i) => i === hi ? false    : t));
  };

  const handleToggleType = (slotPos: number, type: Bike['type']) => {
    if (anySearching) return;
    const hi = activeSlotHookIndices[slotPos];
    setTypeSets(prev => prev.map((set, i) => {
      if (i !== hi) return set;
      const next = new Set(set);
      next.has(type) ? next.delete(type) : next.add(type);
      return next;
    }));
  };

  const handleSearchAll = () => {
    if (!canSearchAll) return;
    setTriggered(prev => prev.map((t, i) => activeSlotHookIndices.includes(i) ? true : t));
    activeSlotHookIndices.forEach(hi => allHooks[hi].search(cities[hi]!, useCache));
  };

  const handleCancelAll = () => {
    activeSlotHookIndices.forEach(hi => allHooks[hi].abort());
  };

  const handleAddSlot = () => {
    if (slotCount >= MAX_SLOTS || anySearching) return;
    const used = new Set(activeSlotHookIndices);
    const freeHook = [0, 1, 2, 3].find(i => !used.has(i));
    if (freeHook === undefined) return;
    // Reset data for the recycled hook so it starts clean
    setCities(prev    => prev.map((c, i) => i === freeHook ? null      : c));
    setTypeSets(prev  => prev.map((t, i) => i === freeHook ? new Set() : t));
    setTriggered(prev => prev.map((t, i) => i === freeHook ? false     : t));
    setActiveSlotHookIndices(prev => [...prev, freeHook]);
  };

  const handleRemoveSlot = (slotPos: number) => {
    if (slotCount <= 1 || anySearching) return;
    const hi = activeSlotHookIndices[slotPos];
    allHooks[hi].abort();
    setCities(prev    => prev.map((c, i) => i === hi ? null      : c));
    setTypeSets(prev  => prev.map((t, i) => i === hi ? new Set() : t));
    setTriggered(prev => prev.map((t, i) => i === hi ? false     : t));
    setActiveSlotHookIndices(prev => prev.filter((_, i) => i !== slotPos));
  };

  // ── render ───────────────────────────────────────────────────────────────────

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

        {/* Search slots */}
        <div className="flex flex-col gap-4">
          {activeSlotHookIndices.map((hi, slotPos) => (
            <div key={hi} className="border border-zinc-200 rounded-xl p-5 space-y-5">

              {/* Slot header */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  {slotCount > 1 ? `Search ${slotPos + 1}` : 'Search'}
                </p>
                {slotCount > 1 && (
                  <button
                    onClick={() => handleRemoveSlot(slotPos)}
                    disabled={anySearching}
                    className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              {/* Step 1 — City */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Step 1 — Choose a city
                </p>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map(city => (
                    <Button
                      key={city.name}
                      variant={cities[hi] === city.name ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleCitySelect(slotPos, city.name)}
                      disabled={anySearching}
                    >
                      {city.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Step 2 — Bike type */}
              <div className={`space-y-2 transition-opacity duration-200 ${!cities[hi] ? 'opacity-40 pointer-events-none' : ''}`}>
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Step 2 — Choose at least one bike type
                </p>
                <div className="flex flex-wrap gap-2">
                  {BIKE_TYPES.map(type => {
                    const isSelected = typeSets[hi].has(type.name);
                    return (
                      <Button
                        key={type.name}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        className={isSelected ? type.activeClass : ''}
                        onClick={() => handleToggleType(slotPos, type.name)}
                        disabled={anySearching}
                      >
                        {type.label}
                      </Button>
                    );
                  })}
                </div>
              </div>

            </div>
          ))}

          {/* Add another city */}
          {slotCount < MAX_SLOTS && (
            <button
              onClick={handleAddSlot}
              disabled={anySearching}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ＋ Add another city
            </button>
          )}
        </div>

        {/* Search / Cancel + cache toggle */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleSearchAll}
              disabled={!canSearchAll}
              className="h-12 px-8 text-base"
            >
              {anySearching
                ? `Searching${slotCount > 1 ? ' all…' : '…'}`
                : `🔍 Search${slotCount > 1 ? ' all' : ''}`}
            </Button>
            {anySearching && (
              <Button
                variant="outline"
                onClick={handleCancelAll}
                className="h-12 px-6 text-base border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                ✕ Cancel
              </Button>
            )}
          </div>

          {!anySearching && !canSearchAll && (
            <p className="text-xs text-zinc-400">
              {!cities[activeSlotHookIndices[0]]
                ? 'Choose a city and bike type to search.'
                : 'Each search needs a city and at least one bike type.'}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Switch
              id="cache-toggle"
              checked={useCache}
              onCheckedChange={setUseCache}
              disabled={anySearching}
            />
            <label htmlFor="cache-toggle" className="text-sm text-zinc-600 cursor-pointer select-none">
              {useCache ? '⚡ Cached results (faster)' : '🔴 Live scraping (shows TinyFish in action)'}
            </label>
          </div>
        </div>

        {/* Per-slot results */}
        {anyTriggered ? (
          <div className="flex flex-col gap-12">
            {activeSlotHookIndices.map((hi, slotPos) => {
              if (!triggered[hi]) return null;
              const hook       = allHooks[hi];
              const filtered   = filterShops(hook.state.shops, typeSets[hi]);
              const noMatches  = typeSets[hi].size > 0 && hook.state.shops.length > 0 && filtered.length === 0;
              const cityLabel  = cities[hi] ? CITY_LABELS[cities[hi]!] : '';
              const typeLabel  = Array.from(typeSets[hi]).join(', ');

              return (
                <div key={hi} className="space-y-4">

                  {/* Section divider — only in multi-slot mode */}
                  {slotCount > 1 && (
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-semibold text-zinc-700 shrink-0">
                        {cityLabel}
                        {typeLabel && <span className="font-normal text-zinc-400 ml-1.5">— {typeLabel}</span>}
                      </h2>
                      <div className="flex-1 h-px bg-zinc-100" />
                    </div>
                  )}

                  {/* Progress bar */}
                  {(hook.state.isSearching || hook.state.progress.completed > 0) && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-zinc-600">
                        <span>
                          {hook.state.isSearching
                            ? 'Searching…'
                            : hook.state.cachedCount > 0 && hook.state.cachedCount === hook.state.progress.total
                              ? '⚡ Instant results from cache'
                              : `Search complete — ${hook.state.elapsed || '0s'}`}
                        </span>
                        <span>
                          {hook.state.progress.completed}
                          {hook.state.progress.total ? `/${hook.state.progress.total}` : ''} shops
                          {hook.state.cachedCount > 0 && ` (${hook.state.cachedCount} cached)`}
                        </span>
                      </div>
                      <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-zinc-900 transition-all duration-500 ease-out"
                          style={{
                            width: `${
                              hook.state.progress.total > 0
                                ? (hook.state.progress.completed / hook.state.progress.total) * 100
                                : hook.state.isSearching ? 5 : 100
                            }%`,
                          }}
                        />
                      </div>
                      {cities[hi] === 'nhatrang' && !hook.state.isSearching && (
                        <p className="text-xs text-zinc-400 text-center">
                          Limited coverage in Nha Trang — only 2 shops available.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Loading skeletons */}
                  {hook.state.isSearching && hook.state.shops.length === 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map(i => (
                        <Skeleton key={i} className="h-32 w-full rounded-xl" />
                      ))}
                    </div>
                  )}

                  {/* Error */}
                  {hook.state.error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
                      Error: {hook.state.error}
                    </div>
                  )}

                  {/* No results from API */}
                  {!hook.state.isSearching && hook.state.elapsed && hook.state.shops.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
                      No results found. Try another city or try again.
                    </div>
                  )}

                  {/* Filter mismatch */}
                  {noMatches && (
                    <div className="text-center py-8 text-zinc-500 border-2 border-dashed border-zinc-100 rounded-xl">
                      No bikes match your filter. Try selecting more types.
                    </div>
                  )}

                  {/* Results */}
                  {filtered.length > 0 && <ResultsGrid shops={filtered} />}
                </div>
              );
            })}
          </div>
        ) : (
          /* Initial empty state */
          <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
            {!cities[activeSlotHookIndices[0]]
              ? 'Select a city to get started'
              : typeSets[activeSlotHookIndices[0]].size === 0
                ? 'Now choose at least one bike type, then click Search'
                : 'Ready — click Search to find bikes'}
          </div>
        )}

      </main>
    </div>
  );
}
