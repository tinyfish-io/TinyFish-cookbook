import { motion } from 'framer-motion';
import { Star, Award, AlertTriangle, ChevronRight, ShieldCheck, ShieldAlert, HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { RestaurantSafetyData, SearchParams, ConfidenceLevel, RiskLevel } from '@/types';
import { calculateAdjustedScore, getScoreLabel } from '@/lib/score-calculator';
import { ALLERGEN_INFO } from '@/lib/allergens';
import { cn } from '@/lib/utils';

interface RestaurantResultCardProps {
  result: RestaurantSafetyData;
  searchParams: SearchParams;
  rank: number;
  index: number;
  onClick: () => void;
}

function getScoreBg(score: number) {
  if (score >= 70) return 'bg-risk-low/15 text-risk-low';
  if (score >= 40) return 'bg-risk-moderate/15 text-risk-moderate';
  return 'bg-risk-critical/15 text-risk-critical';
}

function getFitLabel(score: number) {
  if (score >= 80) return { label: 'Great Fit', className: 'bg-risk-low/10 text-risk-low border-risk-low/30' };
  if (score >= 65) return { label: 'Good Fit', className: 'bg-risk-low/10 text-risk-low border-risk-low/30' };
  if (score >= 45) return { label: 'Fair Fit', className: 'bg-risk-moderate/10 text-risk-moderate border-risk-moderate/30' };
  return { label: 'Poor Fit', className: 'bg-risk-critical/10 text-risk-critical border-risk-critical/30' };
}

const CONFIDENCE_ICON: Record<ConfidenceLevel, typeof ShieldCheck> = {
  high: ShieldCheck,
  medium: ShieldAlert,
  low: HelpCircle,
};

const RISK_DOT: Record<RiskLevel, string> = {
  low: 'bg-risk-low',
  moderate: 'bg-risk-moderate',
  high: 'bg-risk-high',
  critical: 'bg-risk-critical',
};

export function RestaurantResultCard({ result, searchParams, rank, index, onClick }: RestaurantResultCardProps) {
  const adjustedScore = calculateAdjustedScore(
    result,
    searchParams.allergens,
    searchParams.preferences
  );

  const isBestFit = rank === 1;
  const fit = getFitLabel(adjustedScore);
  const ConfIcon = CONFIDENCE_ICON[result.confidenceLevel];
  const highRisks = result.allergenRisks.filter(r => r.riskLevel === 'high' || r.riskLevel === 'critical');

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
    >
      <Card
        className={cn(
          'cursor-pointer transition-all hover:shadow-md group',
          isBestFit && 'border-primary/50 ring-1 ring-primary/20'
        )}
        onClick={onClick}
      >
        <CardContent className="p-4">
          {/* Top row: name + fit label + score */}
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {isBestFit && (
                  <Badge className="bg-primary/10 text-primary border-primary/30 text-[10px] px-1.5 py-0">
                    <Award className="w-3 h-3 mr-0.5" />
                    Best
                  </Badge>
                )}
                <h3 className="text-base font-semibold text-foreground truncate">
                  {result.restaurantName}
                </h3>
              </div>
              {result.address && (
                <p className="text-xs text-muted-foreground truncate mb-2">
                  {result.address}
                </p>
              )}
            </div>

            {/* Inline score badge */}
            <div className={cn('shrink-0 flex flex-col items-center rounded-lg px-3 py-2', getScoreBg(adjustedScore))}>
              <span className="text-xl font-bold leading-none">{adjustedScore}</span>
              <span className="text-[10px] font-medium mt-0.5">{getScoreLabel(adjustedScore)}</span>
            </div>
          </div>

          {/* Meta row: rating + confidence + fit */}
          <div className="flex items-center flex-wrap gap-2 mb-3">
            {result.rating != null && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 fill-risk-moderate text-risk-moderate" />
                {result.rating}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <ConfIcon className="w-3 h-3" />
              {result.confidenceLevel}
            </span>
            <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0 border', fit.className)}>
              {fit.label}
            </Badge>
          </div>

          {/* Allergen risk flags */}
          {searchParams.allergens.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {result.allergenRisks
                .filter(r => searchParams.allergens.includes(r.allergen))
                .map((risk) => (
                  <span
                    key={risk.allergen}
                    className="inline-flex items-center gap-1 text-[11px] text-foreground/80"
                  >
                    <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', RISK_DOT[risk.riskLevel])} />
                    {ALLERGEN_INFO[risk.allergen]?.label ?? risk.allergen}
                  </span>
                ))}
            </div>
          )}

          {/* High risk warning */}
          {highRisks.length > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-risk-critical/8 border border-risk-critical/20 mb-3">
              <AlertTriangle className="w-3.5 h-3.5 text-risk-critical shrink-0" />
              <span className="text-xs text-risk-critical font-medium">
                {highRisks.length} high-risk allergen{highRisks.length > 1 ? 's' : ''} detected
              </span>
            </div>
          )}

          {/* Explanation preview */}
          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
            {result.fitExplanation}
          </p>

          {/* Click hint */}
          <div className="flex items-center justify-end text-xs text-muted-foreground/60 group-hover:text-primary transition-colors">
            <span>View full analysis</span>
            <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
