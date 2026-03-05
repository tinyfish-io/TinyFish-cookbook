import { BikeShop } from '@/hooks/use-bike-search';
import { BikeCard } from './bike-card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Zap } from 'lucide-react';

function getHostname(url: string): string {
  try {
    return new URL(url).hostname || url;
  } catch {
    return url;
  }
}

interface ShopGroupProps {
  shop: BikeShop;
}

export function ShopGroup({ shop }: ShopGroupProps) {
  return (
    <section className="space-y-6 py-8 border-b border-zinc-100 last:border-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 flex items-center gap-2">
            🏪 {shop.shop_name}
            <span className="text-lg font-normal text-zinc-500">— {shop.city}</span>
            {shop.source === 'cache' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                <Zap className="w-3 h-3" />
                Cached
              </span>
            )}
          </h2>
          <a 
            href={shop.website} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:underline flex items-center gap-1 w-fit"
          >
            {getHostname(shop.website)}
            <ExternalLink className="w-3 h-3" />
          </a>
          {shop.notes && (
            <p className="text-sm text-zinc-500 italic max-w-2xl">
              {shop.notes}
            </p>
          )}
        </div>
        
        <Button asChild variant="outline" className="shrink-0">
          <a href={shop.website} target="_blank" rel="noopener noreferrer">
            Book at {shop.shop_name} →
          </a>
        </Button>
      </div>

      {shop.bikes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shop.bikes.map((bike, index) => (
            <BikeCard key={`${bike.name}-${index}`} bike={bike} shopWebsite={shop.website} />
          ))}
        </div>
      ) : (
        <div className="p-8 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200 text-zinc-500">
          No pricing found for this shop. Check their website directly.
        </div>
      )}
    </section>
  );
}
