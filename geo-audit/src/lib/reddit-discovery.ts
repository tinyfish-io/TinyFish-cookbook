import { deriveBrandFromUrl } from "@/lib/llm-citations";
import { runTinyFishWithGoal } from "@/lib/tinyfish";

const DEFAULT_MAX_POSTS = 8;
const DEFAULT_ANALYZE_COUNT = 0;
const REDDIT_DISCOVERY_TIMEOUT_MS = 120_000;

export type RedditPostEntry = {
  url: string;
  title?: string;
  summary?: string;
  sentiment?: string;
};

export type RedditDiscoveryResult = {
  redditPostUrls: RedditPostEntry[];
  error?: string;
};

function buildRedditSearchUrl(brandOrQuery: string): string {
  const q = encodeURIComponent(brandOrQuery);
  return `https://www.reddit.com/search/?q=${q}&type=link`;
}

function buildRedditDiscoveryGoal(maxPosts: number): string {
  return [
    "You are on a Reddit search results page.",
    `List the first ${maxPosts} post URLs from the search results (each post link, not comments).`,
    "Return ONLY a JSON object with a single key: redditPostUrls, an array of full post URLs (strings).",
    "Example: {\"redditPostUrls\":[\"https://www.reddit.com/r/.../comments/...\", ...]}",
  ].join(" ");
}

function buildRedditAnalysisGoal(): string {
  return [
    "Summarize what this Reddit thread says about the company or product discussed.",
    "State whether the sentiment is positive, negative, mixed, or neutral.",
    "Return ONLY a JSON object with keys: summary (string, brief), sentiment (one of: positive, negative, mixed, neutral).",
  ].join(" ");
}

function parseRedditPostUrls(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const obj = payload as Record<string, unknown>;
  const arr = obj.redditPostUrls;
  if (!Array.isArray(arr)) return [];
  const urls = arr
    .filter((v): v is string => typeof v === "string")
    .map((u) => u.trim())
    .filter((u) => u.startsWith("http"));
  const seen = new Set<string>();
  return urls.filter((u) => {
    const norm = u.toLowerCase();
    if (seen.has(norm)) return false;
    seen.add(norm);
    return true;
  });
}

function parseRedditAnalysis(payload: unknown): { summary?: string; sentiment?: string } {
  if (!payload || typeof payload !== "object") return {};
  const obj = payload as Record<string, unknown>;
  const summary = typeof obj.summary === "string" ? obj.summary : undefined;
  const sentiment = typeof obj.sentiment === "string" ? obj.sentiment : undefined;
  return { summary, sentiment };
}

/**
 * Discover Reddit posts mentioning the company (via TinyFish on Reddit search),
 * and optionally analyze a few for summary/sentiment.
 */
export async function runRedditDiscovery(
  companyUrl: string,
  options: { maxPosts?: number; analyzeCount?: number; timeoutMs?: number } = {}
): Promise<RedditDiscoveryResult> {
  const maxPosts = options.maxPosts ?? DEFAULT_MAX_POSTS;
  const analyzeCount = Math.min(options.analyzeCount ?? DEFAULT_ANALYZE_COUNT, 3);
  const timeoutMs = options.timeoutMs ?? REDDIT_DISCOVERY_TIMEOUT_MS;

  const { brand, domain } = deriveBrandFromUrl(companyUrl);
  const query = brand !== domain ? `${brand} ${domain}` : brand;
  const redditSearchUrl = buildRedditSearchUrl(query);
  const discoveryGoal = buildRedditDiscoveryGoal(maxPosts);

  try {
    const payload = await runTinyFishWithGoal(redditSearchUrl, discoveryGoal, {
      timeoutMs,
      maxRetries: 0,
      browserProfile: "stealth",
    });
    const urls = parseRedditPostUrls(payload).slice(0, maxPosts);

    const entries: RedditPostEntry[] = urls.map((url) => ({ url }));

    if (analyzeCount > 0 && entries.length > 0) {
      const analysisGoal = buildRedditAnalysisGoal();
      for (let i = 0; i < Math.min(analyzeCount, entries.length); i += 1) {
        try {
          const analysisPayload = await runTinyFishWithGoal(entries[i].url, analysisGoal, {
            timeoutMs: Math.min(60000, timeoutMs),
            maxRetries: 0,
            browserProfile: "stealth",
          });
          const { summary, sentiment } = parseRedditAnalysis(analysisPayload);
          entries[i] = { ...entries[i], summary, sentiment };
        } catch {
          // leave summary/sentiment undefined on failure
        }
      }
    }

    return { redditPostUrls: entries };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      redditPostUrls: [],
      error: message,
    };
  }
}
