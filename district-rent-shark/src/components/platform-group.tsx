import type { PlatformResult } from '@/hooks/use-listing-search';
import { ListingCard } from './listing-card';
import { Zap } from 'lucide-react';

interface PlatformGroupProps {
  platform: PlatformResult;
}

export function PlatformGroup({ platform }: PlatformGroupProps) {
  return (
    <section className="space-y-6 py-8 border-b border-zinc-100 last:border-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            🏠 {platform.platform}
            <span className="text-lg font-normal text-zinc-500">— {platform.city}</span>
            {platform.source === 'cache' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                <Zap className="w-3 h-3" />
                Cached
              </span>
            )}
          </h2>
          <p className="text-sm text-zinc-500">
            {platform.listings.length} listing{platform.listings.length !== 1 ? 's' : ''} found
          </p>
        </div>
      </div>

      {platform.listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platform.listings.map((listing) => (
            <ListingCard key={listing.listing_url || `${listing.title_en}-${listing.district}`} listing={listing} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200 text-zinc-500">
          No listings found for this platform. Try adjusting your search.
        </div>
      )}
    </section>
  );
}
