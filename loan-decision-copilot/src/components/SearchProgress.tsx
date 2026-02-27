import { motion } from 'framer-motion';
import { Loader2, Search, Bot } from 'lucide-react';

interface SearchProgressProps {
  isDiscovering: boolean;
  discoveredCount: number;
  analyzingCount: number;
  completedCount: number;
}

export function SearchProgress({
  isDiscovering,
  discoveredCount,
  analyzingCount,
  completedCount
}: SearchProgressProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-wrap items-center justify-center gap-6 py-4 px-6 rounded-xl bg-muted/50 border border-border"
    >
      {/* Discovering Banks */}
      <div className="flex items-center gap-3">
        {isDiscovering ? (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10">
            <Loader2 className="w-5 h-5 text-primary animate-spin" />
          </div>
        ) : discoveredCount > 0 ? (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-success/10">
            <Search className="w-5 h-5 text-success" />
          </div>
        ) : (
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-muted">
            <Search className="w-5 h-5 text-muted-foreground" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-foreground">
            {isDiscovering ? 'Discovering Banks...' : `${discoveredCount} Banks Found`}
          </p>
          <p className="text-xs text-muted-foreground">
            {isDiscovering ? 'Finding loan pages' : 'Ready for analysis'}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-10 bg-border" />

      {/* Analyzing */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
          analyzingCount > 0 ? 'bg-primary/10' : 'bg-muted'
        }`}>
          <Bot className={`w-5 h-5 ${analyzingCount > 0 ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {analyzingCount > 0 ? `${analyzingCount} Agents Running` : 'Agents Ready'}
          </p>
          <p className="text-xs text-muted-foreground">
            {analyzingCount > 0 ? 'Browsing & analyzing' : 'Waiting to start'}
          </p>
        </div>
      </div>

      {/* Divider */}
      <div className="hidden sm:block w-px h-10 bg-border" />

      {/* Completed */}
      <div className="flex items-center gap-3">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${
          completedCount > 0 ? 'bg-success/10' : 'bg-muted'
        }`}>
          <span className={`text-lg font-bold ${
            completedCount > 0 ? 'text-success' : 'text-muted-foreground'
          }`}>
            {completedCount}
          </span>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {completedCount > 0 ? `${completedCount} Analyzed` : 'No Results Yet'}
          </p>
          <p className="text-xs text-muted-foreground">
            {completedCount > 0 ? 'Comparison ready' : 'Results will appear here'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
