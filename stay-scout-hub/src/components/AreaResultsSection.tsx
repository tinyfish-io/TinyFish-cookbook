import { motion, AnimatePresence } from 'framer-motion';
import { AreaResearchResult } from '@/types/hotel';
import { AreaCard } from './AreaCard';
import { MapPin, Brain, Sparkles } from 'lucide-react';

interface AreaResultsSectionProps {
  results: AreaResearchResult[];
  isSearching: boolean;
  city?: string;
  purpose?: string;
  checkIn?: string;
  checkOut?: string;
}

export function AreaResultsSection({ results, isSearching, city, purpose, checkIn, checkOut }: AreaResultsSectionProps) {
  if (results.length === 0) {
    return null;
  }

  const completedCount = results.filter(r => r.status === 'complete').length;
  const researchingCount = results.filter(r => r.status === 'researching').length;
  const totalAreas = results.length;
  
  const excellentMatches = results.filter(r => r.analysis?.suitability === 'excellent').length;
  const goodMatches = results.filter(r => r.analysis?.suitability === 'good').length;

  return (
    <motion.div
      className="space-y-8 mt-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Progress Summary */}
      <div className="text-center space-y-3">
        <motion.div
          className="inline-flex items-center gap-3 bg-card px-6 py-3 rounded-full shadow-md border border-border"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
        >
          <Brain className="w-5 h-5 text-primary" />
          <span className="font-medium">
            {isSearching ? (
              <>Researching {researchingCount} of {totalAreas} areas...</>
            ) : (
              <>{completedCount} areas analyzed</>
            )}
          </span>
          <AnimatePresence>
            {(excellentMatches > 0 || goodMatches > 0) && (
              <motion.span
                className="text-primary font-bold"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
              >
                • {excellentMatches + goodMatches} recommended
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>

        {city && purpose && (
          <motion.p
            className="text-sm text-muted-foreground flex items-center justify-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <MapPin className="w-4 h-4" />
            Best areas to stay in <span className="font-medium">{city}</span> for{' '}
            <span className="font-medium">{purpose}</span>
          </motion.p>
        )}
      </div>

      {/* Intro Card */}
      {!isSearching && completedCount > 0 && (
        <motion.div
          className="bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 rounded-2xl p-6 border border-primary/20"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">AI-Powered Location Intelligence</h3>
              <p className="text-sm text-muted-foreground">
                Each area was analyzed by an AI agent that explored Google Maps, hotel reviews, and local 
                information to understand how suitable it is for your specific trip purpose. 
                Focus on the tradeoffs and risks, not just the highlights.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Area Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatePresence>
          {results.map((result, index) => (
            <motion.div
              key={result.areaId}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <AreaCard result={result} searchParams={{ city, checkIn, checkOut }} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
