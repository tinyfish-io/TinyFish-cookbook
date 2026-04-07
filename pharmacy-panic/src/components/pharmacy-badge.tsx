import { Badge } from '@/components/ui/badge';

const PHARMACY_COLORS: Record<string, string> = {
  longchau:   'bg-blue-500 hover:bg-blue-600',
  pharmacity: 'bg-green-500 hover:bg-green-600',
  ankhang:    'bg-orange-500 hover:bg-orange-600',
  guardian:   'bg-purple-500 hover:bg-purple-600',
  medicare:   'bg-teal-500 hover:bg-teal-600',
};

interface PharmacyBadgeProps {
  pharmacyKey: string;
  pharmacyName: string;
}

export function PharmacyBadge({ pharmacyKey, pharmacyName }: PharmacyBadgeProps) {
  const colorClass = PHARMACY_COLORS[pharmacyKey.toLowerCase()] ?? 'bg-zinc-500 hover:bg-zinc-600';

  return (
    <Badge className={`${colorClass} text-white border-none shrink-0`}>
      {pharmacyName}
    </Badge>
  );
}
