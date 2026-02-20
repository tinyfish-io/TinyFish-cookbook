import { ShieldCheck, AlertCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ConfidenceLevel } from '@/types';

interface ConfidenceIndicatorProps {
  level: ConfidenceLevel;
}

const CONFIG: Record<ConfidenceLevel, { icon: typeof ShieldCheck; label: string; className: string }> = {
  high: {
    icon: ShieldCheck,
    label: 'High Confidence',
    className: 'bg-risk-low/15 text-risk-low border-risk-low/30',
  },
  medium: {
    icon: AlertCircle,
    label: 'Medium Confidence',
    className: 'bg-risk-moderate/15 text-risk-moderate border-risk-moderate/30',
  },
  low: {
    icon: HelpCircle,
    label: 'Low Confidence',
    className: 'bg-muted text-muted-foreground border-border',
  },
};

export function ConfidenceIndicator({ level }: ConfidenceIndicatorProps) {
  const { icon: Icon, label, className } = CONFIG[level];
  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border', className)}>
      <Icon className="w-3.5 h-3.5" />
      {label}
    </div>
  );
}
