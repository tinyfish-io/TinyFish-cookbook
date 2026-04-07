export const runtime = "nodejs";
export const maxDuration = 800;

import { getSupabaseAdmin } from "@/lib/supabase";
import {
  BrowserProfile,
  RunStatus,
  TinyFish,
  type ProxyConfig,
  type ProxyCountryCode,
} from "@tiny-fish/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 780_000;
const REQUEST_STAGGER_MS = 2000; // 2s between districts — Google Maps anti-bot
const CACHE_TTL_MS = 48 * 60 * 60 * 1000; // 48 hours — vibe data changes slowly
const TINYFISH_PROXY_CONFIG: ProxyConfig = {
  enabled: true,
  country_code: "VN" as unknown as ProxyCountryCode,
};

const CITY_DISTRICTS: Record<
  string,
  { name: string; lat: number; lng: number }[]
> = {
  hcmc: [
    { name: "District 1", lat: 10.7769, lng: 106.7009 },
    { name: "District 3", lat: 10.79, lng: 106.69 },
    { name: "District 7", lat: 10.734, lng: 106.7218 },
    { name: "Binh Thanh", lat: 10.8073, lng: 106.7113 },
    { name: "Thu Duc", lat: 10.85, lng: 106.77 },
  ],
  hanoi: [
    { name: "Hoan Kiem", lat: 21.0285, lng: 105.8542 },
    { name: "Ba Dinh", lat: 21.034, lng: 105.8193 },
    { name: "Cau Giay", lat: 21.0388, lng: 105.785 },
    { name: "Tay Ho", lat: 21.07, lng: 105.823 },
    { name: "Dong Da", lat: 21.0167, lng: 105.83 },
  ],
  danang: [
    { name: "Hai Chau", lat: 16.0544, lng: 108.2022 },
    { name: "Son Tra", lat: 16.11, lng: 108.24 },
    { name: "Ngu Hanh Son", lat: 16.02, lng: 108.25 },
  ],
};

// ---------------------------------------------------------------------------
// Vibe goal prompt — one TinyFish call extracts all POI categories
// ---------------------------------------------------------------------------

const buildVibeGoalPrompt = (district: string, city: string) => `You are extracting neighborhood amenity data from Google Maps for ${district}, ${city}, Vietnam.

Steps:
1. You are on Google Maps searching for amenities in this district.
2. For EACH of these 5 categories, search and count POIs:
   - Coworking spaces: Search "coworking space in ${district}, ${city}"
   - Gyms: Search "gym in ${district}, ${city}"
   - Nightlife: Search "bar nightlife in ${district}, ${city}"
   - Supermarkets: Search "supermarket in ${district}, ${city}"
   - Pharmacies: Search "pharmacy in ${district}, ${city}"
3. For each category, count the total number of results and note the top 3 places with name, rating, and address.
4. Estimate a walkability score from 1-10 based on the density and variety of amenities.

Return a JSON object with this exact structure:
{
  "district": "${district}",
  "city": "${city}",
  "amenities": {
    "coworking": {
      "count": 12,
      "top": [
        { "name": "WeWork Bitexco", "rating": 4.5, "address": "2 Hai Trieu, District 1" }
      ]
    },
    "gyms": {
      "count": 8,
      "top": [
        { "name": "California Fitness", "rating": 4.2, "address": "..." }
      ]
    },
    "nightlife": {
      "count": 15,
      "top": [
        { "name": "Bui Vien Walking Street", "rating": 4.0, "address": "..." }
      ]
    },
    "supermarkets": {
      "count": 5,
      "top": [
        { "name": "Co.op Mart", "rating": 4.1, "address": "..." }
      ]
    },
    "pharmacies": {
      "count": 10,
      "top": [
        { "name": "Long Chau Pharmacy", "rating": 4.3, "address": "..." }
      ]
    }
  },
  "walkability_score": 8
}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VibeBody = {
  city: string;
  useCache?: boolean;
};

interface CacheRow {
  district: string;
  vibe_data: unknown;
  scraped_at: string;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

const elapsedSeconds = (startedAt: number) =>
  ((Date.now() - startedAt) / 1000).toFixed(1);

// ---------------------------------------------------------------------------
// Supabase cache helpers (all gracefully degrade on failure)
// ---------------------------------------------------------------------------

/** Try to get Supabase client — returns null if env vars missing */
function tryGetSupabase(): SupabaseClient | null {
  try {
    return getSupabaseAdmin();
  } catch {
    console.warn("[VIBE] [CACHE] Supabase not configured — caching disabled");
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
    .from("vibe_cache")
    .select("district, vibe_data, scraped_at")
    .eq("city", city)
    .gte("scraped_at", cutoff);

  if (error) {
    console.error("[VIBE] [CACHE] Read error:", error.message);
    return new Map();
  }

  const map = new Map<string, CacheRow>();
  for (const row of data ?? []) {
    map.set(row.district, row as CacheRow);
  }
  return map;
}

/** Upsert a single vibe result to cache (fire-and-forget) */
async function cacheResult(
  supabase: SupabaseClient,
  city: string,
  district: string,
  vibeData: unknown,
): Promise<void> {
  const { error } = await supabase
    .from("vibe_cache")
    .upsert(
      {
        city,
        district,
        vibe_data: vibeData,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: "city,district", ignoreDuplicates: false },
    );

  if (error) {
    console.error(`[VIBE] [CACHE] Write error for ${district}:`, error.message);
  }
}

// ---------------------------------------------------------------------------
// TinyFish SSE scraper — one call per district
// ---------------------------------------------------------------------------

async function runTinyFishSseForDistrict(
  district: { name: string; lat: number; lng: number },
  city: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  const mapsUrl = `https://www.google.com/maps/search/coworking+space+in+${encodeURIComponent(district.name + ", " + city)}`;
  console.log(`[VIBE] [TINYFISH] Starting: ${district.name} (${mapsUrl})`);

  try {
    const client = new TinyFish({ timeout: REQUEST_TIMEOUT_MS });
    const stream = await client.agent.stream({
      url: mapsUrl,
      goal: buildVibeGoalPrompt(district.name, city),
      browser_profile: BrowserProfile.STEALTH,
      proxy_config: TINYFISH_PROXY_CONFIG,
    });

    let resultJson: unknown;
    let runId: string | null = null;

    for await (const event of stream) {
      if (event.type === "STARTED") {
        runId = event.run_id;
        continue;
      }

      if (event.type === "STREAMING_URL") {
        runId = event.run_id;
        console.log("[VIBE] [TINYFISH] streamingUrl", event.streaming_url);
        enqueue({
          type: "STREAMING_URL",
          district: district.name,
          streamingUrl: event.streaming_url,
        });
        continue;
      }

      if (event.type === "COMPLETE") {
        runId = event.run_id;
        if (event.status === RunStatus.COMPLETED) {
          resultJson = event.result;
        }
        break;
      }
    }

    if (resultJson) {
      enqueue({
        type: "VIBE_RESULT",
        district: district.name,
        data: resultJson,
      });
      console.log(
        `[VIBE] [TINYFISH] Complete: ${district.name}${runId ? ` [${runId}]` : ""} (${elapsedSeconds(startedAt)}s)`,
      );
      return true;
    }

    throw new Error("TinyFish stream finished without COMPLETED resultJson");
  } catch (error) {
    console.error(`[VIBE] [TINYFISH] Failed: ${district.name}`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST handler — sequential scraping with stagger + SSE streaming
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  let body: VibeBody;

  try {
    body = (await request.json()) as VibeBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const city = body.city?.toLowerCase();
  const useCache = body.useCache ?? false;
  const districts = CITY_DISTRICTS[city];

  if (!districts?.length) {
    return Response.json({ error: "Unsupported city" }, { status: 400 });
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing TINYFISH_API_KEY" },
      { status: 500 },
    );
  }

  // ---- Cache lookup (graceful degradation) ----
  const supabase = tryGetSupabase();
  let cached = new Map<string, CacheRow>();

  if (supabase && useCache) {
    try {
      cached = await getCachedResults(supabase, city);
      console.log(
        `[VIBE] [CACHE] ${cached.size}/${districts.length} districts cached for ${city}`,
      );
    } catch (err) {
      console.error("[VIBE] [CACHE] Lookup failed:", err);
    }
  }

  // Partition districts into cached vs uncached
  const cachedDistricts: { district: (typeof districts)[number]; row: CacheRow }[] = [];
  const uncachedDistricts: (typeof districts)[number][] = [];

  for (const district of districts) {
    const row = cached.get(district.name);
    if (row) {
      cachedDistricts.push({ district, row });
    } else {
      uncachedDistricts.push(district);
    }
  }

  const searchStartedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      // Send immediate ping to establish stream and prevent proxy buffering
      controller.enqueue(encoder.encode(": ping\n\n"));

      const enqueue = (payload: unknown) => {
        controller.enqueue(encoder.encode(sseData(payload)));
      };

      // ---- Stream cached results instantly ----
      for (const { district, row } of cachedDistricts) {
        enqueue({
          type: "VIBE_RESULT",
          district: district.name,
          data: row.vibe_data,
          source: "cache",
          cached_at: row.scraped_at,
        });
      }

      // ---- Scrape uncached districts sequentially with stagger ----
      let liveSucceeded = 0;

      for (let i = 0; i < uncachedDistricts.length; i++) {
        const district = uncachedDistricts[i];

        // Stagger between districts (except the first)
        if (i > 0) {
          await sleep(REQUEST_STAGGER_MS);
        }

        const districtEnqueue = (payload: unknown) => {
          const event = payload as Record<string, unknown>;
          if (event.type === "VIBE_RESULT") {
            // Cache FIRST — must persist even if client disconnected
            if (supabase && useCache && event.data) {
              cacheResult(supabase, city, district.name, event.data).catch(
                () => {},
              );
            }
            enqueue({ ...event, source: "live" });
          } else {
            enqueue(payload);
          }
        };

        const ok = await runTinyFishSseForDistrict(
          district,
          city,
          districtEnqueue,
        );
        if (ok) liveSucceeded++;
      }

      enqueue({
        type: "VIBE_COMPLETE",
        total: districts.length,
        succeeded: cachedDistricts.length + liveSucceeded,
        cached: cachedDistricts.length,
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
