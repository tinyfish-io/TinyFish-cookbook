'use client';

import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { usePropertySearch } from '@/hooks/use-property-search';
import type { Property } from '@/hooks/use-property-search';
import { SearchForm } from '@/components/search-form';
import { ResultsGrid } from '@/components/results-grid';
import { LivePreviewGrid } from '@/components/live-preview-grid';
import MapViewWrapper from '@/components/map-view-wrapper';
import { batchGeocode } from '@/lib/geocode';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { SearchParams } from '@/lib/sites';
import { Building2, Languages, Zap, Radio } from 'lucide-react';

export default function Home() {
  const { state, search, abort } = usePropertySearch();
  const [useCache, setUseCache] = useState(false);
  const [geoProperties, setGeoProperties] = useState<Property[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locale, setLocale] = useState<Locale>('vi');

  const hasResults = state.results.length > 0;
  const hasStreamingUrls = state.streamingUrls.length > 0;
  const isTriggered = state.isSearching || hasResults || !!state.error || !!state.elapsed;

  function handleSearch(params: SearchParams) {
    setGeoProperties([]);
    search({ ...params, useCache } as SearchParams & { useCache?: boolean });
  }

  const progressPct =
    state.progress.total > 0
      ? (state.progress.completed / state.progress.total) * 100
      : state.isSearching ? 5 : 100;

  useEffect(() => {
    if (state.isSearching || state.results.length === 0) return;
    const controller = new AbortController();
    setIsGeocoding(true);

    const addresses = state.results
      .flatMap(r => r.listings.map(l => l.address))
      .filter(Boolean);

    batchGeocode(addresses, controller.signal).then(geoMap => {
      if (controller.signal.aborted) return;
      const withGeo = state.results
        .flatMap(r =>
          r.listings.map(l => {
            const geo = geoMap.get(l.address);
            return geo ? { ...l, lat: geo.lat, lng: geo.lng } : l;
          })
        )
        .filter(p => typeof p.lat === 'number' && typeof p.lng === 'number' && isFinite(p.lat) && isFinite(p.lng));
      setGeoProperties(withGeo);
      setIsGeocoding(false);
    });

    return () => controller.abort();
  }, [state.isSearching, state.results]);

  return (
    <div className="min-h-screen bg-[#F0FDFA] text-[#134E4A] font-sans">
      <main className="container mx-auto max-w-7xl px-4 py-12 flex flex-col gap-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
              <Building2 className="w-8 h-8 text-teal-600" />
              {t(locale, 'title')}
            </h1>
            <p className="text-teal-600/70 text-lg">
              {t(locale, 'subtitle')}
            </p>
          </div>
          <button
            onClick={() => setLocale(l => l === 'vi' ? 'en' : 'vi')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 bg-white/80 backdrop-blur-sm text-sm font-medium text-teal-700 hover:bg-teal-50 hover:border-teal-300 transition-colors"
          >
            <Languages className="w-4 h-4" />
            {locale === 'vi' ? 'EN' : 'VI'}
          </button>
        </div>

        {/* Search form */}
        <SearchForm
          onSearch={handleSearch}
          onCancel={abort}
          isSearching={state.isSearching}
          locale={locale}
        />

        {/* Cache toggle */}
        <div className="flex items-center gap-3">
          <Switch
            id="cache-toggle"
            checked={useCache}
            onCheckedChange={setUseCache}
            disabled={state.isSearching}
          />
          <label htmlFor="cache-toggle" className="text-sm text-teal-600 cursor-pointer select-none flex items-center gap-1.5">
            {useCache ? (
              <><Zap className="w-3.5 h-3.5" /> {t(locale, 'cacheOn')}</>
            ) : (
              <><Radio className="w-3.5 h-3.5" /> {t(locale, 'cacheOff')}</>
            )}
          </label>
        </div>

        {/* Progress bar */}
        {isTriggered && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-teal-600">
              <span>
                {state.isSearching
                  ? t(locale, 'searchingStatus')
                  : state.elapsed
                    ? `${t(locale, 'complete')} — ${state.elapsed}`
                    : ''}
              </span>
              {(state.progress.completed > 0 || state.progress.total > 0) && (
                <span>
                  {state.progress.completed}
                  {state.progress.total > 0 ? `/${state.progress.total}` : ''} {t(locale, 'websites')}
                </span>
              )}
            </div>
            {(state.isSearching || state.elapsed) && (
              <div className="h-2 w-full bg-teal-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 transition-all duration-500 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
          </div>
        )}

        {/* Live preview iframes */}
        {hasStreamingUrls && (
          <LivePreviewGrid previews={state.streamingUrls} locale={locale} />
        )}

        {/* Loading skeletons */}
        {state.isSearching && !hasResults && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Skeleton key={i} className="h-56 w-full rounded-xl" />
            ))}
          </div>
        )}

        {/* Error state */}
        {state.error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">
            {t(locale, 'error')}: {state.error}
          </div>
        )}

        {/* Empty state */}
        {!isTriggered && (
          <div className="text-center py-16 text-teal-400 border-2 border-dashed border-teal-100 rounded-xl">
            {t(locale, 'emptyState')}
          </div>
        )}

        {/* No results after search */}
        {!state.isSearching && state.elapsed && !hasResults && !state.error && (
          <div className="text-center py-16 text-teal-400 border-2 border-dashed border-teal-100 rounded-xl">
            {t(locale, 'noResults')}
          </div>
        )}

        {/* Results + Map */}
        {hasResults && (
          <div className="flex flex-col lg:flex-row gap-6">
            <div className="flex-1 min-w-0">
              <ResultsGrid results={state.results} locale={locale} />
            </div>
            <div className="w-full lg:w-[450px] lg:sticky lg:top-4 lg:self-start order-first lg:order-last">
              <div className="h-[300px] lg:h-[600px] rounded-xl overflow-hidden border border-teal-200">
                {isGeocoding ? (
                  <div className="h-full flex items-center justify-center text-teal-400 text-sm">
                    {t(locale, 'geocoding')}
                  </div>
                ) : (
                  <MapViewWrapper properties={geoProperties} locale={locale} />
                )}
              </div>
              {geoProperties.length > 0 && (
                <p className="text-xs text-teal-400 mt-2 text-center">
                  {geoProperties.length} {t(locale, 'mapResults')}
                </p>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
