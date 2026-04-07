'use client';

import { cn } from '@/lib/utils';

const BEDROOM_OPTIONS = [
  { value: 'any', label: 'Beds' },
  { value: '0', label: 'Studio' },
  { value: '1', label: '1 bed' },
  { value: '2', label: '2 beds' },
  { value: '3', label: '3+ beds' },
];

const BATHROOM_OPTIONS = [
  { value: 'any', label: 'Baths' },
  { value: '1', label: '1 bath' },
  { value: '2', label: '2+ baths' },
];

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'price_asc', label: 'Price ↑' },
  { value: 'price_desc', label: 'Price ↓' },
  { value: 'newest', label: 'Newest' },
];

const selectCls = cn(
  'h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900',
  'focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1 cursor-pointer',
);

const inputCls = cn(
  'h-9 w-24 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900',
  'focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1',
  'placeholder:text-zinc-400',
);

interface FilterToolbarProps {
  districts: string[];
  onDistrictChange: (district: string) => void;
  onPriceRange: (min: number | null, max: number | null) => void;
  onBedrooms: (bedrooms: string) => void;
  onBathrooms: (bathrooms: string) => void;
  onSortChange: (sort: string) => void;
}

export function FilterToolbar({
  districts,
  onDistrictChange,
  onPriceRange,
  onBedrooms,
  onBathrooms,
  onSortChange,
}: FilterToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-zinc-50 rounded-xl border border-zinc-200">
      <select
        className={cn(selectCls, 'w-40')}
        defaultValue="any"
        onChange={(e) => onDistrictChange(e.target.value)}
      >
        <option value="any">All Districts</option>
        {districts.map((d) => (
          <option key={d} value={d}>
            {d}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1.5">
        <input
          type="number"
          placeholder="Min M₫"
          className={inputCls}
          min={0}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value ? Number(e.target.value) * 1_000_000 : null;
            onPriceRange(val, null);
          }}
        />
        <span className="text-zinc-400 text-sm">–</span>
        <input
          type="number"
          placeholder="Max M₫"
          className={inputCls}
          min={0}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value ? Number(e.target.value) * 1_000_000 : null;
            onPriceRange(null, val);
          }}
        />
      </div>

      <select
        className={cn(selectCls, 'w-28')}
        defaultValue="any"
        onChange={(e) => onBedrooms(e.target.value)}
      >
        {BEDROOM_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className={cn(selectCls, 'w-28')}
        defaultValue="any"
        onChange={(e) => onBathrooms(e.target.value)}
      >
        {BATHROOM_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <select
        className={cn(selectCls, 'w-32')}
        defaultValue="relevance"
        onChange={(e) => onSortChange(e.target.value)}
      >
        {SORT_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
