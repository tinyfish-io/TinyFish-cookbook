import { motion, AnimatePresence } from 'framer-motion';
import { X, TrendingUp, TrendingDown, Star, Clock, Percent, FileText, Users, DollarSign, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BankLoanInfo } from '@/types/loan';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface BankDetailPanelProps {
  bank: BankLoanInfo | null;
  onClose: () => void;
}

export function BankDetailPanel({ bank, onClose }: BankDetailPanelProps) {
  if (!bank || !bank.result) return null;

  const { result } = bank;

  const getScoreColor = (score: number) => {
    if (score >= 8) return 'text-success';
    if (score >= 6) return 'text-primary';
    if (score >= 4) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreBg = (score: number) => {
    if (score >= 8) return 'bg-success/10 border-success/20';
    if (score >= 6) return 'bg-primary/10 border-primary/20';
    if (score >= 4) return 'bg-warning/10 border-warning/20';
    return 'bg-destructive/10 border-destructive/20';
  };

  const getClarityColor = (clarity: string) => {
    switch (clarity?.toLowerCase()) {
      case 'clear': return 'text-success bg-success/10';
      case 'moderate': return 'text-warning bg-warning/10';
      case 'unclear': return 'text-destructive bg-destructive/10';
      default: return 'text-muted-foreground bg-muted';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
        className="w-full lg:w-[420px] glass-card rounded-xl overflow-hidden sticky top-4 flex flex-col max-h-[calc(100vh-120px)]"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex items-center justify-center w-12 h-12 rounded-xl border-2",
              getScoreBg(result.score)
            )}>
              <span className={cn("text-xl font-bold", getScoreColor(result.score))}>
                {result.score}
              </span>
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">{result.bankName}</h3>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={cn(
                      "w-3.5 h-3.5",
                      i < Math.round(result.score / 2)
                        ? "text-warning fill-warning"
                        : "text-muted-foreground/30"
                    )}
                  />
                ))}
                <span className="text-xs text-muted-foreground ml-1">out of 10</span>
              </div>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="p-5 space-y-5">
            {/* Description */}
            <p className="text-sm text-muted-foreground leading-relaxed">
              {result.description}
            </p>

            {/* Key Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {result.interestRateRange && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Percent className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Interest Rate</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{result.interestRateRange}</p>
                </div>
              )}

              {result.tenure && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Tenure</span>
                  </div>
                  <p className="text-sm font-semibold text-foreground">{result.tenure}</p>
                </div>
              )}

              {result.clarity && (
                <div className="p-3 rounded-lg bg-muted/50 border border-border">
                  <div className="flex items-center gap-2 mb-1">
                    <Eye className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Clarity</span>
                  </div>
                  <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", getClarityColor(result.clarity))}>
                    {result.clarity}
                  </span>
                </div>
              )}
            </div>

            <Separator />

            {/* Benefits */}
            {result.benefits && result.benefits.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-success" />
                  <span className="text-sm font-semibold text-foreground">Benefits</span>
                </div>
                <ul className="space-y-2">
                  {result.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-success mt-1">•</span>
                      <span>{benefit}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Drawbacks */}
            {result.drawbacks && result.drawbacks.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingDown className="w-4 h-4 text-destructive" />
                  <span className="text-sm font-semibold text-foreground">Drawbacks</span>
                </div>
                <ul className="space-y-2">
                  {result.drawbacks.map((drawback, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-destructive mt-1">•</span>
                      <span>{drawback}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Eligibility */}
            {result.eligibility && result.eligibility.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Users className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-foreground">Eligibility</span>
                </div>
                <ul className="space-y-2">
                  {result.eligibility.map((req, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Fees */}
            {result.fees && result.fees.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="w-4 h-4 text-warning" />
                  <span className="text-sm font-semibold text-foreground">Fees</span>
                </div>
                <ul className="space-y-2">
                  {result.fees.map((fee, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-warning mt-1">•</span>
                      <span>{fee}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </ScrollArea>
      </motion.div>
    </AnimatePresence>
  );
}
