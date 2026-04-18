"use client";

import { Header } from "@/components/Header";
import { SearchForm } from "@/components/SearchForm";
import { SearchResults } from "@/components/SearchResults";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { useScholarshipSearch } from "@/hooks/useScholarshipSearch";
import { ArrowLeft } from "lucide-react";

export default function Home() {
  const { isLoading, results, searchParams, searchState, search, reset } = useScholarshipSearch();

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

        {/* Loading state — agents grid only */}
        {isLoading && (
          <LoadingAnimation searchState={searchState} />
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
              scholarships={results.scholarships}
              searchSummary={results.searchSummary}
              searchParams={searchParams!}
            />
          </div>
        )}
      </main>
    </div>
  );
}
