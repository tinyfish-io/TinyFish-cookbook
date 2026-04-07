import type { PharmacyResult } from '@/lib/types';
import { ProductCard } from './product-card';
import { PharmacyBadge } from './pharmacy-badge';
import { Zap } from 'lucide-react';

const PHARMACY_DISPLAY_NAMES: Record<string, string> = {
  longchau:   'Long Châu',
  pharmacity: 'Pharmacity',
  ankhang:    'An Khang',
  guardian:   'Guardian',
  medicare:   'Medicare',
};

interface PharmacyGroupProps {
  result: PharmacyResult;
  pharmacyKey: string;
}

export function PharmacyGroup({ result, pharmacyKey }: PharmacyGroupProps) {
  const { products, error, source } = result;
  const displayName = PHARMACY_DISPLAY_NAMES[pharmacyKey.toLowerCase()] ?? result.pharmacy;
  const productCount = products.length;

  return (
    <section className="space-y-4 py-6 border-b border-zinc-100 last:border-0 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <PharmacyBadge pharmacyKey={pharmacyKey} pharmacyName={displayName} />
          <span className="text-sm text-zinc-500">
            {productCount} {productCount === 1 ? 'product' : 'products'}
          </span>
          {source === 'cache' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
              <Zap className="w-3 h-3" />
              Cached
            </span>
          )}
          {source === 'live' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600 border border-orange-200">
              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse inline-block" />
              Live
            </span>
          )}
        </div>
      </div>

      {error ? (
        <div className="p-4 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
          Error: {error}
        </div>
      ) : productCount === 0 ? (
        <div className="p-8 text-center bg-zinc-50 rounded-xl border border-dashed border-zinc-200 text-zinc-500 text-sm">
          No products found at {displayName}.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <ProductCard
              key={`${product.product_name}-${product.original_price ?? 'null'}-${product.dosage_form}`}
              product={product}
              pharmacyName={result.pharmacy}
            />
          ))}
        </div>
      )}
    </section>
  );
}
