import type { PharmacyProduct } from '@/lib/types';
import { formatVND } from '@/lib/normalize';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

const DOSAGE_COLORS: Record<PharmacyProduct['dosage_form'], string> = {
  tablet:   'bg-blue-100 text-blue-700',
  capsule:  'bg-purple-100 text-purple-700',
  syrup:    'bg-amber-100 text-amber-700',
  cream:    'bg-pink-100 text-pink-700',
  sachet:   'bg-teal-100 text-teal-700',
  tube:     'bg-orange-100 text-orange-700',
  bottle:   'bg-cyan-100 text-cyan-700',
  other:    'bg-zinc-100 text-zinc-600',
};

const DOSAGE_LABELS: Record<PharmacyProduct['dosage_form'], string> = {
  tablet:   'Tablet',
  capsule:  'Capsule',
  syrup:    'Syrup',
  cream:    'Cream',
  sachet:   'Sachet',
  tube:     'Tube',
  bottle:   'Bottle',
  other:    'Other',
};

interface ProductCardProps {
  product: PharmacyProduct;
  pharmacyName: string;
}

export function ProductCard({ product, pharmacyName }: ProductCardProps) {
  const href = product.product_url || null;
  const effectivePrice = product.sale_price ?? product.original_price;
  const hasSale = product.sale_price !== null && product.original_price !== null && product.sale_price < product.original_price;

  const stockConfig = {
    in_stock:             { dot: 'bg-green-500',  text: 'text-green-600',  label: 'In Stock' },
    out_of_stock:         { dot: 'bg-red-500',    text: 'text-red-500',    label: 'Out of Stock' },
    prescription_required:{ dot: 'bg-yellow-500', text: 'text-yellow-600', label: 'Rx Required' },
    limited:              { dot: 'bg-orange-500', text: 'text-orange-600', label: 'Limited' },
  }[product.stock_status];

  const card = (
    <Card className={`flex flex-col h-full overflow-hidden transition-shadow duration-200 ${href ? 'hover:shadow-lg hover:ring-2 hover:ring-zinc-200 cursor-pointer' : 'hover:shadow-md'}`}>
      <CardHeader className="p-4 pb-2 space-y-1">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-semibold leading-snug line-clamp-2 flex items-center gap-1.5">
            {product.product_name}
            {href && (
              <ExternalLink className="w-3 h-3 shrink-0 text-zinc-400" />
            )}
          </CardTitle>
          <Badge className={`${DOSAGE_COLORS[product.dosage_form]} border-none text-xs shrink-0`}>
            {DOSAGE_LABELS[product.dosage_form]}
          </Badge>
        </div>
        {product.brand && (
          <p className="text-xs text-zinc-500 font-medium">{product.brand}</p>
        )}
        {product.quantity && (
          <p className="text-xs text-zinc-400">{product.quantity}</p>
        )}
      </CardHeader>

      <CardContent className="p-4 pt-2 flex-grow space-y-2">
        {effectivePrice !== null ? (
          <div className="space-y-0.5">
            {hasSale && product.original_price !== null && (
              <div className="text-xs text-zinc-400 line-through">
                {formatVND(product.original_price)}
              </div>
            )}
            <div className="flex items-baseline gap-1">
              <span className={`text-xl font-bold ${hasSale ? 'text-red-600' : 'text-zinc-900'}`}>
                {formatVND(effectivePrice)}
              </span>
            </div>
            {product.price_per_unit !== null && product.price_unit && (
              <p className="text-xs text-zinc-400">
                {formatVND(product.price_per_unit)}/{product.price_unit}
              </p>
            )}
          </div>
        ) : (
          <div className="text-sm text-zinc-400 italic">Contact for price</div>
        )}

        {product.promo_badge && (
          <Badge variant="destructive" className="text-xs">
            {product.promo_badge}
          </Badge>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 mt-auto">
        <div className={`text-xs font-medium flex items-center gap-1.5 ${stockConfig.text}`}>
          <span className={`w-2 h-2 rounded-full shrink-0 ${stockConfig.dot} ${product.stock_status === 'in_stock' ? 'animate-pulse' : ''}`} />
          {stockConfig.label}
        </div>
      </CardFooter>
    </Card>
  );

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
        aria-label={`View ${product.product_name} at ${pharmacyName}`}
      >
        {card}
      </a>
    );
  }

  return card;
}
