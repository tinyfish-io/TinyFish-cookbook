'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PropertyCard } from '@/components/property-card';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { PropertyListing, Property } from '@/hooks/use-property-search';

type SortOrder = 'default' | 'price-asc' | 'price-desc' | 'area-desc';

const SORT_KEYS: { value: SortOrder; key: 'sortDefault' | 'sortPriceAsc' | 'sortPriceDesc' | 'sortAreaDesc' }[] = [
  { value: 'default', key: 'sortDefault' },
  { value: 'price-asc', key: 'sortPriceAsc' },
  { value: 'price-desc', key: 'sortPriceDesc' },
  { value: 'area-desc', key: 'sortAreaDesc' },
];

interface FlatListing {
  property: Property;
  source: string;
}

function flattenListings(results: PropertyListing[]): FlatListing[] {
  return results.flatMap(r =>
    r.listings.map(property => ({ property, source: r.source }))
  );
}

function sortListings(items: FlatListing[], order: SortOrder): FlatListing[] {
  if (order === 'default') return items;
  return [...items].sort((a, b) => {
    if (order === 'price-asc') {
      return (a.property.price_vnd ?? Infinity) - (b.property.price_vnd ?? Infinity);
    }
    if (order === 'price-desc') {
      return (b.property.price_vnd ?? -Infinity) - (a.property.price_vnd ?? -Infinity);
    }
    if (order === 'area-desc') {
      return (b.property.area_sqm ?? 0) - (a.property.area_sqm ?? 0);
    }
    return 0;
  });
}

interface ResultsGridProps {
  results: PropertyListing[];
  locale: Locale;
}

export function ResultsGrid({ results, locale }: ResultsGridProps) {
  const [sortOrder, setSortOrder] = useState<SortOrder>('default');

  const flat = flattenListings(results);
  const sorted = sortListings(flat, sortOrder);
  const sourceCount = results.length;
  const totalCount = flat.length;

  if (totalCount === 0) return null;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 bg-white/80 backdrop-blur-sm rounded-xl border border-teal-100">
        <p className="text-sm text-teal-600">
          <span className="font-semibold text-[#134E4A]">{totalCount}</span> {t(locale, 'results')}{' '}
          <span className="font-semibold text-[#134E4A]">{sourceCount}</span> {t(locale, 'pages')}
        </p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs font-semibold text-teal-400 uppercase tracking-wide mr-1">
            {t(locale, 'sortLabel')}
          </span>
          {SORT_KEYS.map(opt => (
            <Button
              key={opt.value}
              variant="outline"
              size="sm"
              className={`h-7 text-xs ${
                sortOrder === opt.value
                  ? 'bg-teal-600 text-white border-teal-600 hover:bg-teal-700'
                  : 'border-teal-200 text-teal-700 hover:bg-teal-50'
              }`}
              onClick={() => setSortOrder(opt.value)}
            >
              {t(locale, opt.key)}
            </Button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((item, idx) => (
          <PropertyCard
            key={`${item.source}-${idx}`}
            property={item.property}
            source={item.source}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}
