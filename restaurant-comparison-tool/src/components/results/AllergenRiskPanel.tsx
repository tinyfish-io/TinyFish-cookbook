import { AlertTriangle } from 'lucide-react';
import { AllergenRiskBadge } from './AllergenRiskBadge';
import type { AllergenRisk } from '@/types';

interface AllergenRiskPanelProps {
  risks: AllergenRisk[];
}

export function AllergenRiskPanel({ risks }: AllergenRiskPanelProps) {
  if (risks.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic">
        No specific allergen risks identified
      </p>
    );
  }

  const hasHighRisk = risks.some(r => r.riskLevel === 'high' || r.riskLevel === 'critical');

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <AlertTriangle className={`w-4 h-4 ${hasHighRisk ? 'text-risk-critical' : 'text-muted-foreground'}`} />
        <span className="text-sm font-medium">Allergen Risks</span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {risks.map((risk) => (
          <AllergenRiskBadge key={risk.allergen} risk={risk} />
        ))}
      </div>
    </div>
  );
}
