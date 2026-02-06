import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Header } from '@/components/tender/Header';
import { SectorSelector } from '@/components/tender/SectorSelector';
import { LinkConfigPage } from '@/components/tender/LinkConfigPage';
import { AgentPreviewGrid } from '@/components/tender/AgentPreviewGrid';
import { TenderResultsList } from '@/components/tender/TenderResultsList';
import { CompareButton } from '@/components/tender/CompareButton';
import { CompareModal } from '@/components/tender/CompareModal';
import { useTenderSearch } from '@/hooks/useTenderSearch';
import { Sector } from '@/types/tender';

type ViewState = 'selector' | 'config' | 'search';

const Index = () => {
  const {
    isSearching,
    selectedSector,
    agents,
    tenders,
    selectedTenders,
    startSearch,
    toggleTenderSelection,
    clearSelection,
    resetSearch,
  } = useTenderSearch();

  const [view, setView] = useState<ViewState>('selector');
  const [pendingSector, setPendingSector] = useState<Sector | null>(null);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  const selectedTendersList = tenders.filter(t => selectedTenders.has(t.id));

  const handleSectorSelect = (sector: Sector) => {
    setPendingSector(sector);
    setView('config');
  };

  const handleBackToSelector = () => {
    setPendingSector(null);
    setView('selector');
  };

  const handleStartSearchWithLinks = (links: string[]) => {
    if (pendingSector) {
      startSearch(pendingSector, links);
      setView('search');
    }
  };

  const handleReset = () => {
    resetSearch();
    setPendingSector(null);
    setView('selector');
  };

  const handleCompare = () => {
    setIsCompareOpen(true);
  };

  const handleCloseCompare = () => {
    setIsCompareOpen(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="py-8">
        <AnimatePresence mode="wait">
          {view === 'selector' && (
            <SectorSelector 
              key="selector"
              onSelectSector={handleSectorSelect} 
              disabled={isSearching}
            />
          )}

          {view === 'config' && pendingSector && (
            <LinkConfigPage
              key="config"
              sector={pendingSector}
              onBack={handleBackToSelector}
              onStartSearch={handleStartSearchWithLinks}
            />
          )}

          {view === 'search' && selectedSector && (
            <div key="results" className="space-y-8">
              {/* Back Button */}
              <div className="max-w-7xl mx-auto px-4">
                <button
                  onClick={handleReset}
                  className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors"
                >
                  ← Back to sectors
                </button>
              </div>

              {/* Agent Preview Grid */}
              <AgentPreviewGrid 
                agents={agents} 
                sector={selectedSector} 
              />

              {/* Results List */}
              <TenderResultsList
                tenders={tenders}
                selectedTenders={selectedTenders}
                onToggleSelect={toggleTenderSelection}
                isSearching={isSearching}
              />

              {/* Empty state when no results yet */}
              {!isSearching && tenders.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    No tenders found. Try different links or sector.
                  </p>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>
      </main>

      {/* Compare Button - only show when we have results */}
      {tenders.length > 0 && (
        <CompareButton
          selectedCount={selectedTenders.size}
          onCompare={handleCompare}
        />
      )}

      {/* Compare Modal */}
      <CompareModal
        isOpen={isCompareOpen}
        onClose={handleCloseCompare}
        tenders={selectedTendersList}
      />
    </div>
  );
};

export default Index;
