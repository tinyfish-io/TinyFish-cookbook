'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { SearchParams } from '@/lib/sites';
import { Search, X } from 'lucide-react';

interface SearchFormProps {
  onSearch: (params: SearchParams) => void;
  onCancel: () => void;
  isSearching: boolean;
  locale: Locale;
}

type ListingType = 'rent' | 'buy';
type PropertyType = 'apartment' | 'house' | 'land' | 'room' | 'all';

const PROPERTY_TYPE_KEYS: { value: PropertyType; key: 'apartment' | 'house' | 'land' | 'room' | 'all' }[] = [
  { value: 'apartment', key: 'apartment' },
  { value: 'house', key: 'house' },
  { value: 'land', key: 'land' },
  { value: 'room', key: 'room' },
  { value: 'all', key: 'all' },
];

// Price presets in VND
const BUY_PRESETS = [
  { label: '< 1 ty', min: undefined, max: 1_000_000_000 },
  { label: '1-3 ty', min: 1_000_000_000, max: 3_000_000_000 },
  { label: '3-5 ty', min: 3_000_000_000, max: 5_000_000_000 },
  { label: '> 5 ty', min: 5_000_000_000, max: undefined },
];

const RENT_PRESETS = [
  { label: '< 5 tr', min: undefined, max: 5_000_000 },
  { label: '5-10 tr', min: 5_000_000, max: 10_000_000 },
  { label: '10-20 tr', min: 10_000_000, max: 20_000_000 },
  { label: '> 20 tr', min: 20_000_000, max: undefined },
];

export function SearchForm({ onSearch, onCancel, isSearching, locale }: SearchFormProps) {
  const [location, setLocation] = useState('');
  const [listingType, setListingType] = useState<ListingType>('buy');
  const [propertyType, setPropertyType] = useState<PropertyType>('all');
  const [priceMin, setPriceMin] = useState('');
  const [priceMax, setPriceMax] = useState('');

  const presets = listingType === 'buy' ? BUY_PRESETS : RENT_PRESETS;

  function applyPreset(min: number | undefined, max: number | undefined) {
    setPriceMin(min !== undefined ? String(min) : '');
    setPriceMax(max !== undefined ? String(max) : '');
  }

  function handleListingTypeChange(type: ListingType) {
    setListingType(type);
    setPriceMin('');
    setPriceMax('');
  }

  function handleSubmit() {
    if (!location.trim() || isSearching) return;
    const params: SearchParams = {
      location: location.trim(),
      listingType,
      propertyType,
      priceMin: priceMin ? Number(priceMin) : undefined,
      priceMax: priceMax ? Number(priceMax) : undefined,
    };
    onSearch(params);
  }

  const activeBtn = 'bg-teal-600 hover:bg-teal-700 text-white border-teal-600';
  const inactiveBtn = 'border-teal-200 text-teal-700 hover:bg-teal-50';

  return (
    <div className="bg-white/80 backdrop-blur-sm border border-teal-100 rounded-xl p-5 space-y-5">

      {/* Location */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-teal-500 uppercase tracking-wide">
          {t(locale, 'searchLabel')}
        </label>
        <Input
          type="text"
          placeholder={t(locale, 'searchPlaceholder')}
          value={location}
          onChange={e => setLocation(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
          disabled={isSearching}
        />
      </div>

      {/* Listing type toggle */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-teal-500 uppercase tracking-wide">
          {t(locale, 'listingTypeLabel')}
        </label>
        <div className="flex gap-2">
          {(['buy', 'rent'] as ListingType[]).map(type => (
            <Button
              key={type}
              variant="outline"
              size="sm"
              className={listingType === type ? activeBtn : inactiveBtn}
              onClick={() => handleListingTypeChange(type)}
              disabled={isSearching}
            >
              {t(locale, type)}
            </Button>
          ))}
        </div>
      </div>

      {/* Property type */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-teal-500 uppercase tracking-wide">
          {t(locale, 'propertyTypeLabel')}
        </label>
        <div className="flex flex-wrap gap-2">
          {PROPERTY_TYPE_KEYS.map(pt => (
            <Button
              key={pt.value}
              variant="outline"
              size="sm"
              className={propertyType === pt.value ? activeBtn : inactiveBtn}
              onClick={() => setPropertyType(pt.value)}
              disabled={isSearching}
            >
              {t(locale, pt.key)}
            </Button>
          ))}
        </div>
      </div>

      {/* Price range */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-teal-500 uppercase tracking-wide">
          {t(locale, 'priceLabel')}
        </label>
        <div className="flex gap-3">
          <Input
            type="number"
            placeholder={t(locale, 'priceFrom')}
            value={priceMin}
            onChange={e => setPriceMin(e.target.value)}
            disabled={isSearching}
          />
          <Input
            type="number"
            placeholder={t(locale, 'priceTo')}
            value={priceMax}
            onChange={e => setPriceMax(e.target.value)}
            disabled={isSearching}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {presets.map(preset => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.min, preset.max)}
              disabled={isSearching}
              className="text-xs px-2.5 py-1 rounded-full border border-teal-200 text-teal-700 hover:border-teal-400 hover:text-teal-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={!location.trim() || isSearching}
          className="h-11 px-6 bg-[#0369A1] hover:bg-[#0c4a6e] text-white"
        >
          {isSearching ? (
            t(locale, 'searching')
          ) : (
            <span className="flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              {t(locale, 'search')}
            </span>
          )}
        </Button>
        {isSearching && (
          <Button
            variant="outline"
            onClick={onCancel}
            className="h-11 px-5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
          >
            <span className="flex items-center gap-1.5">
              <X className="w-4 h-4" />
              {t(locale, 'cancel')}
            </span>
          </Button>
        )}
      </div>
    </div>
  );
}
