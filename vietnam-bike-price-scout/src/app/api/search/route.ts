export const runtime = "nodejs";
export const maxDuration = 800; // Vercel Pro allows up to 800s for Node.js runtime

import { getSupabaseAdmin } from "@/lib/supabase";
import type { SupabaseClient } from "@supabase/supabase-js";

const MINO_SSE_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";
const REQUEST_TIMEOUT_MS = 780_000;
const REQUEST_STAGGER_MS = 500;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const CITY_SITES: Record<string, string[]> = {
  hcmc: [
    "https://www.tigitmotorbikes.com/prices",
    "https://wheelie-saigon.com/scooter-motorcycle-rental-hcmc-daily-weekly-or-monthly/",
    "https://saigonmotorcycles.com/rentals/",
    "https://stylemotorbikes.com",
    "https://theextramile.co/city-rental-prices/",
  ],
  hanoi: [
    "https://motorbikerentalinhanoi.com/",
    "https://offroadvietnam.com",
    "https://rentbikehanoi.com",
    "https://book2wheel.com",
    "https://motorvina.com",
  ],
  danang: [
    "https://motorbikerentaldanang.com/",
    "https://danangmotorbikesrental.com",
    "https://danangbike.com",
    "https://motorbikerentalhoian.com",
    "https://hoianbikerental.com/pricing/",
    "https://tuanmotorbike.com",
  ],
  nhatrang: [
    "https://moto4free.com/",
    "https://motorbikemuine.com/",
  ],
};

const GOAL_PROMPT = `You are extracting motorbike rental pricing from this website.

Steps:
1. Navigate to the pricing or rental page if not already there
2. Handle any popups or cookie banners by dismissing them
3. Find ALL motorbike/scooter listings with their prices
4. If there is a "Load More" button or pagination, click through all pages
5. Extract the following for each bike:
   - Bike name/model (e.g. "Honda Wave 110", "Yamaha NVX 155")
   - Engine size in cc (e.g. 110, 125, 155)
   - Bike type: one of "scooter", "semi-auto", "manual", "adventure"
   - Daily rental price in USD (convert from VND if needed: 1 USD = 25,000 VND)
   - Weekly rental price in USD (if available)
   - Monthly rental price in USD (if available)
   - Deposit amount in USD (if available)
   - Whether the bike is currently available (true/false)

Return a JSON object with this exact structure:
{
  "shop_name": "Name of the rental shop",
  "city": "City name",
  "website": "The URL you scraped",
  "bikes": [
    {
      "name": "Honda Wave 110",
      "engine_cc": 110,
      "type": "semi-auto",
      "price_daily_usd": 8,
      "price_weekly_usd": 50,
      "price_monthly_usd": 120,
      "currency": "USD",
      "deposit_usd": 100,
      "available": true
    }
  ],
  "notes": "Any relevant notes about the shop (e.g. helmet included, free delivery)"
}`;

type SearchBody = {
  city: string;
};

type MinoEvent = {
  status?: string;
  type?: string;
  resultJson?: unknown;
  streamingUrl?: string;
};

interface CacheRow {
  website: string;
  shop_data: unknown;
  scraped_at: string;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

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

/** Get fresh cached results for a city (within TTL) */
async function getCachedResults(
  supabase: SupabaseClient,
  city: string,
): Promise<Map<string, CacheRow>> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from("bike_cache")
    .select("website, shop_data, scraped_at")
    .eq("city", city)
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
  city: string,
  website: string,
  shopData: unknown,
): Promise<void> {
  const { error } = await supabase
    .from("bike_cache")
    .upsert(
      {
        city,
        website,
        shop_data: shopData,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: "city,website", ignoreDuplicates: false },
    );

  if (error) {
    console.error(`[CACHE] Write error for ${website}:`, error.message);
  }
}

// ---------------------------------------------------------------------------
// Mino SSE scraper (unchanged)
// ---------------------------------------------------------------------------

async function runMinoSseForSite(
  url: string,
  apiKey: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  console.log(`[MINO] Starting: ${url}`);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(MINO_SSE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        url,
        goal: GOAL_PROMPT,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Mino request failed (${response.status})`);
    }

    if (!response.body) {
      throw new Error("Mino response body is empty");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let resultJson: unknown;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) {
          continue;
        }

        let event: MinoEvent;
        try {
          event = JSON.parse(line.slice(6));
        } catch {
          continue;
        }

        if (event.streamingUrl) {
          console.log("[MINO] streamingUrl", event.streamingUrl);
        }

        if (event.status === "COMPLETED") {
          resultJson = event.resultJson;
        }
      }
    }

    if (resultJson) {
      enqueue({
        type: "SHOP_RESULT",
        shop: resultJson,
      });
      console.log(`[MINO] Complete: ${url} (${elapsedSeconds(startedAt)}s)`);
      return true;
    }

    throw new Error("Mino stream finished without COMPLETED resultJson");
  } catch (error) {
    console.error(`[MINO] Failed: ${url}`, error);
    return false;
  } finally {
    clearTimeout(timeoutId);
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

  const city = body.city?.toLowerCase();
  const sites = CITY_SITES[city];

  if (!sites?.length) {
    return Response.json({ error: "Unsupported city" }, { status: 400 });
  }

  // Keep direct env read so missing Supabase vars never break search
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });
  }

  // ---- Cache lookup (graceful degradation) ----
  const supabase = tryGetSupabase();
  let cached = new Map<string, CacheRow>();

  if (supabase) {
    try {
      cached = await getCachedResults(supabase, city);
      console.log(`[CACHE] ${cached.size}/${sites.length} sites cached for ${city}`);
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

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      // Send immediate ping to establish stream and prevent proxy buffering
      controller.enqueue(encoder.encode(': ping\n\n'));
      
      const enqueue = (payload: unknown) => {
        controller.enqueue(encoder.encode(sseData(payload)));
      };

      // ---- Stream cached results instantly ----
      for (const { row } of cachedSites) {
        enqueue({
          type: "SHOP_RESULT",
          shop: row.shop_data,
          source: "cache",
          cached_at: row.scraped_at,
        });
      }

      // ---- Scrape uncached sites via Mino ----
      let liveSucceeded = 0;

      if (uncachedSites.length > 0) {
        const tasks = uncachedSites.map((url, index) =>
          (async () => {
            await sleep(index * REQUEST_STAGGER_MS);

            // Per-site enqueue wrapper: adds source + fires cache upsert
            const siteEnqueue = (payload: unknown) => {
              const event = payload as Record<string, unknown>;
              if (event.type === "SHOP_RESULT") {
                // Cache FIRST — must persist even if client disconnected
                if (supabase && event.shop) {
                  cacheResult(supabase, city, url, event.shop).catch(() => {});
                }
                enqueue({ ...event, source: "live" });
              } else {
                enqueue(payload);
              }
            };

            return runMinoSseForSite(url, apiKey, siteEnqueue);
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
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
