import type { RentalListing } from '@/hooks/use-listing-search';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, BedDouble, Bath, Maximize2, MapPin, Image as ImageIcon } from 'lucide-react';
import { TrustBadge } from './trust-badge';
import { BuildingRulesPills } from './building-rules';
import { cn } from '@/lib/utils';

interface ListingCardProps {
  listing: RentalListing;
  isHighlighted?: boolean;
}

function formatPrice(vnd: number | null, negotiable: boolean): string {
  if (vnd === null) return negotiable ? 'Negotiable' : 'Price on request';
  const millions = vnd / 1_000_000;
  if (millions >= 1) {
    return `${millions % 1 === 0 ? millions.toFixed(0) : millions.toFixed(1)}M ₫/mo`;
  }
  return `${(vnd / 1000).toFixed(0)}K ₫/mo`;
}

export function ListingCard({ listing, isHighlighted = false }: ListingCardProps) {
  const href = listing.listing_url || null;

  const card = (
    <Card
      className={cn(
        'flex flex-col h-full overflow-hidden transition-all duration-200',
        href ? 'hover:shadow-lg hover:ring-2 hover:ring-zinc-200 cursor-pointer' : 'hover:shadow-md',
        isHighlighted && 'ring-2 ring-blue-500 shadow-md',
      )}
    >
      <div className="relative w-full h-40 bg-zinc-100 overflow-hidden shrink-0">
        {listing.thumbnail_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.thumbnail_url}
            alt={listing.title_en}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-300">
            <ImageIcon className="w-8 h-8" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <TrustBadge
            posterType={listing.poster_type}
            trustSignals={listing.trust_signals}
          />
        </div>
      </div>

      <CardHeader className="p-4 pb-2 space-y-1">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-sm font-bold leading-tight line-clamp-2 flex items-center gap-1.5">
            {listing.title_en}
            {href && <ExternalLink className="w-3 h-3 shrink-0 text-zinc-400" />}
          </CardTitle>
        </div>
        <p className="text-xl font-bold text-zinc-900">
          {formatPrice(listing.price_vnd_monthly, listing.negotiable)}
        </p>
      </CardHeader>

      <CardContent className="p-4 pt-0 flex-grow space-y-3">
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
          {listing.area_m2 && (
            <span className="flex items-center gap-1">
              <Maximize2 className="w-3 h-3" />
              {listing.area_m2}m²
            </span>
          )}
          {listing.bedrooms !== null && (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3 h-3" />
              {listing.bedrooms === 0 ? 'Studio' : `${listing.bedrooms} bed`}
            </span>
          )}
          {listing.bathrooms !== null && (
            <span className="flex items-center gap-1">
              <Bath className="w-3 h-3" />
              {listing.bathrooms} bath
            </span>
          )}
        </div>

        {listing.district && (
          <div className="flex items-center gap-1 text-xs text-zinc-500">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{listing.district}</span>
          </div>
        )}

        <BuildingRulesPills rules={listing.building_rules} />

        {listing.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {listing.amenities.slice(0, 3).map((amenity) => (
              <Badge
                key={amenity}
                variant="secondary"
                className="text-xs px-1.5 py-0"
              >
                {amenity}
              </Badge>
            ))}
            {listing.amenities.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                +{listing.amenities.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block group">
        {card}
      </a>
    );
  }

  return card;
}
