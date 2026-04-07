export const runtime = "nodejs";
export const maxDuration = 800; // Vercel Pro allows up to 800s for Node.js runtime

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
const REQUEST_STAGGER_MS = 0;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const TINYFISH_PROXY_CONFIG: ProxyConfig = {
  enabled: true,
  country_code: "VN" as unknown as ProxyCountryCode,
};

const CITY_SITES: Record<string, string[]> = {
  hcmc: [
    "https://www.chotot.com/tp-ho-chi-minh/thue-phong-tro",
    "https://batdongsan.com.vn/cho-thue-can-ho-chung-cu-tp-hcm",
  ],
  hanoi: [
    "https://www.chotot.com/ha-noi/thue-phong-tro",
    "https://batdongsan.com.vn/cho-thue-can-ho-chung-cu-ha-noi",
  ],
  danang: [
    "https://www.chotot.com/da-nang/thue-phong-tro",
    "https://batdongsan.com.vn/cho-thue-can-ho-chung-cu-da-nang",
  ],
};

// ---------------------------------------------------------------------------
// Goal prompt — instructs TinyFish what to extract from each listing page
// ---------------------------------------------------------------------------

const GOAL_PROMPT = `You are extracting rental apartment/room listings from a Vietnamese real estate website.

Steps:
1. Wait for the page content to fully render — these are JavaScript SPAs that load content dynamically.
   Wait at least 3-5 seconds after initial page load for listings to appear.
2. Handle any popups, cookie banners, or login modals by dismissing/closing them.
3. Extract the first 10 rental listings visible on the page. For each listing, extract ALL of the following fields:

   - title_en: The listing title, TRANSLATED to English
   - price_vnd_monthly: Monthly rental price in VND (as a number, e.g. 5000000)
   - area_m2: Area in square meters (as a number)
   - address_en: Full address, TRANSLATED to English
   - district: District name in English (e.g. "District 1", "Binh Thanh", "Ba Dinh")
   - bedrooms: Number of bedrooms (number or null if studio/not specified)
   - bathrooms: Number of bathrooms (number or null if not specified)
   - post_date: When the listing was posted (ISO date string or relative like "2 days ago")
   - poster_name: Name of the person/company who posted
   - poster_type: One of "owner", "broker", or "unknown" — infer from context clues:
     * "broker" if they mention "môi giới", "BĐS", have many listings, or are a company
     * "owner" if they say "chính chủ" or similar
     * "unknown" if unclear
   - amenities: Array of amenities in English (e.g. ["air conditioning", "washing machine", "parking"])
   - description_en: First 200 chars of description, TRANSLATED to English
   - listing_url: Direct URL to this specific listing
   - thumbnail_url: URL of the listing's main image/thumbnail
   - trust_signals: An object with:
     * is_likely_broker: boolean — true if poster seems to be a broker
     * is_repost: boolean — true if listing appears to be reposted (check for duplicate indicators)
     * price_suspicious: boolean — true if price seems too low/high for the area
     * deposit_mentioned: boolean — true if deposit/cọc is mentioned
     * deposit_terms: string or null — deposit terms if mentioned (e.g. "2 months deposit")
   - building_rules: An object with:
     * pets_allowed: "yes", "no", or "unknown"
     * parking: string or null — parking details if mentioned
     * curfew: string or null — curfew details if mentioned
     * notes: string or null — any other building rules mentioned

4. TRANSLATE all Vietnamese text to English in the output fields marked with _en suffix.
5. If a field is not available on the page, use null for optional fields.

Return a JSON object with this exact structure:
{
  "platform": "Name of the website (e.g. 'Cho Tot', 'Bat Dong San')",
  "city": "City name in English",
  "listings": [
    {
      "title_en": "Apartment for rent in District 1, fully furnished",
      "price_vnd_monthly": 8000000,
      "area_m2": 45,
      "address_en": "123 Nguyen Hue, District 1, Ho Chi Minh City",
      "district": "District 1",
      "bedrooms": 1,
      "bathrooms": 1,
      "post_date": "2026-03-15",
      "poster_name": "Nguyen Van A",
      "poster_type": "owner",
      "amenities": ["air conditioning", "washing machine", "elevator"],
      "description_en": "Beautiful apartment in the heart of District 1...",
      "listing_url": "https://example.com/listing/123",
      "thumbnail_url": "https://example.com/images/123.jpg",
      "trust_signals": {
        "is_likely_broker": false,
        "is_repost": false,
        "price_suspicious": false,
        "deposit_mentioned": true,
        "deposit_terms": "2 months deposit"
      },
      "building_rules": {
        "pets_allowed": "unknown",
        "parking": "Motorbike parking available",
        "curfew": null,
        "notes": null
      }
    }
  ]
}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchBody = {
  city: string;
  useCache?: boolean;
};

interface CacheRow {
  website: string;
  listing_data: unknown;
  scraped_at: string;
}

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

void REQUEST_STAGGER_MS; // acknowledged — no staggering by design

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
    console.warn("[RENT] [CACHE] Supabase not configured — caching disabled");
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
    .from("rental_cache")
    .select("website, listing_data, scraped_at")
    .eq("city", city)
    .gte("scraped_at", cutoff);

  if (error) {
    console.error("[RENT] [CACHE] Read error:", error.message);
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
  listingData: unknown,
): Promise<void> {
  const { error } = await supabase
    .from("rental_cache")
    .upsert(
      {
        city,
        website,
        listing_data: listingData,
        scraped_at: new Date().toISOString(),
      },
      { onConflict: "city,website", ignoreDuplicates: false },
    );

  if (error) {
    console.error(`[RENT] [CACHE] Write error for ${website}:`, error.message);
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
  console.log(`[RENT] [TINYFISH] Starting: ${url}`);

  try {
    const client = new TinyFish({ timeout: REQUEST_TIMEOUT_MS });
    const stream = await client.agent.stream({
      url,
      goal: GOAL_PROMPT,
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
        console.log("[RENT] [TINYFISH] streamingUrl", event.streaming_url);
        enqueue({
          type: "STREAMING_URL",
          siteUrl: url,
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
        type: "LISTING_RESULT",
        siteUrl: url,
        data: resultJson,
      });
      console.log(
        `[RENT] [TINYFISH] Complete: ${url}${runId ? ` [${runId}]` : ""} (${elapsedSeconds(startedAt)}s)`,
      );
      return true;
    }

    throw new Error("TinyFish stream finished without COMPLETED resultJson");
  } catch (error) {
    console.error(`[RENT] [TINYFISH] Failed: ${url}`, error);
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

  const city = body.city?.toLowerCase();
  const useCache = body.useCache ?? false;
  const sites = CITY_SITES[city];

  if (!sites?.length) {
    return Response.json({ error: "Unsupported city" }, { status: 400 });
  }

  // Keep direct env read so missing Supabase vars never break search
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
        `[RENT] [CACHE] ${cached.size}/${sites.length} sites cached for ${city}`,
      );
    } catch (err) {
      console.error("[RENT] [CACHE] Lookup failed:", err);
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
      controller.enqueue(encoder.encode(": ping\n\n"));

      const enqueue = (payload: unknown) => {
        controller.enqueue(encoder.encode(sseData(payload)));
      };

      // ---- Stream cached results instantly ----
      for (const { row } of cachedSites) {
        enqueue({
          type: "LISTING_RESULT",
          data: row.listing_data,
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
              if (event.type === "LISTING_RESULT") {
                // Cache FIRST — must persist even if client disconnected
                if (supabase && useCache && event.data) {
                  cacheResult(supabase, city, url, event.data).catch(() => {});
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
