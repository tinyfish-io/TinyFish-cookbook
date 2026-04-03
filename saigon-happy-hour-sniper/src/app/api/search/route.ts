export const runtime = "nodejs";
export const maxDuration = 800; // Vercel Pro allows up to 800s for Node.js runtime

import { TinyFish } from "@tiny-fish/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { DISTRICT_SITES, GOAL_PROMPT, REQUEST_TIMEOUT_MS, CACHE_TTL_MS } from "@/lib/district-sites";
import type { District } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type SearchBody = {
  district: District;
  useCache?: boolean;
};

interface CacheRow {
  website: string;
  venue_data: unknown;
  scraped_at: string;
}

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

const elapsedSeconds = (startedAt: number) => ((Date.now() - startedAt) / 1000).toFixed(1);

// ---------------------------------------------------------------------------
// Supabase cache helpers (all gracefully degrade on failure)
// ---------------------------------------------------------------------------

/** Try to get Supabase client — returns null if env vars missing */
function tryGetSupabase(): SupabaseClient | null {
  try {
    return getSupabaseAdmin();
  } catch {
    console.warn("[CACHE] Supabase not configured — caching disabled");
    return null;
  }
}

/** Get fresh cached results for a district (within TTL) */
async function getCachedResults(
  supabase: SupabaseClient,
  district: string,
): Promise<Map<string, CacheRow>> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from("deal_cache")
    .select("website, venue_data, scraped_at")
    .eq("district", district)
    .gte("scraped_at", cutoff);

  if (error) {
    console.error("[CACHE] Read error:", error.message);
    return new Map();
  }

  const map = new Map<string, CacheRow>();
  for (const row of data ?? []) {
    map.set(row.website, row as CacheRow);
  }
  return map;
}

/** Upsert a single scrape result to cache (fire-and-forget) */
async function cacheResult(
  supabase: SupabaseClient,
  district: string,
  website: string,
  venueData: unknown,
): Promise<void> {
  const { error } = await supabase
    .from("deal_cache")
    .upsert(
      {
        district,
        website,
        venue_data: venueData,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: "district,website", ignoreDuplicates: false },
    );

  if (error) {
    console.error(`[CACHE] Write error for ${website}:`, error.message);
  }
}

// ---------------------------------------------------------------------------
// TinyFish SSE scraper
// ---------------------------------------------------------------------------

async function runTinyFishSseForSite(
  url: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  console.log(`[TINYFISH] Starting: ${url}`);

  try {
    const client = new TinyFish({ timeout: REQUEST_TIMEOUT_MS });
    let resultJson: unknown;

    const stream = await client.agent.stream(
      {
        url,
        goal: GOAL_PROMPT,
      },
      {
        onStreamingUrl: (event) => {
          console.log("[TINYFISH] streaming_url", event.streaming_url, event.run_id);
          enqueue({
            type: "STREAMING_URL",
            siteUrl: url,
            streamingUrl: event.streaming_url,
          });
        },
        onComplete: (event) => {
          resultJson = event.result;
        },
      },
    );

    for await (const event of stream) {
      if (event.type === "COMPLETE") {
        resultJson = event.result;
      }
    }

    if (resultJson) {
      enqueue({
        type: "VENUE_RESULT",
        siteUrl: url,
        venue: resultJson,
      });
      console.log(`[TINYFISH] Complete: ${url} (${elapsedSeconds(startedAt)}s)`);
      return true;
    }

    throw new Error("TinyFish stream finished without COMPLETED resultJson");
  } catch (error) {
    console.error(`[TINYFISH] Failed: ${url}`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST handler — cache-aside + SSE streaming
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  let body: SearchBody;

  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const district = body.district;
  const useCache = body.useCache ?? false;
  const sites = DISTRICT_SITES[district];

  if (!sites?.length) {
    return Response.json({ error: "Unsupported district" }, { status: 400 });
  }

  // Keep direct env read so missing Supabase vars never break search
  if (!process.env.TINYFISH_API_KEY) {
    return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });
  }

  // ---- Cache lookup (graceful degradation) ----
  const supabase = tryGetSupabase();
  let cached = new Map<string, CacheRow>();

  if (supabase && useCache) {
    try {
      cached = await getCachedResults(supabase, district);
      console.log(`[CACHE] ${cached.size}/${sites.length} sites cached for ${district}`);
    } catch (err) {
      console.error("[CACHE] Lookup failed:", err);
    }
  }

  // Partition sites into cached vs uncached
  const cachedSites: { url: string; row: CacheRow }[] = [];
  const uncachedSites: string[] = [];

  for (const url of sites) {
    const row = cached.get(url);
    if (row) {
      cachedSites.push({ url, row });
    } else {
      uncachedSites.push(url);
    }
  }

  const searchStartedAt = Date.now();
  console.log(`[SEARCH] district=${district} total=${sites.length} cached=${cachedSites.length} uncached=${uncachedSites.length}`);

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      // Send immediate ping to establish stream and prevent proxy buffering
      controller.enqueue(encoder.encode(": ping\n\n"));

      const enqueue = (payload: unknown) => {
        controller.enqueue(encoder.encode(sseData(payload)));
      };

      // ---- Stream cached results instantly ----
      for (const { row } of cachedSites) {
        enqueue({
          type: "VENUE_RESULT",
          venue: row.venue_data,
          source: "cache",
          cached_at: row.scraped_at,
        });
      }

      // ---- Scrape uncached sites via TinyFish ----
      let liveSucceeded = 0;

      if (uncachedSites.length > 0) {
        const tasks = uncachedSites.map((url) =>
          (async () => {
            // Per-site enqueue wrapper: adds source + fires cache upsert
            const siteEnqueue = (payload: unknown) => {
              const event = payload as Record<string, unknown>;
              if (event.type === "VENUE_RESULT") {
                // Cache FIRST — must persist even if client disconnected
                if (supabase && useCache && event.venue) {
                  cacheResult(supabase, district, url, event.venue).catch(() => {});
                }
                enqueue({ ...event, source: "live" });
              } else {
                enqueue(payload);
              }
            };

            return runTinyFishSseForSite(url, siteEnqueue);
          })(),
        );

        const settled = await Promise.allSettled(tasks);
        liveSucceeded = settled.filter(
          (result): result is PromiseFulfilledResult<boolean> =>
            result.status === "fulfilled" && result.value,
        ).length;
      }

      enqueue({
        type: "SEARCH_COMPLETE",
        total: sites.length,
        succeeded: cachedSites.length + liveSucceeded,
        cached: cachedSites.length,
        elapsed: `${elapsedSeconds(searchStartedAt)}s`,
      });

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
