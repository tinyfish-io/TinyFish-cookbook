import { motion, AnimatePresence } from 'framer-motion';
import { PlatformResult } from '@/types/hotel';
import { PlatformCard } from './PlatformCard';
import { Building2 } from 'lucide-react';

interface ResultsSectionProps {
  results: PlatformResult[];
  isSearching: boolean;
}

export function ResultsSection({ results, isSearching }: ResultsSectionProps) {
  if (results.length === 0) {
    return null;
  }

  const totalHotelsFound = results
    .filter(r => r.status === 'complete' && r.available)
    .reduce((sum, r) => sum + r.hotelsFound, 0);

  const completedCount = results.filter(r => r.status === 'complete').length;
  const searchingCount = results.filter(r => r.status === 'searching').length;
  const platformsWithResults = results.filter(r => r.status === 'complete' && r.available).length;
  const totalPlatforms = results.length;

  return (
    <motion.div 
      className="space-y-8 mt-12"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Progress Summary */}
      <div className="text-center space-y-2">
        <motion.div 
          className="inline-flex items-center gap-3 bg-card px-6 py-3 rounded-full shadow-md border border-border"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-medium">
            {isSearching ? (
              <>Searching {searchingCount} of {totalPlatforms} platforms...</>
            ) : (
              <>{completedCount} platforms searched</>
            )}
          </span>
          <AnimatePresence>
            {totalHotelsFound > 0 && (
              <motion.span 
                className="text-primary font-bold"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
              >
                • {totalHotelsFound} hotels across {platformsWithResults} platform{platformsWithResults !== 1 ? 's' : ''}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Platform Results Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-muted-foreground">Search Results</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence>
            {results.map((result, index) => (
              <motion.div
                key={result.platformId}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <PlatformCard result={result} />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
