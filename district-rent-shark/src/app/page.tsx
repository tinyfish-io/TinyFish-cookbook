'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useListingSearch } from '@/hooks/use-listing-search';
import { useVibeSearch } from '@/hooks/use-vibe-search';
import type { PlatformResult, RentalListing } from '@/hooks/use-listing-search';
import { ResultsGrid } from '@/components/results-grid';
import { LivePreviewGrid } from '@/components/live-preview-grid';
import { VibeCard } from '@/components/vibe-card';
import { FilterToolbar } from '@/components/filter-toolbar';

const ListingMap = dynamic(
  () => import('@/components/listing-map').then((mod) => mod.ListingMap),
  { ssr: false },
);

const CITIES = [
  { name: 'hcmc', label: '🏙️ HCMC' },
  { name: 'hanoi', label: '🏛️ Hanoi' },
  { name: 'danang', label: '🌊 Da Nang' },
];

const CITY_LABELS: Record<string, string> = {
  hcmc: '🏙️ HCMC',
  hanoi: '🏛️ Hanoi',
  danang: '🌊 Da Nang',
};

const MAX_SLOTS = 4;
const HAS_MAP_TOKEN = !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

// ── Client-side filtering ────────────────────────────────────────────────────

interface Filters {
  district: string;
  priceMin: number | null;
  priceMax: number | null;
  bedrooms: string;
  bathrooms: string;
  sort: string;
}

const DEFAULT_FILTERS: Filters = {
  district: 'any',
  priceMin: null,
  priceMax: null,
  bedrooms: 'any',
  bathrooms: 'any',
  sort: 'relevance',
};

function filterListings(platforms: PlatformResult[], filters: Filters): PlatformResult[] {
  return platforms
    .map((platform) => ({
      ...platform,
      listings: platform.listings.filter((listing) => {
        if (filters.district !== 'any' && listing.district !== filters.district) return false;
        if (
          filters.priceMin !== null &&
          (listing.price_vnd_monthly === null || listing.price_vnd_monthly < filters.priceMin)
        )
          return false;
        if (
          filters.priceMax !== null &&
          (listing.price_vnd_monthly === null || listing.price_vnd_monthly > filters.priceMax)
        )
          return false;
        if (filters.bedrooms !== 'any') {
          const beds = Number(filters.bedrooms);
          if (beds >= 3) {
            if (listing.bedrooms === null || listing.bedrooms < 3) return false;
          } else {
            if (listing.bedrooms !== beds) return false;
          }
        }
        if (filters.bathrooms !== 'any') {
          const baths = Number(filters.bathrooms);
          if (baths >= 2) {
            if (listing.bathrooms === null || listing.bathrooms < 2) return false;
          } else {
            if (listing.bathrooms !== baths) return false;
          }
        }
        return true;
      }),
    }))
    .filter((p) => p.listings.length > 0);
}

function sortListings(platforms: PlatformResult[], sortOrder: string): PlatformResult[] {
  if (sortOrder === 'relevance') return platforms;
  return platforms.map((platform) => ({
    ...platform,
    listings: [...platform.listings].sort((a, b) => {
      if (sortOrder === 'price_asc') {
        return (a.price_vnd_monthly ?? Infinity) - (b.price_vnd_monthly ?? Infinity);
      }
      if (sortOrder === 'price_desc') {
        return (b.price_vnd_monthly ?? -Infinity) - (a.price_vnd_monthly ?? -Infinity);
      }
      if (sortOrder === 'newest') {
        return new Date(b.post_date || 0).getTime() - new Date(a.post_date || 0).getTime();
      }
      return 0;
    }),
  }));
}

// ── Main component ───────────────────────────────────────────────────────────

export default function Home() {
  // 4 fixed listing hook instances — React rules: hooks must be called unconditionally
  const listingHook0 = useListingSearch();
  const listingHook1 = useListingSearch();
  const listingHook2 = useListingSearch();
  const listingHook3 = useListingSearch();
  const allListingHooks = [listingHook0, listingHook1, listingHook2, listingHook3];

  // 4 fixed vibe hook instances
  const vibeHook0 = useVibeSearch();
  const vibeHook1 = useVibeSearch();
  const vibeHook2 = useVibeSearch();
  const vibeHook3 = useVibeSearch();
  const allVibeHooks = [vibeHook0, vibeHook1, vibeHook2, vibeHook3];

  // activeSlotHookIndices maps slot position → hook index (0-3).
  // Decoupling slots from hooks lets us remove any slot without shifting hook state.
  const [activeSlotHookIndices, setActiveSlotHookIndices] = useState<number[]>([0]);

  // All data keyed by hook index (not slot position) so removes don't corrupt other slots
  const [cities, setCities] = useState<(string | null)[]>([null, null, null, null]);
  const [triggered, setTriggered] = useState<boolean[]>([false, false, false, false]);
  const [useCache, setUseCache] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('list');

  const slotCount = activeSlotHookIndices.length;
  const anySearching = activeSlotHookIndices.some(
    (hi) => allListingHooks[hi].state.isSearching || allVibeHooks[hi].state.isSearching,
  );
  const canSearchAll = activeSlotHookIndices.every((hi) => !!cities[hi]) && !anySearching;
  const anyTriggered = activeSlotHookIndices.some((hi) => triggered[hi]);

  // Collect unique districts from all active slot results for FilterToolbar
  const districtSet = new Set<string>();
  for (const hi of activeSlotHookIndices) {
    for (const platform of allListingHooks[hi].state.platforms) {
      for (const listing of platform.listings) {
        if (listing.district) districtSet.add(listing.district);
      }
    }
  }
  const allDistricts = Array.from(districtSet).sort();

  // Flatten all listings for map pins (deduplicated by listing_url)
  const mapSeen = new Set<string>();
  const allMapListings: RentalListing[] = [];
  for (const hi of activeSlotHookIndices) {
    if (!triggered[hi]) continue;
    const filtered = sortListings(
      filterListings(allListingHooks[hi].state.platforms, filters),
      filters.sort,
    );
    for (const platform of filtered) {
      for (const listing of platform.listings) {
        if (listing.listing_url && mapSeen.has(listing.listing_url)) continue;
        if (listing.listing_url) mapSeen.add(listing.listing_url);
        allMapListings.push(listing);
      }
    }
  }

  // First triggered city for map centering
  let mapCity = 'hcmc';
  for (const hi of activeSlotHookIndices) {
    if (triggered[hi] && cities[hi]) {
      mapCity = cities[hi]!;
      break;
    }
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleCitySelect = (slotPos: number, city: string) => {
    if (anySearching) return;
    const hi = activeSlotHookIndices[slotPos];
    setCities((prev) => prev.map((c, i) => (i === hi ? city : c)));
    setTriggered((prev) => prev.map((t, i) => (i === hi ? false : t)));
  };

  const handleSearchAll = () => {
    if (!canSearchAll) return;
    setTriggered((prev) =>
      prev.map((t, i) => (activeSlotHookIndices.includes(i) ? true : t)),
    );
    setFilters(DEFAULT_FILTERS);
    activeSlotHookIndices.forEach((hi) => {
      allListingHooks[hi].search(cities[hi]!, useCache);
      allVibeHooks[hi].search(cities[hi]!, useCache);
    });
  };

  const handleCancelAll = () => {
    activeSlotHookIndices.forEach((hi) => {
      allListingHooks[hi].abort();
      allVibeHooks[hi].abort();
    });
  };

  const handleAddSlot = () => {
    if (slotCount >= MAX_SLOTS || anySearching) return;
    const used = new Set(activeSlotHookIndices);
    const freeHook = [0, 1, 2, 3].find((i) => !used.has(i));
    if (freeHook === undefined) return;
    // Reset data for the recycled hook so it starts clean
    setCities((prev) => prev.map((c, i) => (i === freeHook ? null : c)));
    setTriggered((prev) => prev.map((t, i) => (i === freeHook ? false : t)));
    setActiveSlotHookIndices((prev) => [...prev, freeHook]);
  };

  const handleRemoveSlot = (slotPos: number) => {
    if (slotCount <= 1 || anySearching) return;
    const hi = activeSlotHookIndices[slotPos];
    allListingHooks[hi].abort();
    allVibeHooks[hi].abort();
    setCities((prev) => prev.map((c, i) => (i === hi ? null : c)));
    setTriggered((prev) => prev.map((t, i) => (i === hi ? false : t)));
    setActiveSlotHookIndices((prev) => prev.filter((_, i) => i !== slotPos));
  };

  const handlePriceRange = (min: number | null, max: number | null) => {
    // (nonNull, null) = min changed; (null, nonNull) = max changed; (null, null) = field cleared
    if (min !== null) setFilters((prev) => ({ ...prev, priceMin: min }));
    else if (max === null) setFilters((prev) => ({ ...prev, priceMin: null }));
    if (max !== null) setFilters((prev) => ({ ...prev, priceMax: max }));
    else if (min === null) setFilters((prev) => ({ ...prev, priceMax: null }));
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white text-zinc-950 font-sans">
      <main className="container mx-auto max-w-7xl px-4 py-12 flex flex-col gap-8">

        {/* Header */}
        <div className="space-y-2 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight">🦈 District Rent Shark</h1>
          <p className="text-zinc-500 text-lg">
            English-first apartment hunting in Vietnam — trust scores, building rules, and neighborhood vibes.
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
                    type="button"
                    onClick={() => handleRemoveSlot(slotPos)}
                    disabled={anySearching}
                    className="text-xs text-zinc-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                  >
                    ✕ Remove
                  </button>
                )}
              </div>

              {/* City selection */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                  Choose a city
                </p>
                <div className="flex flex-wrap gap-2">
                  {CITIES.map((city) => (
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

            </div>
          ))}

          {/* Add another city */}
          {slotCount < MAX_SLOTS && (
            <button
              type="button"
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
                ? 'Choose a city to get started.'
                : 'Each search needs a city selected.'}
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

        {/* Filter toolbar — only when results exist */}
        {anyTriggered &&
          activeSlotHookIndices.some((hi) => allListingHooks[hi].state.platforms.length > 0) && (
            <FilterToolbar
              districts={allDistricts}
              onDistrictChange={(d) => setFilters((prev) => ({ ...prev, district: d }))}
              onPriceRange={handlePriceRange}
              onBedrooms={(b) => setFilters((prev) => ({ ...prev, bedrooms: b }))}
              onBathrooms={(b) => setFilters((prev) => ({ ...prev, bathrooms: b }))}
              onSortChange={(s) => setFilters((prev) => ({ ...prev, sort: s }))}
            />
          )}

        {/* Mobile map/list toggle — only when map token present and results exist */}
        {anyTriggered && HAS_MAP_TOKEN && (
          <div className="flex md:hidden gap-2">
            <Button
              variant={mobileView === 'map' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMobileView('map')}
            >
              🗺️ Map
            </Button>
            <Button
              variant={mobileView === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMobileView('list')}
            >
              📋 List
            </Button>
          </div>
        )}

        {/* Results area */}
        {anyTriggered ? (
          <div className={HAS_MAP_TOKEN ? 'flex flex-col md:flex-row gap-6' : ''}>

            {/* Map column — desktop: always visible; mobile: toggle */}
            {HAS_MAP_TOKEN && allMapListings.length > 0 && (
              <div
                className={`md:flex-1 md:sticky md:top-4 md:self-start ${
                  mobileView === 'list' ? 'hidden md:block' : ''
                }`}
              >
                <ListingMap
                  listings={allMapListings}
                  selectedId={selectedListingId}
                  onSelectListing={setSelectedListingId}
                  city={mapCity}
                />
              </div>
            )}

            {/* List column */}
            <div
              className={`${HAS_MAP_TOKEN ? 'md:flex-1' : 'w-full'} ${
                HAS_MAP_TOKEN && mobileView === 'map' ? 'hidden md:block' : ''
              } flex flex-col gap-12`}
            >
              {activeSlotHookIndices.map((hi) => {
                if (!triggered[hi]) return null;
                const listingHook = allListingHooks[hi];
                const vibeHook = allVibeHooks[hi];
                const filtered = sortListings(
                  filterListings(listingHook.state.platforms, filters),
                  filters.sort,
                );
                const totalListings = listingHook.state.platforms.reduce(
                  (sum, p) => sum + p.listings.length,
                  0,
                );
                const filteredListings = filtered.reduce(
                  (sum, p) => sum + p.listings.length,
                  0,
                );
                const noMatches = totalListings > 0 && filteredListings === 0;
                const cityLabel = cities[hi] ? CITY_LABELS[cities[hi]!] : '';

                return (
                  <div key={hi} className="space-y-4">

                    {/* Section divider — only in multi-slot mode */}
                    {slotCount > 1 && (
                      <div className="flex items-center gap-3">
                        <h2 className="text-base font-semibold text-zinc-700 shrink-0">
                          {cityLabel}
                        </h2>
                        <div className="flex-1 h-px bg-zinc-100" />
                      </div>
                    )}

                    {/* Progress bar */}
                    {(listingHook.state.isSearching || listingHook.state.progress.completed > 0) && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm text-zinc-600">
                          <span>
                            {listingHook.state.isSearching
                              ? 'Searching listings…'
                              : listingHook.state.cachedCount > 0 &&
                                  listingHook.state.cachedCount === listingHook.state.progress.total
                                ? '⚡ Instant results from cache'
                                : `Search complete — ${listingHook.state.elapsed || '0s'}`}
                          </span>
                          <span>
                            {listingHook.state.progress.completed}
                            {listingHook.state.progress.total
                              ? `/${listingHook.state.progress.total}`
                              : ''}{' '}
                            platforms
                            {listingHook.state.cachedCount > 0 &&
                              ` (${listingHook.state.cachedCount} cached)`}
                          </span>
                        </div>
                        <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-zinc-900 transition-all duration-500 ease-out"
                            style={{
                              width: `${
                                listingHook.state.progress.total > 0
                                  ? (listingHook.state.progress.completed /
                                      listingHook.state.progress.total) *
                                    100
                                  : listingHook.state.isSearching
                                    ? 5
                                    : 100
                              }%`,
                            }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Live browser agent iframes */}
                    {listingHook.state.streamingUrls.length > 0 && (
                      <LivePreviewGrid previews={listingHook.state.streamingUrls} />
                    )}

                    {/* Loading skeletons */}
                    {listingHook.state.isSearching && listingHook.state.platforms.length === 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-32 w-full rounded-xl" />
                        ))}
                      </div>
                    )}

                    {/* Listing error */}
                    {listingHook.state.error && (
                      <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
                        Error: {listingHook.state.error}
                      </div>
                    )}

                    {/* Vibe error */}
                    {vibeHook.state.error && (
                      <div className="p-4 bg-red-50 text-red-600 rounded-md border border-red-100">
                        Vibe error: {vibeHook.state.error}
                      </div>
                    )}

                    {/* Vibe cards — horizontal scroll row above listings */}
                    {vibeHook.state.vibes.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">
                          Neighborhood Vibes
                          {vibeHook.state.isSearching && ' — loading…'}
                        </p>
                        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                          {vibeHook.state.vibes.map((vibe) => (
                            <div
                              key={`${vibe.district}-${vibe.city}`}
                              className="min-w-[240px] max-w-[280px] shrink-0"
                            >
                              <VibeCard vibe={vibe} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Vibe loading skeleton */}
                    {vibeHook.state.isSearching && vibeHook.state.vibes.length === 0 && (
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {[1, 2, 3].map((i) => (
                          <Skeleton
                            key={i}
                            className="h-40 min-w-[240px] rounded-xl shrink-0"
                          />
                        ))}
                      </div>
                    )}

                    {/* No results from API */}
                    {!listingHook.state.isSearching &&
                      listingHook.state.elapsed &&
                      listingHook.state.platforms.length === 0 && (
                        <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
                          No listings found. Try another city or try again.
                        </div>
                      )}

                    {/* Filter mismatch */}
                    {noMatches && (
                      <div className="text-center py-8 text-zinc-500 border-2 border-dashed border-zinc-100 rounded-xl">
                        No listings match your filters. Try adjusting them.
                      </div>
                    )}

                    {/* Results */}
                    {filtered.length > 0 && <ResultsGrid platforms={filtered} />}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Initial empty state */
          <div className="text-center py-12 text-zinc-400 border-2 border-dashed border-zinc-100 rounded-xl">
            {!cities[activeSlotHookIndices[0]]
              ? 'Select a city to get started'
              : 'Ready — click Search to find apartments'}
          </div>
        )}

      </main>
    </div>
  );
}
