export const runtime = "nodejs";
export const maxDuration = 800;

import { EventType, RunStatus, TinyFish } from "@tiny-fish/sdk";
import { normalizePharmacyResult, isEmptyResult } from "@/lib/normalize";
import type { PharmacyResult } from "@/lib/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 780_000;

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
4. For each product card visible on the page (maximum 20 products), extract all fields including product_name, brand, dosage_form, quantity, original_price, sale_price, price_unit, quantity_per_unit, stock_status, product_url, and promo_badge.
5. Price numbers must be integers in VND (remove dots used as thousand separators: "32.000" becomes 32000).
6. Return JSON: { "pharmacy": "...", "search_term": "...", "products": [...] }
7. If no results: { "pharmacy": "...", "search_term": "...", "products": [], "error": "no_results" }`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchBody = { query: string };

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

const elapsedSeconds = (startedAt: number) =>
  ((Date.now() - startedAt) / 1000).toFixed(1);

// ---------------------------------------------------------------------------
// TinyFish scraper per site
// ---------------------------------------------------------------------------

async function runAgentForSite(
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

    const stream = await client.agent.stream({ url, goal: GOAL_PROMPT });

    let resultJson: unknown;

    for await (const event of stream) {
      if (event.type === EventType.STREAMING_URL && event.streaming_url) {
        enqueue({
          type: "STREAMING_URL",
          siteUrl: url,
          streamingUrl: event.streaming_url,
        });
        continue;
      }

      if (event.type === EventType.COMPLETE) {
        if (event.status === RunStatus.COMPLETED) {
          // COMPLETED only means the browser ran without crashing
          // — always validate result content, not just the status
          resultJson = event.result;
        }
        break;
      }
    }

    if (resultJson) {
      const normalized: PharmacyResult = normalizePharmacyResult(resultJson);

      if (isEmptyResult(normalized)) {
        console.warn(`[PHARMACY] Empty result from ${siteKey} — 0 products found`);
      }

      enqueue({
        type: "PHARMACY_RESULT",
        pharmacy: siteKey,
        result: normalized,
      });

      console.log(
        `[PHARMACY] Complete: ${siteKey} — ${normalized.products.length} products (${elapsedSeconds(startedAt)}s)`,
      );
      return true;
    }

    throw new Error("TinyFish stream finished without COMPLETED result");
  } catch (error) {
    console.error(`[PHARMACY] Failed: ${siteKey}`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  let body: SearchBody;

  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const query = body.query?.trim();

  if (!query) {
    return Response.json({ error: "Missing search query" }, { status: 400 });
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });
  }

  const siteEntries = Object.entries(PHARMACY_SITES).map(([key, site]) => ({
    key,
    name: site.name,
    url: site.searchUrl(query),
  }));

  console.log(`[PHARMACY] Search: "${query}" → ${siteEntries.length} pharmacy sites`);

  const searchStartedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": ping\n\n"));

      const enqueue = (payload: unknown) =>
        controller.enqueue(encoder.encode(sseData(payload)));

      // Keepalive: ping every 15s to prevent proxy/browser dropping the connection
      const keepalive = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          clearInterval(keepalive);
        }
      }, 15_000);

      // Run all pharmacy sites in parallel
      const tasks = siteEntries.map((site) =>
        runAgentForSite(site.key, site.url, apiKey, enqueue),
      );
      const settled = await Promise.allSettled(tasks);
      const succeeded = settled.filter(
        (r): r is PromiseFulfilledResult<boolean> =>
          r.status === "fulfilled" && r.value,
      ).length;

      clearInterval(keepalive);

      enqueue({
        type: "SEARCH_COMPLETE",
        total: siteEntries.length,
        succeeded,
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
