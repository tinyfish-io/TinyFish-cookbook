import type { DistrictVibe } from '@/hooks/use-vibe-search';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Laptop, Dumbbell, Wine, ShoppingCart, Pill, Footprints, Zap } from 'lucide-react';

interface VibeCardProps {
  vibe: DistrictVibe;
}

const categoryConfig = [
  { key: 'coworking' as const, icon: Laptop, label: 'Coworking' },
  { key: 'gyms' as const, icon: Dumbbell, label: 'Gyms' },
  { key: 'nightlife' as const, icon: Wine, label: 'Nightlife' },
  { key: 'supermarkets' as const, icon: ShoppingCart, label: 'Supermarkets' },
  { key: 'pharmacies' as const, icon: Pill, label: 'Pharmacies' },
] as const;

export function VibeCard({ vibe }: VibeCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base font-bold">{vibe.district}</CardTitle>
          {vibe.source === 'cache' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200 shrink-0">
              <Zap className="w-3 h-3" />
              Cached
            </span>
          )}
        </div>
        <p className="text-xs text-zinc-400">{vibe.city}</p>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {categoryConfig.map(({ key, icon: Icon, label }) => {
            const cat = vibe.amenities[key];
            return (
              <div key={key} className="flex items-center gap-2 text-xs">
                <Icon className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                <span className="text-zinc-600">{label}</span>
                <span className="ml-auto font-semibold text-zinc-900">{cat.count}</span>
              </div>
            );
          })}
        </div>

        {vibe.walkability_score !== null && (
          <div className="flex items-center gap-2 text-xs pt-2 border-t border-zinc-100">
            <Footprints className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="text-zinc-600">Walkability</span>
            <span className="ml-auto font-semibold text-zinc-900">{vibe.walkability_score}/100</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
