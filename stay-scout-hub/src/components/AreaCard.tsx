import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaResearchResult } from '@/types/hotel';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  Loader2, CheckCircle2, XCircle, MapPin,
  Monitor, ThumbsUp, ThumbsDown, AlertTriangle, Eye, Star, Building2
} from 'lucide-react';
import { MiniPreview, LiveBrowserPreview } from './LiveBrowserPreview';

interface AreaCardProps {
  result: AreaResearchResult;
  searchParams?: { city?: string; checkIn?: string; checkOut?: string };
}

const suitabilityConfig = {
  excellent: { color: 'text-success', bg: 'bg-success/10', border: 'border-success/50', label: 'Excellent Match' },
  good: { color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/50', label: 'Good Match' },
  moderate: { color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/50', label: 'Consider Carefully' },
  poor: { color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/50', label: 'Not Recommended' },
};

export function AreaCard({ result }: AreaCardProps) {
  const [showFullPreview, setShowFullPreview] = useState(false);
  const [expanded, setExpanded] = useState(false);
  
  const suitability = result.analysis?.suitability || 'moderate';
  const config = suitabilityConfig[suitability];

  const statusColors = {
    pending: 'border-muted bg-muted/30',
    researching: 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10',
    complete: config.border + ' ' + config.bg,
    error: 'border-destructive/50 bg-destructive/5',
  };

  return (
    <>
      <motion.div
        layout
        className={cn(
          "rounded-2xl border-2 p-6 transition-all duration-300",
          statusColors[result.status]
        )}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              result.status === 'complete' ? config.bg : 'bg-muted'
            )}>
              <MapPin className={cn("w-5 h-5", result.status === 'complete' ? config.color : 'text-muted-foreground')} />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-foreground">{result.areaName}</h3>
              <StatusBadge status={result.status} suitability={suitability} hasPreview={!!result.streamingUrl} />
            </div>
          </div>
          
          {result.status === 'complete' && result.analysis && (
            <div className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium",
              config.bg, config.color
            )}>
              {result.analysis.suitabilityScore}/10
            </div>
          )}
        </div>

        {/* Live Status */}
        {result.status === 'researching' && result.currentAction && (
          <div className="mb-4 p-3 bg-primary/10 rounded-xl">
            <p className="text-sm text-primary font-medium flex items-center gap-2">
              <Eye className="w-4 h-4 animate-pulse" />
              {result.currentAction}
            </p>
          </div>
        )}

        {/* Live Browser Preview */}
        <AnimatePresence>
          {result.status === 'researching' && result.streamingUrl && (
            <MiniPreview
              streamingUrl={result.streamingUrl}
              onClick={() => setShowFullPreview(true)}
            />
          )}
        </AnimatePresence>

        {/* Analysis Results */}
        {result.status === 'complete' && result.analysis && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            {/* Summary */}
            <p className="text-sm text-foreground leading-relaxed">
              {result.analysis.summary}
            </p>

            {/* Pros/Cons/Risks */}
            <div className="grid gap-3">
              {result.analysis.pros.length > 0 && (
                <div className="flex gap-2">
                  <ThumbsUp className="w-4 h-4 text-success shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-success">Pros: </span>
                    <span className="text-muted-foreground">{result.analysis.pros.join(' • ')}</span>
                  </div>
                </div>
              )}
              
              {result.analysis.cons.length > 0 && (
                <div className="flex gap-2">
                  <ThumbsDown className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-warning">Cons: </span>
                    <span className="text-muted-foreground">{result.analysis.cons.join(' • ')}</span>
                  </div>
                </div>
              )}
              
              {result.analysis.risks.length > 0 && (
                <div className="flex gap-2">
                  <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <span className="font-medium text-destructive">Risks: </span>
                    <span className="text-muted-foreground">{result.analysis.risks.join(' • ')}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Expandable Details */}
            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="pt-3 border-t border-border/50 space-y-2 text-sm">
                    {result.analysis.distanceToKey && (
                      <p><span className="text-muted-foreground">Distance to key locations:</span> {result.analysis.distanceToKey}</p>
                    )}
                    {result.analysis.walkability && (
                      <p><span className="text-muted-foreground">Walkability:</span> {result.analysis.walkability}</p>
                    )}
                    {result.analysis.noiseLevel && (
                      <p><span className="text-muted-foreground">Noise level:</span> {result.analysis.noiseLevel}</p>
                    )}
                    {result.analysis.safetyNotes && (
                      <p><span className="text-muted-foreground">Safety:</span> {result.analysis.safetyNotes}</p>
                    )}
                    {result.analysis.nearbyAmenities && result.analysis.nearbyAmenities.length > 0 && (
                      <p><span className="text-muted-foreground">Nearby:</span> {result.analysis.nearbyAmenities.join(', ')}</p>
                    )}
                    {result.analysis.reviewHighlights && result.analysis.reviewHighlights.length > 0 && (
                      <div>
                        <span className="text-muted-foreground">Reviews mention:</span>
                        <ul className="mt-1 list-disc list-inside text-muted-foreground">
                          {result.analysis.reviewHighlights.map((h, i) => (
                            <li key={i}>"{h}"</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top Hotels */}
            {result.analysis.topHotels && result.analysis.topHotels.length > 0 && (
              <div className="pt-3 border-t border-border/50">
                <div className="flex items-center gap-2 mb-3">
                  <Building2 className="w-4 h-4 text-primary" />
                  <h4 className="text-sm font-semibold text-foreground">Top Rated Hotels</h4>
                </div>
                <div className="space-y-3">
                  {result.analysis.topHotels.map((hotel, index) => (
                    <div 
                      key={index}
                      className="p-3 rounded-xl bg-muted/50 border border-border/30"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h5 className="font-medium text-sm text-foreground">{hotel.name}</h5>
                        {hotel.rating && (
                          <div className="flex items-center gap-1 text-xs text-warning shrink-0">
                            <Star className="w-3 h-3 fill-warning" />
                            {hotel.rating}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {hotel.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpanded(!expanded)}
                className="text-muted-foreground"
              >
                {expanded ? 'Show less' : 'Show more'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Error State */}
        {result.error && (
          <p className="mt-3 text-sm text-destructive">{result.error}</p>
        )}
      </motion.div>

      {/* Full Screen Preview */}
      <AnimatePresence>
        {showFullPreview && result.streamingUrl && (
          <LiveBrowserPreview
            streamingUrl={result.streamingUrl}
            platformName={result.areaName}
            onClose={() => setShowFullPreview(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function StatusBadge({ 
  status, 
  suitability, 
  hasPreview 
}: { 
  status: AreaResearchResult['status']; 
  suitability: string;
  hasPreview?: boolean;
}) {
  const badges = {
    pending: { text: 'Waiting...', className: 'text-muted-foreground' },
    researching: { text: hasPreview ? 'Researching • Live' : 'Researching...', className: 'text-primary' },
    complete: { text: suitabilityConfig[suitability as keyof typeof suitabilityConfig].label, className: suitabilityConfig[suitability as keyof typeof suitabilityConfig].color },
    error: { text: 'Failed', className: 'text-destructive' },
  };

  const badge = badges[status];

  return (
    <span className={cn("text-xs font-medium flex items-center gap-1.5", badge.className)}>
      {status === 'researching' && <Loader2 className="w-3 h-3 animate-spin" />}
      {status === 'complete' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'error' && <XCircle className="w-3 h-3" />}
      {badge.text}
      {status === 'researching' && hasPreview && <Monitor className="w-3 h-3" />}
    </span>
  );
}
