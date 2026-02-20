import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AllergenRisk } from '@/types';
import { ALLERGEN_INFO } from '@/lib/allergens';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface AllergenRiskBadgeProps {
  risk: AllergenRisk;
}

const RISK_STYLES: Record<string, string> = {
  low: 'bg-risk-low/10 text-risk-low border-risk-low/30',
  moderate: 'bg-risk-moderate/10 text-risk-moderate border-risk-moderate/30',
  high: 'bg-risk-high/10 text-risk-high border-risk-high/30',
  critical: 'bg-risk-critical/10 text-risk-critical border-risk-critical/30',
};

export function AllergenRiskBadge({ risk }: AllergenRiskBadgeProps) {
  const info = ALLERGEN_INFO[risk.allergen];
  const style = RISK_STYLES[risk.riskLevel] || RISK_STYLES.low;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border cursor-help', style)}>
            {(risk.riskLevel === 'high' || risk.riskLevel === 'critical') && (
              <AlertTriangle className="w-3 h-3" />
            )}
            {info?.label ?? risk.allergen}: {risk.riskLevel}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <p className="text-sm font-medium mb-1">
            {info?.label ?? risk.allergen} - {risk.riskLevel.toUpperCase()} risk
          </p>
          <p className="text-xs">{risk.details}</p>
          <p className="text-xs text-muted-foreground mt-1">
            Menu mentions: {risk.menuMentions} | Review mentions: {risk.reviewMentions}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
