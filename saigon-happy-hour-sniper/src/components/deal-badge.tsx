import { Badge } from '@/components/ui/badge';
import type { DealType } from '@/lib/types';

const TYPE_CONFIG: Record<DealType, { classes: string; label: string }> = {
  happy_hour:    { classes: 'bg-amber-100 text-amber-800 hover:bg-amber-100',   label: 'Happy Hour' },
  ladies_night:  { classes: 'bg-pink-100 text-pink-800 hover:bg-pink-100',      label: "Ladies' Night" },
  brunch:        { classes: 'bg-orange-100 text-orange-800 hover:bg-orange-100', label: 'Brunch' },
  live_music:    { classes: 'bg-purple-100 text-purple-800 hover:bg-purple-100', label: 'Live Music' },
  daily_special: { classes: 'bg-blue-100 text-blue-800 hover:bg-blue-100',      label: 'Daily Special' },
};

interface DealBadgeProps {
  type: DealType;
}

export function DealBadge({ type }: DealBadgeProps) {
  const config = TYPE_CONFIG[type] ?? { classes: 'bg-zinc-100 text-zinc-800 hover:bg-zinc-100', label: type };
  return (
    <Badge className={`border-none text-xs font-semibold ${config.classes}`}>
      {config.label}
    </Badge>
  );
}
