import { cn } from '@/lib/utils';
import type { AgentStatus } from '@/types';
import { Search, BookOpen, UtensilsCrossed, Brain, CheckCircle, XCircle, Loader2 } from 'lucide-react';

interface AgentStatusIndicatorProps {
  status: AgentStatus;
  currentStep: string;
}

const STATUS_CONFIG: Record<AgentStatus, { icon: typeof Search; label: string; colorClass: string }> = {
  idle: { icon: Loader2, label: 'Waiting', colorClass: 'text-muted-foreground' },
  connecting: { icon: Loader2, label: 'Connecting', colorClass: 'text-blue-500' },
  searching_maps: { icon: Search, label: 'Searching Maps', colorClass: 'text-primary' },
  reading_reviews: { icon: BookOpen, label: 'Reading Reviews', colorClass: 'text-primary' },
  checking_menu: { icon: UtensilsCrossed, label: 'Checking Menu', colorClass: 'text-primary' },
  analyzing: { icon: Brain, label: 'Analyzing', colorClass: 'text-primary' },
  complete: { icon: CheckCircle, label: 'Complete', colorClass: 'text-risk-low' },
  error: { icon: XCircle, label: 'Error', colorClass: 'text-destructive' },
};

export function AgentStatusIndicator({ status, currentStep }: AgentStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isActive = !['idle', 'complete', 'error'].includes(status);

  return (
    <div className="flex items-start gap-3">
      <div className={cn('mt-0.5', config.colorClass)}>
        <Icon className={cn('h-5 w-5', isActive && 'animate-spin')} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn('text-sm font-medium', config.colorClass)}>
          {config.label}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {currentStep}
        </p>
      </div>
      {isActive && (
        <span className="relative flex h-2.5 w-2.5 shrink-0 mt-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
        </span>
      )}
    </div>
  );
}
