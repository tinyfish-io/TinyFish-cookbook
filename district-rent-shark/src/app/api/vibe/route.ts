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
const REQUEST_STAGGER_MS = 2000; // 2s between districts — Google Maps anti-bot

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
// Vibe goal prompt
// ---------------------------------------------------------------------------

const buildVibeGoalPrompt = (district: string, city: string) =>
  `You are extracting neighborhood amenity data from Google Maps for ${district}, ${city}, Vietnam.

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

Return JSON:
{
  "district": "${district}",
  "city": "${city}",
  "amenities": {
    "coworking": { "count": 12, "top": [{ "name": "...", "rating": 4.5, "address": "..." }] },
    "gyms": { "count": 8, "top": [...] },
    "nightlife": { "count": 15, "top": [...] },
    "supermarkets": { "count": 5, "top": [...] },
    "pharmacies": { "count": 10, "top": [...] }
  },
  "walkability_score": 8
}`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type VibeBody = { city: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
const elapsedSeconds = (startedAt: number) =>
  ((Date.now() - startedAt) / 1000).toFixed(1);

// ---------------------------------------------------------------------------
// TinyFish scraper per district
// ---------------------------------------------------------------------------

async function runAgentForDistrict(
  district: { name: string; lat: number; lng: number },
  city: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  const mapsUrl = `https://www.google.com/maps/search/coworking+space+in+${encodeURIComponent(district.name + ", " + city)}`;
  console.log(`[VIBE] Starting: ${district.name} (${mapsUrl})`);

  try {
    const client = new TinyFish({ timeout: REQUEST_TIMEOUT_MS });
    const stream = await client.agent.stream({
      url: mapsUrl,
      goal: buildVibeGoalPrompt(district.name, city),
      browser_profile: BrowserProfile.STEALTH,
    });

    let resultJson: unknown;

    for await (const event of stream) {
      if (event.type === "STREAMING_URL") {
        enqueue({
          type: "STREAMING_URL",
          district: district.name,
          streamingUrl: event.streaming_url,
        });
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
      enqueue({ type: "VIBE_RESULT", district: district.name, data: resultJson });
      console.log(`[VIBE] Complete: ${district.name} (${elapsedSeconds(startedAt)}s)`);
      return true;
    }

    throw new Error("Stream finished without COMPLETED result");
  } catch (error) {
    console.error(`[VIBE] Failed: ${district.name}`, error);
    return false;
  }
}

// ---------------------------------------------------------------------------
// POST handler — sequential with stagger (Google Maps anti-bot)
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  let body: VibeBody;

  try {
    body = (await request.json()) as VibeBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const city = body.city?.toLowerCase();
  const districts = CITY_DISTRICTS[city];

  if (!districts?.length) {
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

      let succeeded = 0;

      for (let i = 0; i < districts.length; i++) {
        if (i > 0) await sleep(REQUEST_STAGGER_MS);
        const ok = await runAgentForDistrict(districts[i], city, enqueue);
        if (ok) succeeded++;
      }

      enqueue({
        type: "VIBE_COMPLETE",
        total: districts.length,
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
