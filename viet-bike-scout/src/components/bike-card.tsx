import { Bike } from '@/hooks/use-bike-search';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

interface BikeCardProps {
  bike: Bike;
  shopWebsite: string;
}

export function BikeCard({ bike, shopWebsite }: BikeCardProps) {
  const typeColors = {
    scooter: 'bg-blue-500 hover:bg-blue-600',
    'semi-auto': 'bg-green-500 hover:bg-green-600',
    manual: 'bg-orange-500 hover:bg-orange-600',
    adventure: 'bg-purple-500 hover:bg-purple-600',
  };

  const formatPrice = (price: number | null, currency: string) => {
    if (price === null) return null;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const href = bike.url || shopWebsite || null;

  const card = (
    <Card className={`flex flex-col h-full overflow-hidden transition-shadow duration-200 ${href ? 'hover:shadow-lg hover:ring-2 hover:ring-zinc-200 cursor-pointer' : 'hover:shadow-md'}`}>
      <CardHeader className="p-4 pb-2 space-y-1">
        <div className="flex justify-between items-start gap-2">
          <CardTitle className="text-lg font-bold leading-tight line-clamp-2 flex items-center gap-1.5">
            {bike.name}
            {href && (
              <ExternalLink className={`w-3.5 h-3.5 shrink-0 ${bike.available ? 'text-zinc-400 group-hover:text-zinc-600' : 'text-zinc-300 opacity-50'}`} />
            )}
          </CardTitle>
          <Badge className={`${typeColors[bike.type] || 'bg-zinc-500'} shrink-0 text-white border-none`}>
            {bike.type}
          </Badge>
        </div>
        {bike.engine_cc && (
          <p className="text-sm text-zinc-500 font-medium">{bike.engine_cc}cc</p>
        )}
      </CardHeader>
      
      <CardContent className="p-4 pt-2 flex-grow space-y-3">
        <div className="space-y-1">
          {bike.price_daily_usd ? (
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-zinc-900">
                {formatPrice(bike.price_daily_usd, bike.currency)}
              </span>
              <span className="text-sm text-zinc-500">/day</span>
            </div>
          ) : (
            <div className="text-sm text-zinc-400 italic">Price on request</div>
          )}
          
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-zinc-500">
            {bike.price_weekly_usd && (
              <span>{formatPrice(bike.price_weekly_usd, bike.currency)}/wk</span>
            )}
            {bike.price_monthly_usd && (
              <span>{formatPrice(bike.price_monthly_usd, bike.currency)}/mo</span>
            )}
          </div>
        </div>

        {bike.deposit_usd && (
          <div className="text-xs text-zinc-500 pt-2 border-t border-zinc-100">
            Deposit: <span className="font-medium">{formatPrice(bike.deposit_usd, bike.currency)}</span>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-0 mt-auto">
        <div className={`text-xs font-medium flex items-center gap-1.5 ${
          bike.available ? 'text-green-600' : 'text-red-500'
        }`}>
          {bike.available ? (
            <>
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Available
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-red-500" />
              Unavailable
            </>
          )}
        </div>
      </CardFooter>
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
