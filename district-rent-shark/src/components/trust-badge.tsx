import type { TrustSignals } from '@/hooks/use-listing-search';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TrustBadgeProps {
  posterType: 'owner' | 'broker' | 'unknown';
  trustSignals: TrustSignals;
}

export function TrustBadge({ posterType, trustSignals }: TrustBadgeProps) {
  const isRed = posterType === 'broker' || trustSignals.price_suspicious;
  const isGreen = posterType === 'owner' && !trustSignals.is_likely_broker && !trustSignals.price_suspicious;

  if (isRed) {
    return (
      <Badge
        className={cn(
          'inline-flex items-center gap-1 border-none text-white',
          trustSignals.price_suspicious
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-red-500 hover:bg-red-600',
        )}
      >
        <ShieldX className="w-3 h-3" />
        {trustSignals.price_suspicious ? 'Price Alert' : 'Likely Broker'}
      </Badge>
    );
  }

  if (isGreen) {
    return (
      <Badge className="inline-flex items-center gap-1 bg-green-500 hover:bg-green-600 border-none text-white">
        <ShieldCheck className="w-3 h-3" />
        Verified Owner
      </Badge>
    );
  }

  return (
    <Badge className="inline-flex items-center gap-1 bg-yellow-500 hover:bg-yellow-600 border-none text-white">
      <ShieldAlert className="w-3 h-3" />
      Unverified
    </Badge>
  );
}
