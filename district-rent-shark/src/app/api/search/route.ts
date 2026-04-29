export const runtime = "nodejs";
export const maxDuration = 800;

import {
  BrowserProfile,
  RunStatus,
  TinyFish,
} from "@tiny-fish/sdk";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REQUEST_TIMEOUT_MS = 780_000;

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
// Goal prompt
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
   - poster_type: One of "owner", "broker", or "unknown"
   - amenities: Array of amenities in English
   - description_en: First 200 chars of description, TRANSLATED to English
   - listing_url: Direct URL to this specific listing
   - thumbnail_url: URL of the listing's main image/thumbnail
   - trust_signals: { is_likely_broker, is_repost, price_suspicious, deposit_mentioned, deposit_terms }
   - building_rules: { pets_allowed, parking, curfew, notes }

4. TRANSLATE all Vietnamese text to English in fields marked with _en suffix.
5. Use null for unavailable optional fields.

Return JSON:
{
  "platform": "Name of the website",
  "city": "City name in English",
  "listings": [...]
}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type SearchBody = { city: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
const elapsedSeconds = (startedAt: number) =>
  ((Date.now() - startedAt) / 1000).toFixed(1);

// ---------------------------------------------------------------------------
// TinyFish scraper per site
// ---------------------------------------------------------------------------

async function runAgentForSite(
  url: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  console.log(`[RENT] Starting: ${url}`);

  try {
    const client = new TinyFish({ timeout: REQUEST_TIMEOUT_MS });
    const stream = await client.agent.stream({
      url,
      goal: GOAL_PROMPT,
      browser_profile: BrowserProfile.STEALTH,
    });

    let resultJson: unknown;

    for await (const event of stream) {
      if (event.type === "STREAMING_URL") {
        enqueue({ type: "STREAMING_URL", siteUrl: url, streamingUrl: event.streaming_url });
        continue;
      }

      if (event.type === "COMPLETE") {
        if (event.status === RunStatus.COMPLETED) {
          // COMPLETED only means the browser ran without crashing
          // — always validate result content, not just the status
          resultJson = event.result;
        }
        break;
      }
    }

    if (resultJson) {
      enqueue({ type: "LISTING_RESULT", siteUrl: url, data: resultJson });
      console.log(`[RENT] Complete: ${url} (${elapsedSeconds(startedAt)}s)`);
      return true;
    }

    throw new Error("Stream finished without COMPLETED result");
  } catch (error) {
    console.error(`[RENT] Failed: ${url}`, error);
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

  const city = body.city?.toLowerCase();
  const sites = CITY_SITES[city];

  if (!sites?.length) {
    return Response.json({ error: "Unsupported city" }, { status: 400 });
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });
  }

  const searchStartedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": ping\n\n"));

      const enqueue = (payload: unknown) =>
        controller.enqueue(encoder.encode(sseData(payload)));

      // Run all sites in parallel
      const tasks = sites.map((url) => runAgentForSite(url, enqueue));
      const settled = await Promise.allSettled(tasks);
      const succeeded = settled.filter(
        (r): r is PromiseFulfilledResult<boolean> =>
          r.status === "fulfilled" && r.value,
      ).length;

      enqueue({
        type: "SEARCH_COMPLETE",
        total: sites.length,
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
