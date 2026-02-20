import { Header } from "@/components/Header";
import { SearchForm } from "@/components/SearchForm";
import { SearchResults } from "@/components/SearchResults";
import { LoadingAnimation } from "@/components/LoadingAnimation";
import { useScholarshipSearch } from "@/hooks/useScholarshipSearch";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Index = () => {
  const { isLoading, results, searchParams, searchState, search, reset } = useScholarshipSearch();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        {/* Show search form when no results or loading */}
        {!results && !isLoading && (
          <div className="animate-fade-in">
            <SearchForm onSearch={search} isLoading={isLoading} />
          </div>
        )}

        {/* Loading state with parallel Mino agents */}
        {isLoading && (
          <LoadingAnimation searchState={searchState} />
        )}

        {/* Results */}
        {results && !isLoading && (
          <div className="space-y-8">
            <Button
              variant="ghost"
              onClick={reset}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4" />
              New Search
            </Button>
            
            <SearchResults
              scholarships={results.scholarships}
              searchSummary={results.searchSummary}
              searchParams={searchParams!}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-12">
        <div className="container mx-auto px-4 text-center text-muted-foreground text-sm">
          <p>powered by <span className="font-semibold text-primary">mino.ai</span></p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
