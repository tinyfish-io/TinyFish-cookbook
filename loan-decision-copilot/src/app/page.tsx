"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Scale, Shield, Zap, RotateCcw } from "lucide-react";
import { LoanTypeSelector } from "@/components/LoanTypeSelector";
import { LocationInput } from "@/components/LocationInput";
import { AgentCard } from "@/components/AgentCard";
import { BankDetailPanel } from "@/components/BankDetailPanel";
import { SearchProgress } from "@/components/SearchProgress";
import { LiveBrowserPreview } from "@/components/LiveBrowserPreview";
import { useLoanSearch } from "@/hooks/useLoanSearch";
import { LoanType, BankLoanInfo } from "@/types/loan";
import { Button } from "@/components/ui/button";

export default function Home() {
  const [selectedLoanType, setSelectedLoanType] = useState<LoanType | null>(null);
  const [expandedPreview, setExpandedPreview] = useState<BankLoanInfo | null>(null);
  const [selectedBank, setSelectedBank] = useState<BankLoanInfo | null>(null);
  const { isDiscovering, banks, error, discoverBanks, reset } = useLoanSearch();

  const hasStarted = banks.length > 0 || isDiscovering;
  const analyzingCount = banks.filter((b) => b.status === "running").length;
  const completedCount = banks.filter((b) => b.status === "completed").length;

  const handleSearch = (location: string) => {
    if (selectedLoanType) discoverBanks(selectedLoanType, location);
  };

  const handleReset = () => {
    reset();
    setSelectedLoanType(null);
    setExpandedPreview(null);
    setSelectedBank(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-accent/5" />
        <div className="container relative mx-auto px-4 py-16 md:py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-6">
              <Zap className="w-4 h-4" />
              AI-Powered Loan Comparison
            </div>

            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
              Find the Best{" "}
              <span className="text-primary">Loan Deal</span>{" "}
              Near You
            </h1>

            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              AI browser agents analyze multiple banks simultaneously — comparing interest rates,
              fees, eligibility, and terms in real time so you can make the right choice.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground mb-12">
              {[
                { icon: Scale, label: "Side-by-side comparison" },
                { icon: Shield, label: "Official bank pages only" },
                { icon: Zap, label: "Parallel real-time analysis" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-primary" />
                  <span>{label}</span>
                </div>
              ))}
            </div>

            {/* Search form */}
            {!hasStarted && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-8"
              >
                <div>
                  <h2 className="text-xl font-semibold mb-4">What type of loan are you looking for?</h2>
                  <LoanTypeSelector selected={selectedLoanType} onSelect={setSelectedLoanType} />
                </div>

                <AnimatePresence>
                  {selectedLoanType && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      <h2 className="text-xl font-semibold mb-4">Where are you located?</h2>
                      <LocationInput onSearch={handleSearch} isLoading={isDiscovering} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* Results */}
      <AnimatePresence>
        {hasStarted && (
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="container mx-auto px-4 pb-16"
          >
            <div className="flex items-center justify-between mb-6">
              <SearchProgress
                isDiscovering={isDiscovering}
                discoveredCount={banks.length}
                analyzingCount={analyzingCount}
                completedCount={completedCount}
              />
              <Button variant="outline" size="sm" onClick={handleReset} className="ml-4 shrink-0">
                <RotateCcw className="w-4 h-4 mr-2" />
                New Search
              </Button>
            </div>

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-6">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {banks.map((bank, index) => (
                  <AgentCard
                    key={bank.id}
                    bank={bank}
                    index={index}
                    isSelected={selectedBank?.id === bank.id}
                    onSelect={setSelectedBank}
                    onExpandPreview={setExpandedPreview}
                  />
                ))}
              </div>

              <AnimatePresence>
                {selectedBank && (
                  <BankDetailPanel
                    bank={selectedBank}
                    onClose={() => setSelectedBank(null)}
                  />
                )}
              </AnimatePresence>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      {/* Expanded live browser preview */}
      <AnimatePresence>
        {expandedPreview?.streamingUrl && (
          <LiveBrowserPreview
            streamingUrl={expandedPreview.streamingUrl}
            bankName={expandedPreview.bankName}
            onClose={() => setExpandedPreview(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
