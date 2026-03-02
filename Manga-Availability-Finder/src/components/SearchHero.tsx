import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface SearchHeroProps {
  onSearch: (query: string) => void;
  isSearching: boolean;
}

export function SearchHero({ onSearch, isSearching }: SearchHeroProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <div className="relative min-h-[50vh] flex flex-col items-center justify-center px-4 py-16">
      {/* Background glow effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-secondary/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/5 rounded-full blur-[150px]" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-3xl w-full text-center space-y-8">
        {/* Title */}
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted/50 border border-border text-sm text-muted-foreground backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-primary" />
            <span>AI-Powered Manga Discovery</span>
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight">
            <span className="text-foreground">Manga</span>
            <span className="gradient-text">Finder</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto">
            Search across multiple manga & webtoon sites simultaneously using AI-powered web agents
          </p>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSubmit} className="relative">
          <div className="flex flex-col sm:flex-row gap-3 max-w-2xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Enter manga or webtoon title..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-12 h-14 text-lg bg-card/50 border-border/50 backdrop-blur-sm focus:bg-card"
                disabled={isSearching}
              />
            </div>
            <Button
              type="submit"
              variant="cyber"
              size="xl"
              disabled={isSearching || !query.trim()}
              className="min-w-[140px]"
            >
              {isSearching ? (
                <>
                  <span className="animate-pulse">Searching</span>
                  <span className="flex gap-0.5">
                    <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
                  </span>
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Search
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Example searches */}
        <div className="flex flex-wrap justify-center gap-2">
          <span className="text-sm text-muted-foreground">Try:</span>
          {["One Piece", "Solo Leveling", "Chainsaw Man", "Tower of God"].map((example) => (
            <button
              key={example}
              onClick={() => {
                setQuery(example);
                onSearch(example);
              }}
              disabled={isSearching}
              className="px-3 py-1 text-sm rounded-full bg-muted/50 border border-border hover:border-primary/50 hover:bg-muted transition-all duration-200 disabled:opacity-50"
            >
              {example}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
