import { TinyFish } from "@tiny-fish/sdk";
import type { CodeAnalysis, SearchQuery, SearchResult } from "./types";
import { MAX_AGENTS } from "./constants";

const halfTarget = Math.ceil(MAX_AGENTS / 2); // 5 from each platform

/**
 * Use TinyFish Search API to find real GitHub and Stack Overflow results
 * for each generated query.
 */
export async function executeSearches(
  queries: SearchQuery[],
  _analysis?: CodeAnalysis
): Promise<SearchResult[]> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) throw new Error("Missing TINYFISH_API_KEY");

  const client = new TinyFish({ apiKey });

  const ghQueries = queries.filter((q) => q.target === "github").slice(0, halfTarget);
  const soQueries = queries.filter((q) => q.target === "stackoverflow").slice(0, halfTarget);

  const results: SearchResult[] = [];

  // Run all searches in parallel
  await Promise.allSettled([
    ...ghQueries.map(async (q) => {
      try {
        const res = await client.search.query({
          query: `site:github.com ${q.query}`,
        });
        for (const r of res.results || []) {
          results.push({
            platform: "github",
            url: r.url,
            title: r.title || `GitHub: ${q.query}`,
            snippet: r.snippet || q.heuristic,
          });
        }
      } catch {
        // Fallback to constructed URL if Search API fails
        results.push({
          platform: "github",
          url: `https://github.com/search?q=${encodeURIComponent(q.query)}&type=repositories&s=stars&o=desc`,
          title: `GitHub: ${q.query}`,
          snippet: q.heuristic,
        });
      }
    }),
    ...soQueries.map(async (q) => {
      try {
        const res = await client.search.query({
          query: `site:stackoverflow.com ${q.query}`,
        });
        for (const r of res.results || []) {
          results.push({
            platform: "stackoverflow",
            url: r.url,
            title: r.title || `Stack Overflow: ${q.query}`,
            snippet: r.snippet || q.heuristic,
          });
        }
      } catch {
        // Fallback to constructed URL if Search API fails
        results.push({
          platform: "stackoverflow",
          url: `https://stackoverflow.com/search?q=${encodeURIComponent(q.query)}&tab=votes`,
          title: `Stack Overflow: ${q.query}`,
          snippet: q.heuristic,
        });
      }
    }),
  ]);

  return results;
}
