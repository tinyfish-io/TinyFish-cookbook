import { motion } from 'framer-motion';
import { X, Star, ShieldCheck, AlertTriangle, MapPin, ExternalLink, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AllergenRiskBadge } from './AllergenRiskBadge';
import { SafetyScoreRing } from './SafetyScoreRing';
import type { RestaurantSafetyData, SearchParams } from '@/types';
import { calculateAdjustedScore } from '@/lib/score-calculator';

interface ResultDetailPanelProps {
  result: RestaurantSafetyData;
  searchParams: SearchParams;
  onClose: () => void;
}

export function ResultDetailPanel({ result, searchParams, onClose }: ResultDetailPanelProps) {
  const adjustedScore = calculateAdjustedScore(
    result,
    searchParams.allergens,
    searchParams.preferences
  );

  const positiveSignals = result.safetySignals.filter(s => s.sentiment === 'positive');
  const negativeSignals = result.safetySignals.filter(s => s.sentiment === 'negative');

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-lg bg-card border-l border-border shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">
              {result.restaurantName}
            </h2>
            {result.address && (
              <p className="text-xs text-muted-foreground truncate">{result.address}</p>
            )}
          </div>
          <Button variant="ghost" size="icon" className="shrink-0 ml-2" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">

            {/* Score + Meta row */}
            <div className="flex items-center gap-6">
              <SafetyScoreRing score={adjustedScore} size="md" />
              <div className="space-y-2">
                {result.rating != null && (
                  <div className="flex items-center gap-1.5">
                    <Star className="w-4 h-4 fill-risk-moderate text-risk-moderate" />
                    <span className="text-sm font-medium">{result.rating}</span>
                    {result.totalReviews != null && (
                      <span className="text-xs text-muted-foreground">
                        ({result.totalReviews.toLocaleString()} reviews)
                      </span>
                    )}
                  </div>
                )}
                <Badge variant="outline" className="text-xs">
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {result.confidenceLevel} confidence
                </Badge>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary" className="text-[10px]">
                    Labeling: {result.allergenLabelingClarity}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    Menu: {result.menuDiversity}
                  </Badge>
                </div>
              </div>
            </div>

            <Separator />

            {/* Fit explanation */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-2">Assessment</h3>
              <p className="text-sm text-foreground/90 leading-relaxed">
                {result.fitExplanation}
              </p>
            </div>

            {/* Pros & Cons */}
            {(result.pros.length > 0 || result.cons.length > 0) && (
              <div className="grid grid-cols-2 gap-4">
                {result.pros.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-risk-low uppercase tracking-wider">Pros</h4>
                    {result.pros.map((pro, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                        <CheckCircle className="w-3.5 h-3.5 text-risk-low shrink-0 mt-0.5" />
                        <span>{pro}</span>
                      </div>
                    ))}
                  </div>
                )}
                {result.cons.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-xs font-semibold text-risk-high uppercase tracking-wider">Cons</h4>
                    {result.cons.map((con, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                        <XCircle className="w-3.5 h-3.5 text-risk-high shrink-0 mt-0.5" />
                        <span>{con}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <Separator />

            {/* Allergen Risks */}
            <div>
              <div className="flex items-center gap-1.5 mb-3">
                <AlertTriangle className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Allergen Risks</h3>
              </div>
              {result.allergenRisks.length > 0 ? (
                <div className="space-y-2">
                  {result.allergenRisks.map((risk) => (
                    <div key={risk.allergen} className="flex items-start gap-2">
                      <AllergenRiskBadge risk={risk} />
                      <p className="text-xs text-muted-foreground flex-1 pt-0.5">{risk.details}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">No specific allergen risks identified</p>
              )}
              <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
                <span>Cross-contamination: <strong className="text-foreground">{result.crossContaminationRisk}</strong></span>
                <span>Food poisoning mentions: <strong className="text-foreground">{result.foodPoisoningMentions}</strong></span>
              </div>
            </div>

            <Separator />

            {/* Safety Signals from reviews */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Review Signals</h3>
              {positiveSignals.length > 0 && (
                <div className="mb-3 space-y-1.5">
                  {positiveSignals.map((sig, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <CheckCircle className="w-3.5 h-3.5 text-risk-low shrink-0 mt-0.5" />
                      <div>
                        <span className="text-foreground">{sig.detail}</span>
                        <span className="text-muted-foreground ml-1">({sig.category})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {negativeSignals.length > 0 && (
                <div className="space-y-1.5">
                  {negativeSignals.map((sig, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <XCircle className="w-3.5 h-3.5 text-risk-high shrink-0 mt-0.5" />
                      <div>
                        <span className="text-foreground">{sig.detail}</span>
                        <span className="text-muted-foreground ml-1">({sig.category})</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {result.safetySignals.length === 0 && (
                <p className="text-xs text-muted-foreground italic">No specific safety signals extracted</p>
              )}
            </div>

            <Separator />

            {/* Dietary info */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary" className="text-xs">
                Dietary accommodation: {result.dietaryAccommodation}
              </Badge>
              {result.vegetarianFriendly && (
                <Badge variant="secondary" className="text-xs bg-risk-low/10 text-risk-low">Vegetarian friendly</Badge>
              )}
              {result.veganFriendly && (
                <Badge variant="secondary" className="text-xs bg-risk-low/10 text-risk-low">Vegan friendly</Badge>
              )}
              {result.safeOptionsCount > 0 && (
                <Badge variant="secondary" className="text-xs">{result.safeOptionsCount} safe options</Badge>
              )}
            </div>

            {/* Google Maps link */}
            {result.googleMapsUrl && (
              <Button variant="outline" size="sm" className="w-full" asChild>
                <a href={result.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                  <MapPin className="w-4 h-4 mr-2" />
                  View on Google Maps
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </a>
              </Button>
            )}

            {result.dataSourcesUsed.length > 0 && (
              <p className="text-[10px] text-muted-foreground/60 text-center">
                Sources: {result.dataSourcesUsed.join(', ')}
              </p>
            )}
          </div>
        </div>
      </motion.div>
    </>
  );
}
