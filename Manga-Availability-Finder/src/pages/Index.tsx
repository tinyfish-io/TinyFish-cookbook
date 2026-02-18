import { SearchHero } from "@/components/SearchHero";
import { AgentCard } from "@/components/AgentCard";
import { ResultsSummary } from "@/components/ResultsSummary";
import { useMangaSearch } from "@/hooks/useMangaSearch";

const Index = () => {
  const { isSearching, agents, mangaTitle, search } = useMangaSearch();

  return (
    <div className="min-h-screen bg-background cyber-grid">
      {/* Hero Section */}
      <SearchHero onSearch={search} isSearching={isSearching} />

      {/* Results Section */}
      {agents.length > 0 && (
        <div className="container mx-auto px-4 pb-16">
          <div className="grid lg:grid-cols-[1fr_350px] gap-8">
            {/* Agent Cards Grid */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-2xl font-bold text-foreground">
                  Search Agents
                </h2>
                <span className="text-sm text-muted-foreground">
                  {agents.length} site{agents.length !== 1 ? "s" : ""} being searched
                </span>
              </div>

              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {agents.map((agent, index) => (
                  <div
                    key={agent.id}
                    className="animate-fade-in"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <AgentCard
                      siteName={agent.siteName}
                      siteUrl={agent.siteUrl}
                      status={agent.status}
                      statusMessage={agent.statusMessage}
                      streamingUrl={agent.streamingUrl}
                      mangaTitle={mangaTitle}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Results Summary Sidebar */}
            <div className="lg:sticky lg:top-8 h-fit">
              <ResultsSummary
                mangaTitle={mangaTitle}
                results={agents.map((a) => ({
                  siteName: a.siteName,
                  siteUrl: a.siteUrl,
                  status: a.status,
                }))}
                isSearching={isSearching}
              />
            </div>
          </div>
        </div>
      )}

      {/* Empty state hint */}
      {agents.length === 0 && !isSearching && (
        <div className="container mx-auto px-4 pb-16 text-center">
          <div className="max-w-md mx-auto p-8 rounded-2xl bg-card/30 border border-border/50 backdrop-blur-sm">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-neon flex items-center justify-center">
              <span className="text-3xl">📚</span>
            </div>
            <h3 className="font-display text-xl font-semibold mb-2">Ready to Search</h3>
            <p className="text-muted-foreground">
              Enter a manga or webtoon title above to search across multiple sites simultaneously
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Index;
