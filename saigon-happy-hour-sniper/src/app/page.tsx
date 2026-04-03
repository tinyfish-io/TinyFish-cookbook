'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useDealSearch } from '@/hooks/use-deal-search';
import type { Venue, DealType, District } from '@/lib/types';
import { DISTRICT_LABELS } from '@/lib/district-sites';
import { ResultsGrid } from '@/components/results-grid';
import { LivePreviewGrid } from '@/components/live-preview-grid';
import { Search, X, Plus, Loader2, ArrowUpDown, SlidersHorizontal } from 'lucide-react';

/* ── constants ─────────────────────────────────────────────────────────────── */

const DISTRICTS: { name: District; label: string }[] = [
  { name: 'd1', label: DISTRICT_LABELS.d1 },
  { name: 'thao_dien', label: DISTRICT_LABELS.thao_dien },
  { name: 'd3', label: DISTRICT_LABELS.d3 },
];

const DAYS = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
] as const;

const DAY_LABELS: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

const DEAL_TYPES: { name: DealType; label: string; classes: string }[] = [
  { name: 'happy_hour',    label: 'Happy Hour',    classes: 'bg-amber-100 text-amber-800 hover:bg-amber-200 border-amber-200' },
  { name: 'ladies_night',  label: "Ladies' Night", classes: 'bg-pink-100 text-pink-800 hover:bg-pink-200 border-pink-200' },
  { name: 'brunch',        label: 'Brunch',        classes: 'bg-orange-100 text-orange-800 hover:bg-orange-200 border-orange-200' },
  { name: 'live_music',    label: 'Live Music',    classes: 'bg-purple-100 text-purple-800 hover:bg-purple-200 border-purple-200' },
  { name: 'daily_special', label: 'Daily Special', classes: 'bg-blue-100 text-blue-800 hover:bg-blue-200 border-blue-200' },
];

const MAX_SLOTS = 4;

type SortOrder = 'none' | 'price-asc' | 'price-desc';

/* ── filter logic ──────────────────────────────────────────────────────────── */

function filterAndSort(
  venues: Venue[],
  dayFilter: string | null,
  dealTypeFilter: Set<DealType>,
  nameFilter: string,
  sortOrder: SortOrder,
): Venue[] {
  let filtered = venues;

  // Day filter: keep venues where at least one deal matches the selected day
  if (dayFilter) {
    filtered = filtered
      .map(v => ({ ...v, deals: v.deals.filter(d => d.day_of_week.includes(dayFilter)) }))
      .filter(v => v.deals.length > 0);
  }

  // Deal type filter: if set is non-empty, keep only matching deal types
  if (dealTypeFilter.size > 0) {
    filtered = filtered
      .map(v => ({ ...v, deals: v.deals.filter(d => dealTypeFilter.has(d.type)) }))
      .filter(v => v.deals.length > 0);
  }

  // Name filter
  if (nameFilter.trim()) {
    const q = nameFilter.trim().toLowerCase();
    filtered = filtered.filter(v => v.name.toLowerCase().includes(q));
  }

  // Price sort
  if (sortOrder !== 'none') {
    const getMinPrice = (v: Venue) => {
      const prices = v.deals
        .flatMap(d => d.items.map(i => i.promo_price))
        .filter((p): p is number => p !== null);
      return prices.length ? Math.min(...prices) : Infinity;
    };
    filtered = [...filtered].sort((a, b) => {
      const diff = getMinPrice(a) - getMinPrice(b);
      return sortOrder === 'price-asc' ? diff : -diff;
    });
  }

  return filtered;
}

/* ── page ───────────────────────────────────────────────────────────────────── */

export default function Home() {
  // 4 fixed hook instances — React rules: hooks must be called unconditionally
  const hook0 = useDealSearch();
  const hook1 = useDealSearch();
  const hook2 = useDealSearch();
  const hook3 = useDealSearch();
  const allHooks = [hook0, hook1, hook2, hook3];

  // activeSlotHookIndices maps slot position → hook index (0-3).
  // Decoupling slots from hooks lets us remove any slot without shifting hook state.
  const [activeSlotHookIndices, setActiveSlotHookIndices] = useState<number[]>([0]);

  // Per-hook-index data (keyed by hook index, not slot position)
  const [districts, setDistricts] = useState<(District | null)[]>([null, null, null, null]);
  const [triggered, setTriggered] = useState<boolean[]>([false, false, false, false]);
  const [useCache, setUseCache] = useState(false);

  // Global filters
  const [dayFilter, setDayFilter] = useState<string | null>(null);
  const [dealTypeFilter, setDealTypeFilter] = useState<Set<DealType>>(new Set());
  const [sortOrder, setSortOrder] = useState<SortOrder>('none');
  const [nameFilter, setNameFilter] = useState('');

  const slotCount = activeSlotHookIndices.length;
  const anySearching = activeSlotHookIndices.some(hi => allHooks[hi].state.isSearching);
  const canSearchAll = activeSlotHookIndices.every(hi => !!districts[hi]) && !anySearching;
  const anyTriggered = activeSlotHookIndices.some(hi => triggered[hi]);
  const anyResults = activeSlotHookIndices.some(hi => allHooks[hi].state.venues.length > 0);
  const hasActiveFilters = dayFilter !== null || dealTypeFilter.size > 0 || sortOrder !== 'none' || nameFilter.trim().length > 0;

  /* ── handlers ──────────────────────────────────────────────────────────── */

  const handleDistrictSelect = (slotPos: number, district: District) => {
    if (anySearching) return;
    const hi = activeSlotHookIndices[slotPos];
    setDistricts(prev => prev.map((d, i) => (i === hi ? district : d)));
    setTriggered(prev => prev.map((t, i) => (i === hi ? false : t)));
  };

  const handleSearchAll = () => {
    if (!canSearchAll) return;
    setTriggered(prev =>
      prev.map((t, i) => (activeSlotHookIndices.includes(i) ? true : t)),
    );
    activeSlotHookIndices.forEach(hi => {
      allHooks[hi].search(districts[hi]!, useCache);
    });
  };

  const handleCancelAll = () => {
    activeSlotHookIndices.forEach(hi => {
      allHooks[hi].abort();
    });
  };

  const handleAddSlot = () => {
    if (slotCount >= MAX_SLOTS || anySearching) return;
    const used = new Set(activeSlotHookIndices);
    const freeHook = [0, 1, 2, 3].find(i => !used.has(i));
    if (freeHook === undefined) return;
    // Reset data for the recycled hook so it starts clean
    setDistricts(prev => prev.map((d, i) => (i === freeHook ? null : d)));
    setTriggered(prev => prev.map((t, i) => (i === freeHook ? false : t)));
    setActiveSlotHookIndices(prev => [...prev, freeHook]);
  };

  const handleRemoveSlot = (slotPos: number) => {
    if (slotCount <= 1 || anySearching) return;
    const hi = activeSlotHookIndices[slotPos];
    allHooks[hi].abort();
    setDistricts(prev => prev.map((d, i) => (i === hi ? null : d)));
    setTriggered(prev => prev.map((t, i) => (i === hi ? false : t)));
    setActiveSlotHookIndices(prev => prev.filter((_, i) => i !== slotPos));
  };

  const handleToggleDealType = (type: DealType) => {
    setDealTypeFilter(prev => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleClearFilters = () => {
    setDayFilter(null);
    setDealTypeFilter(new Set());
    setSortOrder('none');
    setNameFilter('');
  };

  /* ── render ────────────────────────────────────────────────────────────── */

  return (
    <div className="min-h-screen bg-white text-zinc-950 font-sans">
      <main className="container mx-auto max-w-3xl px-4 py-12 flex flex-col gap-8">

        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight">
            🍻 Saigon Happy Hour Sniper
          </h1>
          <p className="text-zinc-500 text-lg">
            Find the best drink deals across Ho Chi Minh City
          </p>
        </div>

        {/* Search slots */}
        <div className="flex flex-col gap-4">
          {activeSlotHookIndices.map((hi, slotPos) => (
            <div key={hi} className="border border-zinc-200 rounded-xl p-5 space-y-4">

              {/* Slot header */}
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  {slotCount > 1 ? `Search ${slotPos + 1}` : 'Search'}
                </p>
                {slotCount > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(slotPos)}
                    disabled={anySearching}
                    className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40 transition-colors flex items-center gap-1"
                  >
                    <X className="w-3 h-3" />
                    Remove
                  </button>
                )}
              </div>

              {/* District selector */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Choose a district
                </p>
                <div className="flex flex-wrap gap-2">
                  {DISTRICTS.map(district => (
                    <Button
                      key={district.name}
                      type="button"
                      variant={districts[hi] === district.name ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handleDistrictSelect(slotPos, district.name)}
                      disabled={anySearching}
                    >
                      {district.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          ))}

          {/* Add another district */}
          {slotCount < MAX_SLOTS && (
            <button
              type="button"
              onClick={handleAddSlot}
              disabled={anySearching}
              className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-zinc-200 rounded-xl text-sm text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add another district
            </button>
          )}
        </div>

        {/* Action row: Search / Cancel + cache toggle */}
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              onClick={handleSearchAll}
              disabled={!canSearchAll}
              className="h-12 px-8 text-base"
            >
              {anySearching ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Searching{slotCount > 1 ? ' all…' : '…'}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Search className="w-4 h-4" />
                  Search{slotCount > 1 ? ' all' : ''}
                </span>
              )}
            </Button>
            {anySearching && (
              <Button
                type="button"
                variant="outline"
                onClick={handleCancelAll}
                className="h-12 px-6 text-base border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              >
                <X className="w-4 h-4 mr-1" />
                Cancel
              </Button>
            )}
          </div>

          {!anySearching && !canSearchAll && (
            <p className="text-xs text-zinc-400">
              {!districts[activeSlotHookIndices[0]]
                ? 'Choose a district to get started.'
                : 'Each search needs a district selected.'}
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

        {/* Global filter toolbar — only visible when results exist */}
        {anyTriggered && anyResults && (
          <div className="space-y-3 py-4 px-4 bg-zinc-50 rounded-xl border border-zinc-100">

            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400 uppercase tracking-wide">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters
            </div>

            {/* Day filter */}
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-500 font-medium">Day</p>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant={dayFilter === null ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => setDayFilter(null)}
                >
                  All Days
                </Button>
                {DAYS.map(day => (
                  <Button
                    key={day}
                    type="button"
                    variant={dayFilter === day ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDayFilter(dayFilter === day ? null : day)}
                  >
                    {DAY_LABELS[day]}
                  </Button>
                ))}
              </div>
            </div>

            {/* Deal type toggles */}
            <div className="space-y-1.5">
              <p className="text-xs text-zinc-500 font-medium">Deal Type</p>
              <div className="flex flex-wrap gap-1.5">
                {DEAL_TYPES.map(dt => {
                  const isActive = dealTypeFilter.has(dt.name);
                  return (
                    <button
                      key={dt.name}
                      type="button"
                      onClick={() => handleToggleDealType(dt.name)}
                      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-all border ${
                        isActive
                          ? dt.classes
                          : 'bg-white text-zinc-400 border-zinc-200 hover:border-zinc-300 hover:text-zinc-600'
                      }`}
                    >
                      {dt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sort + name filter row */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-xs text-zinc-500 font-medium">Sort</span>
                {(['none', 'price-asc', 'price-desc'] as SortOrder[]).map(order => (
                  <Button
                    key={order}
                    type="button"
                    variant={sortOrder === order ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setSortOrder(order)}
                  >
                    {order === 'none' ? 'Default' : order === 'price-asc' ? '$ Low → High' : '$ High → Low'}
                  </Button>
                ))}
              </div>
              <div className="flex-1 min-w-[160px]">
                <input
                  type="text"
                  placeholder="Filter by venue name…"
                  value={nameFilter}
                  onChange={e => setNameFilter(e.target.value)}
                  className="w-full h-7 px-3 text-xs rounded-md border border-zinc-200 bg-white text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 transition-shadow"
                />
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}

        {/* Per-slot results */}
        {anyTriggered ? (
          <div className="flex flex-col gap-12">
            {activeSlotHookIndices.map((hi) => {
              if (!triggered[hi]) return null;
              const hook = allHooks[hi];
              const filtered = filterAndSort(hook.state.venues, dayFilter, dealTypeFilter, nameFilter, sortOrder);
              const noMatches = hook.state.venues.length > 0 && filtered.length === 0;
              const districtLabel = districts[hi] ? DISTRICT_LABELS[districts[hi]!] : '';

              return (
                <div key={hi} className="space-y-4">

                  {/* Section divider — only in multi-slot mode */}
                  {slotCount > 1 && (
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-semibold text-zinc-700 shrink-0">
                        {districtLabel}
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
                          {hook.state.progress.total ? `/${hook.state.progress.total}` : ''} venues
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
                    </div>
                  )}

                  {/* Live browser agent iframes */}
                  {hook.state.streamingUrls.length > 0 && (
                    <LivePreviewGrid previews={hook.state.streamingUrls} />
                  )}

                  {/* Loading skeletons */}
                  {hook.state.isSearching && hook.state.venues.length === 0 && (
                    <div className="grid grid-cols-1 gap-4">
                      {[1, 2, 3].map(i => (
                        <Skeleton key={i} className="h-40 w-full rounded-xl" />
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
                  {!hook.state.isSearching && hook.state.elapsed && hook.state.venues.length === 0 && (
                    <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
                      No results found. Try another district or try again.
                    </div>
                  )}

                  {/* Filter mismatch */}
                  {noMatches && (
                    <div className="text-center py-8 text-zinc-500 border-2 border-dashed border-zinc-100 rounded-xl">
                      No venues match your filters. Try adjusting the day, deal type, or name filter.
                    </div>
                  )}

                  {/* Results */}
                  {filtered.length > 0 && <ResultsGrid venues={filtered} />}
                </div>
              );
            })}
          </div>
        ) : (
          /* Initial empty state */
          <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
            {!districts[activeSlotHookIndices[0]]
              ? 'Select a district to get started'
              : 'Ready — click Search to find deals'}
          </div>
        )}

        {/* Footer */}
        <footer className="text-center text-sm text-zinc-400 pt-4 border-t border-zinc-100">
          Powered by{' '}
          <a
            href="https://tinyfish.io"
            target="_blank"
            rel="noopener noreferrer"
            className="text-zinc-600 hover:text-zinc-900 underline underline-offset-2 transition-colors"
          >
            TinyFish
          </a>
        </footer>

      </main>
    </div>
  );
}
