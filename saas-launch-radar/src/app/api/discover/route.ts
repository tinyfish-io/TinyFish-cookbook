import { NextRequest, NextResponse } from "next/server";
import { TinyFish } from "@tiny-fish/sdk";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TINYFISH_API_KEY is not configured in the environment" },
      { status: 500 }
    );
  }

  try {
    const { niche } = await req.json();
    if (!niche) {
      return NextResponse.json({ error: "Niche is required" }, { status: 400 });
    }

    const client = new TinyFish({ apiKey });

    // Multi-angle searches to capture Product Hunt and HN Show cases
    const queries = [
      `site:producthunt.com "${niche}" 2026`,
      `site:news.ycombinator.com "Show HN" "${niche}" 2026`,
      `"${niche}" SaaS product launch 2026`
    ];

    const results = await Promise.all(
      queries.map(q => client.search.query({ query: q }).catch(() => ({ results: [] })))
    );

    const allResults = results.flatMap(r => r.results || []);

    // Deduplicate by URL and Domain
    const seenUrls = new Set<string>();
    const seenDomains = new Set<string>();
    const uniqueCandidates = [];

    for (const item of allResults) {
      if (!item.url) continue;
      try {
        const urlObj = new URL(item.url);
        const domain = urlObj.hostname.replace("www.", "");
        
        // Clean URL to prevent slight variations
        const cleanUrl = urlObj.origin + urlObj.pathname;

        if (seenUrls.has(cleanUrl)) continue;
        
        // Skip common social feeds or platforms that are not direct product landing pages
        if (
          domain === "google.com" || 
          domain === "youtube.com" || 
          domain === "twitter.com" || 
          domain === "x.com" || 
          domain === "facebook.com" || 
          domain === "linkedin.com" ||
          domain === "github.com"
        ) continue;

        seenUrls.add(cleanUrl);
        
        // Treat producthunt.com and news.ycombinator.com as valid sources even if we see them multiple times,
        // but for normal domains, keep them unique
        if (domain !== "producthunt.com" && domain !== "news.ycombinator.com") {
          if (seenDomains.has(domain)) continue;
          seenDomains.add(domain);
        }

        uniqueCandidates.push({
          title: item.title || "Unknown Product",
          snippet: item.snippet || "",
          url: item.url,
          domain
        });
      } catch {
        continue;
      }
    }

    // Limit to top 6 prime candidates to keep scraping latency fast and efficient
    const topCandidates = uniqueCandidates.slice(0, 6);

    return NextResponse.json({ candidates: topCandidates });
  } catch (error) {
    console.error("Error in discover route:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
