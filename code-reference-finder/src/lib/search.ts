import type { CodeAnalysis, SearchQuery, SearchResult } from "./types";
import { MAX_AGENTS } from "./constants";

const halfTarget = Math.ceil(MAX_AGENTS / 2); // 5 from each platform

/**
 * Build direct search URLs for GitHub and Stack Overflow
 * from Groq-generated queries — no Search API needed.
 */
export async function executeSearches(
  queries: SearchQuery[],
  _analysis?: CodeAnalysis
): Promise<SearchResult[]> {
  const ghQueries = queries.filter((q) => q.target === "github").slice(0, halfTarget);
  const soQueries = queries.filter((q) => q.target === "stackoverflow").slice(0, halfTarget);

  const ghResults: SearchResult[] = ghQueries.map((q) => ({
    platform: "github" as const,
    url: `https://github.com/search?q=${encodeURIComponent(q.query)}&type=repositories&s=stars&o=desc`,
    title: `GitHub: ${q.query}`,
    snippet: q.heuristic,
  }));

  const soResults: SearchResult[] = soQueries.map((q) => ({
    platform: "stackoverflow" as const,
    url: `https://stackoverflow.com/search?q=${encodeURIComponent(q.query)}&tab=votes`,
    title: `Stack Overflow: ${q.query}`,
    snippet: q.heuristic,
  }));

  return [...ghResults, ...soResults];
}
