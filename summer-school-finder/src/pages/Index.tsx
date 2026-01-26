import { useState, useMemo } from 'react';
import { GraduationCap, ChevronDown, GitCompare, ArrowLeft, Loader2, Fish } from 'lucide-react';
import { SearchForm } from '@/components/SearchForm';
import { LiveAgentCard } from '@/components/LiveAgentCard';
import { ResultCard } from '@/components/ResultCard';
import { CompareModal } from '@/components/CompareModal';
import { Button } from '@/components/ui/button';
import { useSummerSchoolSearch } from '@/hooks/useSummerSchoolSearch';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const { agents, results, isSearching, error, search, clearResults } = useSummerSchoolSearch();
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const { toast } = useToast();

  const activeAgents = agents.filter(a => a.status === 'running' || a.status === 'pending');
  const hasResults = results.length > 0;
  const hasActiveAgents = activeAgents.length > 0;
  const showAgents = agents.length > 0;

  // Show loading when searching but agents haven't started yet
  const isLoadingAgents = hasSearched && isSearching && agents.length === 0;

  const selectedSchools = useMemo(() => {
    return results.filter((_, idx) => selectedIndices.has(idx));
  }, [results, selectedIndices]);

  const handleSearch = (data: any) => {
    setHasSearched(true);
    setSelectedIndices(new Set());
    search(data);
  };

  const handleNewSearch = () => {
    setHasSearched(false);
    setSelectedIndices(new Set());
    clearResults();
  };

  const handleSelect = (index: number, selected: boolean) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (selected) {
        next.add(index);
      } else {
        next.delete(index);
      }
      return next;
    });
  };

  const handleCompareClick = () => {
    if (selectedIndices.size === 0) {
      toast({
        title: "No programs selected",
        description: "Please select at least 2 programs to compare by clicking on the cards.",
        variant: "destructive",
      });
      return;
    }
    if (selectedIndices.size === 1) {
      toast({
        title: "Select more programs",
        description: "Please select at least 2 programs to compare.",
        variant: "destructive",
      });
      return;
    }
    setIsCompareOpen(true);
  };

  const scrollToResults = () => {
    document.getElementById('results-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Show search form only if not searched yet
  const showSearchForm = !hasSearched;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasSearched && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewSearch}
                  className="mr-2"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="w-10 h-10 rounded-xl gradient-orange flex items-center justify-center shadow-orange">
                <GraduationCap className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Summer School Finder</h1>
                <p className="text-xs text-muted-foreground">Discover your perfect program</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasSearched && (
                <Button variant="outline" onClick={handleNewSearch}>
                  New Search
                </Button>
              )}
              {/* Compare button always visible when results exist */}
              {hasResults && (
                <Button
                  onClick={handleCompareClick}
                  className="gradient-orange text-primary-foreground shadow-orange"
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare {selectedIndices.size > 0 && `(${selectedIndices.size})`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search Form Section - Only show when not searched */}
      {showSearchForm && (
        <section className="gradient-orange-subtle py-12 md:py-16 animate-fade-in">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-3">
                Find Your Perfect <span className="text-gradient-orange">Summer School</span>
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                Search and compare summer programs worldwide. Our AI-powered agents scan multiple websites to find the best opportunities for you.
              </p>
            </div>

            <SearchForm onSearch={handleSearch} isSearching={isSearching} />
          </div>
        </section>
      )}

      {/* Loading State - Show between search and agents starting */}
      {isLoadingAgents && (
        <section className="py-24 animate-fade-in">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative mb-6">
                <div className="w-20 h-20 rounded-full border-4 border-primary/20 border-t-primary animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Fish className="w-8 h-8 text-primary" />
                </div>
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Loading...</h3>
              <p className="text-muted-foreground mb-4">Discovering summer school programs</p>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Powered by</span>
                <span className="font-semibold text-primary">TinyFish Web Agent</span>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Live Agents Section - Only show active agents */}
      {hasActiveAgents && !isLoadingAgents && (
        <section className="py-8 animate-fade-in">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  Searching... ({activeAgents.length} agents active)
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Powered by</span>
                  <span className="font-medium text-primary">TinyFish Web Agent</span>
                </div>
              </div>
              {hasResults && (
                <Button variant="ghost" onClick={scrollToResults} className="text-primary">
                  <ChevronDown className="w-4 h-4 mr-2" />
                  Scroll to Results ({results.length})
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {activeAgents.map((agent) => (
                <LiveAgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Error State */}
      {error && !isSearching && (
        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="text-center py-8 bg-destructive/5 rounded-xl border border-destructive/20">
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" onClick={handleNewSearch} className="mt-4">
                Try Another Search
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Results Section */}
      {hasResults && (
        <section id="results-section" className="py-8 md:py-12 border-t border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  Results ({results.length})
                </h3>
                <p className="text-sm text-muted-foreground">
                  Click on cards to select and compare programs
                </p>
              </div>
              <Button
                onClick={handleCompareClick}
                variant="outline"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare {selectedIndices.size > 0 ? `(${selectedIndices.size})` : 'Programs'}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.map((school, idx) => (
                <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
                  <ResultCard
                    school={school}
                    isSelected={selectedIndices.has(idx)}
                    onSelect={(selected) => handleSelect(idx, selected)}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Empty State - Only show when not searched */}
      {showSearchForm && (
        <section className="py-16">
          <div className="container mx-auto px-4 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-orange-subtle flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-2">
              Ready to find your perfect program
            </h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Fill in the search form above to discover summer school programs tailored to your interests.
            </p>
          </div>
        </section>
      )}

      {/* Compare Modal */}
      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        schools={selectedSchools}
      />
    </div>
  );
};

export default Index;
