import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Scale, Shield, Zap, ArrowRight, RotateCcw } from 'lucide-react';
import { LoanTypeSelector } from '@/components/LoanTypeSelector';
import { LocationInput } from '@/components/LocationInput';
import { AgentCard } from '@/components/AgentCard';
import { BankDetailPanel } from '@/components/BankDetailPanel';
import { SearchProgress } from '@/components/SearchProgress';
import { LiveBrowserPreview } from '@/components/LiveBrowserPreview';
import { useLoanSearch } from '@/hooks/useLoanSearch';
import { LoanType, BankLoanInfo } from '@/types/loan';
import { Button } from '@/components/ui/button';

const Index = () => {
  const [selectedLoanType, setSelectedLoanType] = useState<LoanType | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<BankLoanInfo | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankLoanInfo | null>(null);
  const { isDiscovering, banks, discoverBanks, reset } = useLoanSearch();

  const isSearching = isDiscovering || banks.some(b => b.status === 'running');
  const hasStarted = banks.length > 0 || isDiscovering;

  const handleSearch = (location: string) => {
    if (selectedLoanType) {
      discoverBanks(selectedLoanType, location);
    }
  };

  const handleReset = () => {
    reset();
    setSelectedLoanType(null);
    setExpandedPreview(null);
    setSelectedBank(null);
  };

  const handleSelectBank = (bank: BankLoanInfo) => {
    setSelectedBank(bank);
  };

  const analyzingCount = banks.filter(b => b.status === 'running').length;
  const completedCount = banks.filter(b => b.status === 'completed').length;

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div 
          className="absolute inset-0 opacity-50"
          style={{ background: 'var(--gradient-hero)' }}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.08),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--accent)/0.06),transparent_50%)]" />
        
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="inline-flex items-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20"
            >
              <Scale className="w-5 h-5 text-primary" />
              <span className="font-display font-bold text-primary">LoanLens</span>
            </motion.div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6 leading-tight">
              Compare Loans{' '}
              <span className="gradient-text">Before You Apply</span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              AI-powered analysis of real bank loan pages. Get objective comparisons with pros, cons, and suitability scores—all without affecting your credit.
            </p>

            {/* Features */}
            <div className="flex flex-wrap justify-center gap-6 mb-12">
              {[
                { icon: Shield, text: 'No Credit Impact' },
                { icon: Zap, text: 'Real-time Analysis' },
                { icon: Scale, text: 'Objective Comparison' }
              ].map((feature, index) => (
                <motion.div
                  key={feature.text}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                  className="flex items-center gap-2 text-muted-foreground"
                >
                  <feature.icon className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{feature.text}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Loan Type Selection */}
          {!hasStarted && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              <h2 className="text-center text-lg font-semibold text-foreground mb-6">
                What type of loan are you looking for?
              </h2>
              <LoanTypeSelector selected={selectedLoanType} onSelect={setSelectedLoanType} />

              <AnimatePresence>
                {selectedLoanType && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-8"
                  >
                    <h3 className="text-center text-lg font-semibold text-foreground mb-4">
                      Where are you located?
                    </h3>
                    <LocationInput 
                      onSearch={handleSearch} 
                      isLoading={isSearching}
                      disabled={!selectedLoanType}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {/* Reset Button */}
          {hasStarted && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-center mb-8"
            >
              <Button
                variant="outline"
                onClick={handleReset}
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Start New Search
              </Button>
            </motion.div>
          )}
        </div>
      </section>

      {/* Search Progress */}
      {hasStarted && (
        <section className="container mx-auto px-4 py-6">
          <SearchProgress
            isDiscovering={isDiscovering}
            discoveredCount={banks.length}
            analyzingCount={analyzingCount}
            completedCount={completedCount}
          />
        </section>
      )}

      {/* Results Section */}
      {banks.length > 0 && (
        <section className="container mx-auto px-4 py-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Agent Grid */}
            <div className="flex-1">
              <motion.h2
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-2xl font-display font-bold text-foreground mb-6"
              >
                Analyzing {banks.length} Banks
                {analyzingCount > 0 && (
                  <span className="text-primary ml-2">({analyzingCount} in progress)</span>
                )}
              </motion.h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {banks.map((bank, index) => (
                  <AgentCard
                    key={bank.id}
                    bank={bank}
                    index={index}
                    isSelected={selectedBank?.id === bank.id}
                    onSelect={handleSelectBank}
                    onExpandPreview={setExpandedPreview}
                  />
                ))}
              </div>
            </div>

            {/* Bank Detail Panel */}
            <BankDetailPanel 
              bank={selectedBank} 
              onClose={() => setSelectedBank(null)} 
            />
          </div>
        </section>
      )}

      {/* Empty State */}
      {!hasStarted && (
        <section className="container mx-auto px-4 py-16">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 text-muted-foreground">
              <ArrowRight className="w-5 h-5" />
              <span>Select a loan type above to get started</span>
            </div>
          </motion.div>
        </section>
      )}

      {/* Live Browser Preview Modal */}
      <AnimatePresence>
        {expandedPreview && expandedPreview.streamingUrl && (
          <LiveBrowserPreview
            streamingUrl={expandedPreview.streamingUrl}
            bankName={expandedPreview.bankName}
            onClose={() => setExpandedPreview(null)}
          />
        )}
      </AnimatePresence>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <span className="font-display font-semibold text-foreground">LoanLens</span>
          </div>
          <p>
            Informational purposes only. Not financial advice. Always verify with the lender.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
