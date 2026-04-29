"use client";

import { useState, useMemo } from "react";
import {
  GraduationCap,
  ChevronDown,
  GitCompare,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { SearchForm } from "@/components/SearchForm";
import { LiveAgentCard } from "@/components/LiveAgentCard";
import { ResultCard } from "@/components/ResultCard";
import { CompareModal } from "@/components/CompareModal";
import { Button } from "@/components/ui/button";
import { useSummerSchoolSearch } from "@/hooks/useSummerSchoolSearch";

export default function Home() {
  const { agents, results, isSearching, error, search, clearResults } =
    useSummerSchoolSearch();
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    new Set()
  );
  const [isCompareOpen, setIsCompareOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const activeAgents = agents.filter(
    (a) => a.status === "running" || a.status === "pending"
  );
  const hasResults = results.length > 0;
  const hasActiveAgents = activeAgents.length > 0;
  // Loading state = searched but agents haven't been created yet
  const isLoadingAgents = hasSearched && isSearching && agents.length === 0;
  const showSearchForm = !hasSearched;

  const selectedSchools = useMemo(
    () => results.filter((_, idx) => selectedIndices.has(idx)),
    [results, selectedIndices]
  );

  const handleSearch = (data: Parameters<typeof search>[0]) => {
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
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      selected ? next.add(index) : next.delete(index);
      return next;
    });
  };

  const handleCompareClick = () => {
    if (selectedIndices.size < 2) {
      setToastMsg("Please select at least 2 programs to compare.");
      setTimeout(() => setToastMsg(null), 3000);
      return;
    }
    setIsCompareOpen(true);
  };

  const scrollToResults = () => {
    document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Toast */}
      {toastMsg && (
        <div className="fixed top-4 right-4 z-50 bg-destructive text-destructive-foreground px-4 py-3 rounded-lg shadow-lg text-sm animate-fade-in">
          {toastMsg}
        </div>
      )}

      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {hasSearched && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleNewSearch}
                  className="mr-1"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              )}
              <div className="w-9 h-9 rounded-xl gradient-orange flex items-center justify-center shadow-orange">
                <GraduationCap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">
                  Summer School Finder
                </h1>
                <p className="text-xs text-muted-foreground">
                  Discover your perfect program
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {hasSearched && (
                <Button variant="outline" size="sm" onClick={handleNewSearch}>
                  New Search
                </Button>
              )}
              {hasResults && (
                <Button
                  onClick={handleCompareClick}
                  size="sm"
                  className="gradient-orange text-white shadow-orange"
                >
                  <GitCompare className="w-4 h-4 mr-2" />
                  Compare {selectedIndices.size > 0 && `(${selectedIndices.size})`}
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Search Form — compact */}
      {showSearchForm && (
        <section className="gradient-orange-subtle py-8 animate-fade-in">
          <div className="container mx-auto px-4 max-w-3xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
                Find Your Perfect{" "}
                <span className="text-gradient-orange">Summer School</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-xl mx-auto">
                AI-powered agents scan multiple universities to find the best programs for you.
              </p>
            </div>
            <SearchForm onSearch={handleSearch} isSearching={isSearching} />
          </div>
        </section>
      )}

      {/* Loading State — discovering URLs */}
      {isLoadingAgents && (
        <section className="py-16 animate-fade-in">
          <div className="container mx-auto px-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="relative mb-4">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 text-primary" />
                </div>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-1">
                Discovering programs...
              </h3>
              <p className="text-sm text-muted-foreground">
                Finding the best summer schools for your criteria
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Live Agents — show while searching */}
      {hasActiveAgents && !isLoadingAgents && (
        <section className="py-6 animate-fade-in border-b border-border">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold text-foreground">
                Searching{" "}
                <span className="text-muted-foreground font-normal text-sm">
                  ({activeAgents.length} agents active)
                </span>
              </h3>
              {hasResults && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={scrollToResults}
                  className="text-primary"
                >
                  <ChevronDown className="w-4 h-4 mr-1" />
                  {results.length} result{results.length !== 1 ? "s" : ""} so far
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {activeAgents.map((agent) => (
                <LiveAgentCard key={agent.id} agent={agent} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Error State */}
      {error && !isSearching && (
        <section className="py-10">
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

      {/* Results — shown as soon as ANY agent completes, even while others still run */}
      {hasResults && (
        <section
          id="results-section"
          className="py-8 md:py-10"
        >
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  Results{" "}
                  <span className="text-muted-foreground font-normal text-base">
                    ({results.length}{hasActiveAgents ? "+" : ""})
                  </span>
                </h3>
                <p className="text-sm text-muted-foreground">
                  {hasActiveAgents
                    ? "More results loading — click cards to compare"
                    : "Click cards to select and compare programs"}
                </p>
              </div>
              <Button
                onClick={handleCompareClick}
                variant="outline"
                size="sm"
                className="border-primary text-primary hover:bg-primary hover:text-white"
              >
                <GitCompare className="w-4 h-4 mr-2" />
                Compare{" "}
                {selectedIndices.size > 0 ? `(${selectedIndices.size})` : "Programs"}
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {results.map((school, idx) => (
                <div
                  key={idx}
                  className="animate-fade-in"
                  style={{ animationDelay: `${idx * 80}ms` }}
                >
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

      {/* Empty State */}
      {showSearchForm && (
        <section className="py-12">
          <div className="container mx-auto px-4 text-center">
            <div className="w-14 h-14 rounded-2xl gradient-orange-subtle flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-base font-medium text-foreground mb-2">
              Ready to find your perfect program
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Fill in the form above to discover summer school programs tailored to your interests.
            </p>
          </div>
        </section>
      )}

      <CompareModal
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        schools={selectedSchools}
      />
    </div>
  );
}
