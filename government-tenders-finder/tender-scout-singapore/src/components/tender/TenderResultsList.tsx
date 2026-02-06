import { motion, AnimatePresence } from 'framer-motion';
import { TenderResultCard } from './TenderResultCard';
import { Tender } from '@/types/tender';
import { ArrowDown } from 'lucide-react';

interface TenderResultsListProps {
  tenders: Tender[];
  selectedTenders: Set<string>;
  onToggleSelect: (tenderId: string) => void;
  isSearching: boolean;
}

export function TenderResultsList({ 
  tenders, 
  selectedTenders, 
  onToggleSelect,
  isSearching 
}: TenderResultsListProps) {
  if (tenders.length === 0 && !isSearching) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="w-full max-w-7xl mx-auto px-4"
    >
      {/* Scroll indicator when searching */}
      {isSearching && tenders.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-center gap-2 mb-4 py-2 bg-primary/10 rounded-lg"
        >
          <ArrowDown className="w-4 h-4 text-primary animate-bounce" />
          <span className="text-sm font-medium text-primary">
            Scroll down to see results
          </span>
          <ArrowDown className="w-4 h-4 text-primary animate-bounce" />
        </motion.div>
      )}

      {/* Results Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {isSearching ? 'Results Found So Far' : 'Search Results'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {tenders.length} tender{tenders.length !== 1 ? 's' : ''} found
            {selectedTenders.size > 0 && ` • ${selectedTenders.size} selected`}
          </p>
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {tenders.map((tender, index) => (
            <motion.div
              key={tender.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <TenderResultCard
                tender={tender}
                isSelected={selectedTenders.has(tender.id)}
                onToggleSelect={() => onToggleSelect(tender.id)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
