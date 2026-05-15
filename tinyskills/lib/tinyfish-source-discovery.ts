import type { SourceType, IdentifiedSource } from "@/types";
import { getTinyFishClient } from "@/lib/tinyfish-client";

function searchQueryForType(type: SourceType, topic: string): string {
  const q = topic.trim();
  switch (type) {
    case "docs":
      return `${q} official documentation programming`;
    case "github":
      return `site:github.com ${q}`;
    case "stackoverflow":
      return `site:stackoverflow.com ${q}`;
    case "blog":
      return `${q} developer tutorial blog`;
    default:
      return q;
  }
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    return u.toString();
  } catch {
    return url;
  }
}

/**
 * Discover URLs per source type using TinyFish Search API (parallel queries).
 */
export async function identifySourcesViaTinyFishSearch(
  topic: string,
  enabledTypes: SourceType[],
  maxPerType: number,
  apiKey?: string,
): Promise<IdentifiedSource[]> {
  const client = await getTinyFishClient(apiKey);

  const responses = await Promise.all(
    enabledTypes.map((type) =>
      client.search.query({
        query: searchQueryForType(type, topic),
      }),
    ),
  );

  const seen = new Set<string>();
  const out: IdentifiedSource[] = [];

  for (let i = 0; i < enabledTypes.length; i++) {
    const type = enabledTypes[i];
    const res = responses[i];
    let n = 0;
    for (const r of res.results) {
      if (n >= maxPerType) break;
      const url = normalizeUrl(r.url);
      if (seen.has(url)) continue;
      seen.add(url);
      out.push({
        url,
        type,
        title: r.title,
        reason: r.snippet || `TinyFish Search hit #${r.position} for “${res.query}”.`,
      });
      n++;
    }
  }

  return out;
}
