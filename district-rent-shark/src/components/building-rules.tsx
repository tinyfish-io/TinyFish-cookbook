import type { BuildingRules } from '@/hooks/use-listing-search';
import { Badge } from '@/components/ui/badge';
import { PawPrint, Car, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BuildingRulesProps {
  rules: BuildingRules;
}

export function BuildingRulesPills({ rules }: BuildingRulesProps) {
  const hasPets = rules.pets_allowed !== 'unknown';
  const hasParking = rules.parking && rules.parking.trim().length > 0;
  const hasCurfew = rules.curfew && rules.curfew.trim().length > 0;

  if (!hasPets && !hasParking && !hasCurfew) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {hasPets && (
        <Badge
          variant="outline"
          className={cn(
            'inline-flex items-center gap-1 text-xs',
            rules.pets_allowed === 'yes'
              ? 'border-green-200 text-green-700 bg-green-50'
              : 'border-red-200 text-red-700 bg-red-50',
          )}
        >
          <PawPrint className="w-3 h-3" />
          {rules.pets_allowed === 'yes' ? 'Pets OK' : 'No Pets'}
        </Badge>
      )}

      {hasParking && (
        <Badge
          variant="outline"
          className="inline-flex items-center gap-1 text-xs border-zinc-200 text-zinc-600 bg-zinc-50"
        >
          <Car className="w-3 h-3" />
          {rules.parking}
        </Badge>
      )}

      {hasCurfew && (
        <Badge
          variant="outline"
          className="inline-flex items-center gap-1 text-xs border-orange-200 text-orange-700 bg-orange-50"
        >
          <Clock className="w-3 h-3" />
          {rules.curfew}
        </Badge>
      )}
    </div>
  );
}
