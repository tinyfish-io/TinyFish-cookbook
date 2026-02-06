import { motion } from 'framer-motion';
import { Monitor, Loader2, CheckCircle, AlertCircle, Maximize2, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BankLoanInfo } from '@/types/loan';
import { Button } from '@/components/ui/button';

interface AgentCardProps {
  bank: BankLoanInfo;
  index: number;
  isSelected?: boolean;
  onSelect?: (bank: BankLoanInfo) => void;
  onExpandPreview?: (bank: BankLoanInfo) => void;
}

export function AgentCard({ bank, index, isSelected, onSelect, onExpandPreview }: AgentCardProps) {
  const getStatusIcon = () => {
    switch (bank.status) {
      case 'pending':
        return <div className="w-3 h-3 rounded-full bg-muted-foreground/30" />;
      case 'running':
        return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-destructive" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'score-excellent';
    if (score >= 6) return 'score-good';
    if (score >= 4) return 'score-fair';
    return 'score-poor';
  };

  const handleCardClick = () => {
    if (bank.status === 'completed' && bank.result && onSelect) {
      onSelect(bank);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={handleCardClick}
      className={cn(
        "glass-card rounded-xl overflow-hidden transition-all duration-300",
        bank.status === 'running' && "ring-2 ring-primary/30",
        bank.status === 'completed' && bank.result && "cursor-pointer hover:ring-2 hover:ring-primary/40",
        isSelected && "ring-2 ring-primary"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-base text-foreground truncate max-w-[220px]">
              {bank.bankName}
            </h3>
            <p className="text-sm text-muted-foreground">
              {bank.status === 'pending' && 'Waiting...'}
              {bank.status === 'running' && (bank.statusMessage || 'Analyzing...')}
              {bank.status === 'completed' && 'Click to view details'}
              {bank.status === 'error' && 'Failed'}
            </p>
          </div>
        </div>
        {bank.result && (
          <div className={cn("text-3xl font-bold", getScoreColor(bank.result.score))}>
            {bank.result.score}/10
          </div>
        )}
      </div>

      {/* Live Preview */}
      {bank.status === 'running' && bank.streamingUrl && (
        <div className="relative h-44 bg-muted/20">
          <iframe
            src={bank.streamingUrl}
            className="w-full h-full border-0 pointer-events-none"
            title={`Live preview for ${bank.bankName}`}
            sandbox="allow-scripts allow-same-origin"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onExpandPreview?.(bank);
            }}
            className="absolute bottom-2 right-2 h-8 px-3 bg-background/80 backdrop-blur-sm hover:bg-background"
          >
            <Maximize2 className="w-4 h-4 mr-1.5" />
            <span className="text-sm">Expand</span>
          </Button>
          <div className="absolute top-2 left-2 flex items-center gap-1.5 px-2.5 py-1 bg-background/80 backdrop-blur-sm rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-success" />
            </span>
            <span className="text-xs font-medium">Live</span>
          </div>
        </div>
      )}

      {/* Status Animation */}
      {bank.status === 'running' && !bank.streamingUrl && (
        <div className="flex items-center justify-center h-44 bg-muted/20">
          <div className="flex flex-col items-center gap-3">
            <Monitor className="w-10 h-10 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Connecting to browser...</p>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {bank.status === 'completed' && bank.result && (
        <div className="p-5 space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
            {bank.result.description}
          </p>

          <div className="grid grid-cols-2 gap-3">
            {bank.result.interestRateRange && (
              <div className="p-2.5 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground block mb-0.5">Interest Rate</span>
                <span className="text-sm font-semibold text-foreground">{bank.result.interestRateRange}</span>
              </div>
            )}

            {bank.result.tenure && (
              <div className="p-2.5 rounded-lg bg-muted/50">
                <span className="text-xs text-muted-foreground block mb-0.5">Tenure</span>
                <span className="text-sm font-medium text-foreground">{bank.result.tenure}</span>
              </div>
            )}
          </div>

          {/* Quick Pros/Cons Preview */}
          <div className="grid grid-cols-2 gap-3">
            {bank.result.benefits && bank.result.benefits.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-success">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{bank.result.benefits.length} benefits</span>
              </div>
            )}
            {bank.result.drawbacks && bank.result.drawbacks.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-destructive">
                <TrendingDown className="w-3.5 h-3.5" />
                <span>{bank.result.drawbacks.length} drawbacks</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error State */}
      {bank.status === 'error' && (
        <div className="p-5 flex items-center justify-center h-32">
          <p className="text-sm text-muted-foreground text-center">
            Unable to analyze this bank's page
          </p>
        </div>
      )}

      {/* Pending State */}
      {bank.status === 'pending' && (
        <div className="p-5 flex items-center justify-center h-32">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/30 animate-pulse" />
            <span className="text-sm">Queued</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
