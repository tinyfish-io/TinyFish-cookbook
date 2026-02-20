import { useState } from 'react';
import { GraduationCap, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExamSelector } from '@/components/ExamSelector';
import { LocationInput } from '@/components/LocationInput';
import { DiscoveringState } from '@/components/DiscoveringState';
import { AgentPreviewGrid } from '@/components/AgentPreviewGrid';
import { TutorResultsGrid } from '@/components/TutorResultsGrid';
import { CompareButton } from '@/components/CompareButton';
import { CompareDashboard } from '@/components/CompareDashboard';
import { useTutorSearch } from '@/hooks/useTutorSearch';

const Index = () => {
  const { state, setExam, startSearch, toggleTutorSelection, resetSearch } = useTutorSearch();
  const [showCompare, setShowCompare] = useState(false);

  const selectedTutors = state.tutors.filter((t) => state.selectedTutorIds.has(t.id));

  const handleSearch = (location: string) => {
    if (state.exam) {
      startSearch(state.exam, location);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-sm border-b border-border">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">TutorFinder</h1>
              <p className="text-xs text-muted-foreground">Find expert exam tutors</p>
            </div>
          </div>
          {(state.isSearching || state.tutors.length > 0) && (
            <Button variant="ghost" size="sm" onClick={resetSearch} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              New Search
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 pb-24 space-y-8">
        {/* Step 1: Exam Selection (only show if not searching) */}
        {!state.isSearching && !state.isDiscovering && state.tutors.length === 0 && (
          <section className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Find Your Perfect Tutor
              </h1>
              <p className="text-lg text-muted-foreground">
                Compare tutors from multiple platforms in seconds
              </p>
            </div>
            <ExamSelector selectedExam={state.exam} onSelect={setExam} />
          </section>
        )}

        {/* Step 2: Location Input */}
        {!state.isSearching && !state.isDiscovering && state.exam && state.tutors.length === 0 && (
          <section className="mt-8">
            <LocationInput
              exam={state.exam}
              onSearch={handleSearch}
              isLoading={false}
            />
          </section>
        )}

        {/* Step 3: Discovering State */}
        {state.isDiscovering && state.exam && (
          <section>
            <DiscoveringState exam={state.exam} location={state.location} />
          </section>
        )}

        {/* Step 4: Agent Preview Grid */}
        {state.agents.length > 0 && (
          <section>
            <AgentPreviewGrid agents={state.agents} />
          </section>
        )}

        {/* Step 5: Tutor Results */}
        {(state.tutors.length > 0 || state.isSearching) && (
          <section>
            <TutorResultsGrid
              tutors={state.tutors}
              selectedIds={state.selectedTutorIds}
              onToggleSelect={toggleTutorSelection}
              isSearching={state.isSearching}
            />
          </section>
        )}
      </main>

      {/* Compare Button - Always visible when there are results */}
      {state.tutors.length > 0 && (
        <CompareButton
          selectedCount={state.selectedTutorIds.size}
          onCompare={() => setShowCompare(true)}
        />
      )}

      {/* Compare Dashboard */}
      {showCompare && selectedTutors.length >= 2 && (
        <CompareDashboard
          tutors={selectedTutors}
          onClose={() => setShowCompare(false)}
        />
      )}
    </div>
  );
};

export default Index;
