import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Zap } from 'lucide-react';
import { DealBadge } from './deal-badge';
import type { Venue, Deal, DealItem } from '@/lib/types';

const DISTRICT_LABELS: Record<string, string> = {
  d1: 'District 1',
  thao_dien: 'Thảo Điền',
  d3: 'District 3',
};

const DAY_ABBR: Record<string, string> = {
  monday: 'Mon', tuesday: 'Tue', wednesday: 'Wed',
  thursday: 'Thu', friday: 'Fri', saturday: 'Sat', sunday: 'Sun',
};

function formatVnd(price: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(price)}₫`;
}

function DealItemRow({ item }: { item: DealItem }) {
  return (
    <div className="flex items-baseline justify-between gap-2 text-sm py-0.5">
      <span className="text-zinc-700">{item.item}</span>
      <span className="text-zinc-500 shrink-0">
        {item.promo_price !== null ? (
          <>
            <span className="font-semibold text-zinc-900">{formatVnd(item.promo_price)}</span>
            {item.regular_price !== null && (
              <span className="line-through text-zinc-400 text-xs ml-1.5">{formatVnd(item.regular_price)}</span>
            )}
          </>
        ) : item.regular_price !== null ? (
          <span>{formatVnd(item.regular_price)}</span>
        ) : null}
      </span>
    </div>
  );
}

function DealCard({ deal }: { deal: Deal }) {
  const timeWindow =
    deal.time_start && deal.time_end
      ? `${deal.time_start} – ${deal.time_end}`
      : deal.time_start
      ? `From ${deal.time_start}`
      : null;

  return (
    <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
      <div className="flex items-start gap-2 flex-wrap">
        <DealBadge type={deal.type} />
        <span className="font-semibold text-sm text-zinc-900 leading-snug">{deal.deal_name}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {deal.day_of_week.map((day) => (
          <span
            key={day}
            className="rounded-full bg-zinc-200 text-zinc-600 text-xs font-medium px-2 py-0.5"
          >
            {DAY_ABBR[day.toLowerCase()] ?? day}
          </span>
        ))}
        {timeWindow && (
          <span className="text-xs text-zinc-500 font-medium ml-1">{timeWindow}</span>
        )}
      </div>

      {deal.description && (
        <p className="text-sm text-zinc-600">{deal.description}</p>
      )}

      {deal.items.length > 0 && (
        <div className="divide-y divide-zinc-100 rounded-lg border border-zinc-100 bg-white px-3 py-1">
          {deal.items.map((item) => (
            <DealItemRow key={item.item} item={item} />
          ))}
        </div>
      )}

      {deal.conditions && (
        <p className="text-xs text-zinc-400 italic">{deal.conditions}</p>
      )}
    </div>
  );
}

interface VenueCardProps {
  venue: Venue;
}

export function VenueCard({ venue }: VenueCardProps) {
  const districtLabel = DISTRICT_LABELS[venue.district] ?? venue.district;
  const isLive = venue.source === 'live';
  const isCached = venue.source === 'cache';

  return (
    <Card className="overflow-hidden transition-shadow duration-200 hover:shadow-md">
      <CardHeader className="p-5 pb-4 space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <CardTitle className="text-xl font-bold text-zinc-900">{venue.name}</CardTitle>
              {isLive && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700 border border-green-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
                  Live
                </span>
              )}
              {isCached && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200">
                  <Zap className="w-3 h-3" />
                  Cached
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">
              {districtLabel}
              {venue.address ? ` · ${venue.address}` : ''}
            </p>
            <a
              href={venue.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
            >
              {venue.website}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <Button asChild variant="outline" className="shrink-0 self-start sm:self-auto">
            <a href={venue.website} target="_blank" rel="noopener noreferrer">
              Visit Website →
            </a>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 pt-0">
        {venue.deals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {venue.deals.map((deal) => (
              <DealCard key={deal.deal_name} deal={deal} />
            ))}
          </div>
        ) : (
          <div className="p-8 text-center rounded-xl border border-dashed border-zinc-200 text-zinc-500">
            No deals found on website
          </div>
        )}
      </CardContent>
    </Card>
  );
}
