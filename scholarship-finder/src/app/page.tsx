"use client";

import { Header } from "@/components/Header";
import { SearchForm } from "@/components/SearchForm";
import { SearchResults } from "@/components/SearchResults";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { useScholarshipSearch } from "@/hooks/useScholarshipSearch";
import { ArrowLeft } from "lucide-react";

export default function Home() {
  const { isLoading, results, searchParams, searchState, search, reset } = useScholarshipSearch();

  // Show results as soon as any agent completes — don't wait for ALL_COMPLETE
  const liveScholarships = searchState.completedScholarships;
  const hasLiveResults = liveScholarships.length > 0;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12">
        {/* Search form — only when idle */}
        {!results && !isLoading && (
          <div className="animate-fade-in">
            <SearchForm onSearch={search} isLoading={isLoading} />
          </div>
        )}

        {/* Loading state — agents grid + live results as they come in */}
        {isLoading && (
          <LoadingAnimation searchState={searchState} />
        )}

        {/* Live results mid-search — show below agents as soon as any agent finishes */}
        {isLoading && hasLiveResults && (
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse inline-block" />
              Showing {liveScholarships.length} result{liveScholarships.length !== 1 ? "s" : ""} so far — more loading...
            </div>
            <SearchResults
              scholarships={liveScholarships}
              searchSummary=""
              searchParams={searchParams!}
            />
          </div>
        )}

        {/* Final results after all agents done */}
        {results && !isLoading && (
          <div className="space-y-8">
            <button
              onClick={reset}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              New Search
            </button>
            <SearchResults
              scholarships={results.scholarships.length > 0 ? results.scholarships : liveScholarships}
              searchSummary={results.searchSummary}
              searchParams={searchParams!}
            />
          </div>
        )}
      </main>
    </div>
  );
}
