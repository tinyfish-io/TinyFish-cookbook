'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { t } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';
import type { Property } from '@/hooks/use-property-search';
import { Home } from 'lucide-react';

// Format VND price for display when price_display is not available
function formatVND(price: number, listingType: 'rent' | 'buy'): string {
  if (listingType === 'buy') {
    if (price >= 1_000_000_000) return `${(price / 1_000_000_000).toFixed(1)} ty`;
    if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(0)} trieu`;
    return `${price.toLocaleString('vi-VN')} d`;
  }
  if (price >= 1_000_000) return `${(price / 1_000_000).toFixed(1)} tr/thang`;
  return `${price.toLocaleString('vi-VN')} d/thang`;
}

interface PropertyCardProps {
  property: Property;
  source: string;
  locale: Locale;
}

export function PropertyCard({ property, source, locale }: PropertyCardProps) {
  const priceText =
    property.price_display ||
    (property.price_vnd != null
      ? formatVND(property.price_vnd, property.listing_type)
      : t(locale, 'contact'));

  const cardContent = (
    <Card className="h-full overflow-hidden bg-white/90 backdrop-blur-sm border-teal-50 hover:shadow-lg hover:border-teal-200 transition-all duration-200 cursor-pointer">
      {/* Image */}
      <div className="relative w-full h-40 bg-teal-50 overflow-hidden shrink-0">
        {property.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={property.image_url}
            alt={property.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-teal-200">
            <Home className="w-10 h-10" />
          </div>
        )}
        {/* Source badge overlay */}
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs bg-teal-50 text-teal-700 border border-teal-200 shadow-sm">
            {source}
          </Badge>
        </div>
      </div>

      <CardContent className="p-3 space-y-1.5">
        {/* Title */}
        <p className="text-sm font-semibold text-[#134E4A] line-clamp-2 leading-snug">
          {property.title}
        </p>

        {/* Price */}
        <p className="text-base font-bold text-teal-700">
          {priceText}
        </p>

        {/* Area + bedrooms/bathrooms */}
        <div className="flex items-center gap-3 text-xs text-teal-600/70">
          {property.area_sqm != null && (
            <span>{property.area_sqm} m2</span>
          )}
          {(property.bedrooms != null || property.bathrooms != null) && (
            <span>
              {property.bedrooms != null && `${property.bedrooms} ${t(locale, 'bedrooms')}`}
              {property.bedrooms != null && property.bathrooms != null && ' . '}
              {property.bathrooms != null && `${property.bathrooms} ${t(locale, 'bathrooms')}`}
            </span>
          )}
        </div>

        {/* Address */}
        {property.address && (
          <p className="text-xs text-teal-500/60 truncate">{property.address}</p>
        )}
      </CardContent>
    </Card>
  );

  if (property.detail_url) {
    return (
      <a href={property.detail_url} target="_blank" rel="noopener noreferrer" className="block h-full">
        {cardContent}
      </a>
    );
  }

  return <div className="h-full">{cardContent}</div>;
}
