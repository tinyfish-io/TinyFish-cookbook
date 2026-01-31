import { CheckCircle2, XCircle, Loader2, BookOpen } from "lucide-react";
import { AgentStatus } from "./AgentCard";

interface SearchResult {
  siteName: string;
  siteUrl: string;
  status: AgentStatus;
}

interface ResultsSummaryProps {
  mangaTitle: string;
  results: SearchResult[];
  isSearching: boolean;
}

export function ResultsSummary({ mangaTitle, results, isSearching }: ResultsSummaryProps) {
  const foundCount = results.filter((r) => r.status === "found").length;
  const searchingCount = results.filter((r) => r.status === "searching").length;
  const completedCount = results.filter((r) => r.status === "found" || r.status === "not_found" || r.status === "error").length;

  if (results.length === 0) return null;

  return (
    <div className="bg-card/50 border border-border rounded-xl p-6 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-xl bg-gradient-neon flex items-center justify-center">
          <BookOpen className="w-6 h-6 text-primary-foreground" />
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">
            Results for "{mangaTitle}"
          </h2>
          <p className="text-sm text-muted-foreground">
            {isSearching ? (
              <>Searching {searchingCount} site{searchingCount !== 1 ? "s" : ""}...</>
            ) : (
              <>Searched {results.length} site{results.length !== 1 ? "s" : ""}</>
            )}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-foreground">{completedCount} / {results.length}</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-neon transition-all duration-500 ease-out"
            style={{ width: `${(completedCount / results.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 rounded-lg bg-success/10 border border-success/20">
          <div className="flex items-center justify-center gap-1 text-success mb-1">
            <CheckCircle2 className="w-4 h-4" />
            <span className="font-display font-bold text-xl">{foundCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">Found</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-secondary/10 border border-secondary/20">
          <div className="flex items-center justify-center gap-1 text-secondary mb-1">
            <Loader2 className={`w-4 h-4 ${searchingCount > 0 ? "animate-spin" : ""}`} />
            <span className="font-display font-bold text-xl">{searchingCount}</span>
          </div>
          <p className="text-xs text-muted-foreground">Searching</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
            <XCircle className="w-4 h-4" />
            <span className="font-display font-bold text-xl">
              {results.filter((r) => r.status === "not_found").length}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">Not Found</p>
        </div>
      </div>

      {/* Results list */}
      <div className="space-y-2 max-h-64 overflow-y-auto scrollbar-cyber">
        {results.map((result) => (
          <div
            key={result.siteUrl}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
          >
            <div className="flex items-center gap-3 min-w-0">
              {result.status === "found" && (
                <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
              )}
              {result.status === "not_found" && (
                <XCircle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              {result.status === "searching" && (
                <Loader2 className="w-5 h-5 text-secondary animate-spin shrink-0" />
              )}
              {result.status === "error" && (
                <XCircle className="w-5 h-5 text-destructive shrink-0" />
              )}
              {result.status === "idle" && (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground shrink-0" />
              )}
              <span className="text-sm font-medium truncate">{result.siteName}</span>
            </div>
            {result.status === "found" && (
              <a
                href={result.siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline shrink-0"
              >
                Read Now →
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
