export const runtime = "nodejs";
export const maxDuration = 800; // Vercel Pro allows up to 800s for Node.js runtime

import { TinyFish } from "@tiny-fish/sdk";
import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizePharmacyResult, isEmptyResult } from "@/lib/normalize";
import type { PharmacyResult } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 780_000;
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

const PHARMACY_SITES: Record<string, { name: string; searchUrl: (q: string) => string }> = {
  longchau: {
    name: "Long Châu",
    searchUrl: (q) => `https://nhathuoclongchau.com.vn/tim-kiem?key=${encodeURIComponent(q)}`,
  },
  pharmacity: {
    name: "Pharmacity",
    searchUrl: (q) => `https://www.pharmacity.vn/search?q=${encodeURIComponent(q)}`,
  },
  ankhang: {
    name: "An Khang",
    searchUrl: (q) => `https://nhathuocankhang.com/tim-kiem?keyword=${encodeURIComponent(q)}`,
  },
  guardian: {
    name: "Guardian",
    searchUrl: (q) => `https://www.guardian.com.vn/catalogsearch/result/?q=${encodeURIComponent(q)}`,
  },
  medicare: {
    name: "Medicare",
    searchUrl: (q) => `https://medicare.vn/products?keyword=${encodeURIComponent(q)}`,
  },
};

const GOAL_PROMPT = `You are extracting medicine/health product data from a Vietnamese pharmacy search results page.

Steps:
1. Wait for the page content to fully render. Many Vietnamese pharmacy sites are SPAs (React/Vue) or use lazy-loading — wait until product listing cards are visible in the DOM before extracting. Allow up to 10 seconds for JavaScript rendering.
2. Dismiss any cookie consent banners, popup overlays, newsletter modals, or "Tải app" (download app) prompts by clicking their close/dismiss buttons.
3. Extract products from the FIRST PAGE of search results ONLY. Do NOT click "Xem thêm" (Load More), "Trang tiếp" (Next Page), or any pagination controls.
4. For each product card visible on the page (maximum 20 products), extract:
   - product_name: The full product name in Vietnamese exactly as displayed (e.g. "Viên uống giảm đau Panadol Extra 500mg")
   - brand: The manufacturer or brand name if visible on the card (e.g. "GSK", "Sanofi", "DHG Pharma"). Set to null if not displayed.
   - dosage_form: The product form, mapped to one of: "tablet", "capsule", "syrup", "cream", "sachet", "tube", "drops", "powder", "spray", "injection", "patch", "other". Map from Vietnamese: viên nén=tablet, viên nang=capsule, siro/xi-rô=syrup, kem=cream, gói=sachet, tuýp=tube, nhỏ=drops, bột=powder, xịt=spray, tiêm=injection, miếng dán=patch. If unclear, use "other".
   - quantity: The packaging quantity as displayed (e.g. "Hộp 10 vỉ x 10 viên", "Chai 30ml", "Tuýp 15g"). Keep the original Vietnamese text.
   - original_price: The original/listed price as a number in VND WITHOUT dots or commas (e.g. 32000 not "32.000₫"). If the product shows only one price, use that. If the product says "Liên hệ" or "Cần tư vấn dược sĩ", set to null.
   - sale_price: The discounted/sale price as a number in VND if the product is currently on sale or promotion. Set to null if there is no discount.
   - price_unit: What the displayed price is for. One of: "viên" (tablet), "vỉ" (strip/blister), "hộp" (box), "tuýp" (tube), "chai" (bottle), "gói" (sachet), "ống" (ampoule), "lọ" (vial). Look for text like "₫/Hộp", "₫/Viên", "/Vỉ" near the price. If not explicitly shown, default to "hộp".
   - quantity_per_unit: If the listing shows a per-unit breakdown (e.g. "10 viên/vỉ", "3 vỉ x 10 viên"), extract the number of smallest units per price_unit. Set to null if not visible.
   - stock_status: One of "in_stock", "out_of_stock", or "prescription_required". If the product shows "Cần tư vấn dược sĩ" or "Thuốc kê đơn" (prescription drug), set to "prescription_required". If "Hết hàng" or "Tạm hết", set to "out_of_stock". Otherwise "in_stock".
   - product_url: The full URL link to the product detail page. Extract the href from the product card's link element. Must be an absolute URL (prepend the site domain if relative).
   - promo_badge: Any promotional badge text visible on the card (e.g. "Giảm 11%", "Flash Sale", "Mua 1 tặng 1", "Deal HOT"). Set to null if no promotion badge.

5. Special handling:
   - For prescription drugs marked "Cần tư vấn dược sĩ": set stock_status to "prescription_required", set original_price and sale_price to null, still extract all other fields.
   - Price numbers must be integers in VND (remove dots used as thousand separators: "32.000" becomes 32000, "1.250.000" becomes 1250000).
   - If a product card has no price shown at all, set original_price and sale_price to null.

6. Return a JSON object with this EXACT structure:
{
  "pharmacy": "Name of the pharmacy chain (e.g. An Khang, Long Châu, Pharmacity)",
  "search_term": "The search query term from the URL",
  "products": [
    {
      "product_name": "Viên uống giảm đau Panadol Extra 500mg",
      "brand": "GSK",
      "dosage_form": "tablet",
      "quantity": "Hộp 10 vỉ x 10 viên",
      "original_price": 32000,
      "sale_price": 28500,
      "price_unit": "hộp",
      "quantity_per_unit": 100,
      "stock_status": "in_stock",
      "product_url": "https://example.com/product/panadol-extra",
      "promo_badge": "Giảm 11%"
    }
  ]
}

7. If the page shows NO results, the search term was not found, or you encounter an error, return:
{
  "pharmacy": "Name of the pharmacy chain",
  "search_term": "The search query term",
  "products": [],
  "error": "no_results"
}
Use error values: "no_results" if the page says no products found, "blocked" if access was denied or CAPTCHA blocked you, "timeout" if the page failed to load.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchBody = { query: string; useCache?: boolean };

interface CacheRow {
  pharmacy: string;
  result_data: unknown;
  scraped_at: string;
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

const elapsedSeconds = (startedAt: number) =>
  ((Date.now() - startedAt) / 1000).toFixed(1);

// ---------------------------------------------------------------------------
// Supabase cache helpers (all gracefully degrade on failure)
// ---------------------------------------------------------------------------

/**
 * Try to get Supabase client — returns null if env vars missing.
 * Defined INLINE so missing Supabase vars never break search.
 */
function tryGetSupabase(): SupabaseClient | null {
  try {
    return getSupabaseAdmin();
  } catch {
    console.warn(
      "[PHARMACY] [CACHE] Supabase not configured — caching disabled",
    );
    return null;
  }
}

/** Get fresh cached results for a query (within TTL) */
async function getCachedResults(
  supabase: SupabaseClient,
  query: string,
): Promise<Map<string, CacheRow>> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from("pharmacy_cache")
    .select("pharmacy, result_data, scraped_at")
    .eq("query", query)
    .gte("scraped_at", cutoff);

  if (error) {
    console.error("[PHARMACY] [CACHE] Read error:", error.message);
    return new Map();
  }

  const map = new Map<string, CacheRow>();
  for (const row of data ?? []) {
    map.set(row.pharmacy, row as CacheRow);
  }
  return map;
}

/** Upsert a single scrape result to cache (fire-and-forget) */
async function cacheResult(
  supabase: SupabaseClient,
  query: string,
  pharmacy: string,
  resultData: unknown,
): Promise<void> {
  const { error } = await supabase.from("pharmacy_cache").upsert(
    {
      query,
      pharmacy,
      result_data: resultData,
      scraped_at: new Date().toISOString(),
    },
    { onConflict: "query,pharmacy", ignoreDuplicates: false },
  );

  if (error) {
    console.error(
      `[PHARMACY] [CACHE] Write error for ${pharmacy}:`,
      error.message,
    );
  }
}

// ---------------------------------------------------------------------------
// TinyFish SSE scraper
// ---------------------------------------------------------------------------

async function runTinyFishSseForSite(
  siteKey: string,
  url: string,
  apiKey: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  console.log(`[PHARMACY] Starting scrape: ${siteKey} → ${url}`);

  try {
    const client = new TinyFish({
      apiKey,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 0,
    });
    const stream = await client.agent.stream({
      url,
      goal: GOAL_PROMPT,
    });

    let resultJson: unknown;

    for await (const event of stream) {
      if (event.type === "STREAMING_URL" && event.streaming_url) {
        console.log(
          `[PHARMACY] streamingUrl for ${siteKey}:`,
          event.streaming_url,
        );
        enqueue({
          type: "STREAMING_URL",
          siteUrl: url,
          streamingUrl: event.streaming_url,
        });
      }

      if (event.type === "COMPLETE" && event.status === "COMPLETED") {
        resultJson = event.result;
      }
    }

    if (resultJson) {
      const normalized: PharmacyResult = normalizePharmacyResult(resultJson);

      if (isEmptyResult(normalized)) {
        console.warn(
          `[PHARMACY] Empty result from ${siteKey} — 0 products found`,
        );
      }

      enqueue({
        type: "PHARMACY_RESULT",
        pharmacy: siteKey,
        result: normalized,
        source: "live",
      });

      console.log(
        `[PHARMACY] Complete: ${siteKey} — ${normalized.products.length} products (${elapsedSeconds(startedAt)}s)`,
      );
      return true;
    }

    throw new Error("TinyFish stream finished without COMPLETE result");
  } catch (error) {
    console.error(`[PHARMACY] Failed: ${siteKey}`, error);
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

  const query = body.query?.trim();
  const useCache = body.useCache ?? false;

  if (!query) {
    return Response.json({ error: "Missing search query" }, { status: 400 });
  }

  // Direct process.env read — NOT getEnv() — so missing Supabase vars never break search
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing TINYFISH_API_KEY" },
      { status: 500 },
    );
  }

  // Build search URLs for each pharmacy
  const siteEntries = Object.entries(PHARMACY_SITES).map(([key, site]) => ({
    key,
    name: site.name,
    url: site.searchUrl(query),
  }));

  console.log(
    `[PHARMACY] Search: "${query}" → ${siteEntries.length} pharmacy sites`,
  );

  // ---- Cache lookup (graceful degradation) ----
  const supabase = tryGetSupabase();
  let cached = new Map<string, CacheRow>();

  if (supabase && useCache) {
    try {
      cached = await getCachedResults(supabase, query);
      console.log(
        `[PHARMACY] [CACHE] ${cached.size}/${siteEntries.length} sites cached for "${query}"`,
      );
    } catch (err) {
      console.error("[PHARMACY] [CACHE] Lookup failed:", err);
    }
  }

  // Partition sites into cached vs uncached
  const cachedSites: {
    key: string;
    name: string;
    url: string;
    row: CacheRow;
  }[] = [];
  const uncachedSites: { key: string; name: string; url: string }[] = [];

  for (const entry of siteEntries) {
    const row = cached.get(entry.key);
    if (row) {
      cachedSites.push({ ...entry, row });
    } else {
      uncachedSites.push(entry);
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
      for (const { key, row } of cachedSites) {
        const normalized: PharmacyResult = normalizePharmacyResult(
          row.result_data,
        );
        enqueue({
          type: "PHARMACY_RESULT",
          pharmacy: key,
          result: {
            ...normalized,
            source: "cache" as const,
            cached_at: row.scraped_at,
          },
          source: "cache",
        });
      }

      // ---- Keepalive: ping every 15s to prevent proxy/browser dropping the connection ----
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 15_000);

      // ---- Scrape uncached sites via TinyFish (all in parallel, no staggering) ----
      let liveSucceeded = 0;

      if (uncachedSites.length > 0) {
        const tasks = uncachedSites.map((site) =>
          (async () => {
            const siteEnqueue = (payload: unknown) => {
              const event = payload as Record<string, unknown>;
              if (event.type === "PHARMACY_RESULT") {
                if (supabase && useCache && event.result) {
                  cacheResult(
                    supabase,
                    query,
                    site.key,
                    event.result,
                  ).catch(() => {});
                }
              }
              enqueue(payload);
            };

            return runTinyFishSseForSite(
              site.key,
              site.url,
              apiKey,
              siteEnqueue,
            );
          })(),
        );

        const settled = await Promise.allSettled(tasks);
        liveSucceeded = settled.filter(
          (r): r is PromiseFulfilledResult<boolean> =>
            r.status === "fulfilled" && r.value,
        ).length;
      }

      clearInterval(keepalive);

      enqueue({
        type: "SEARCH_COMPLETE",
        total: siteEntries.length,
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
