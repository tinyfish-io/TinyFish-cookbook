export const runtime = "nodejs";
export const maxDuration = 800;

import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";
import { getEnv } from "@/lib/env";

const REQUEST_STAGGER_MS = 0;

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

const GOAL_PROMPT = `Extract motorbike rental pricing from this website. Be fast and efficient.

1. Go directly to the pricing or rental page — do NOT navigate away to other sites
2. Dismiss any popups or cookie banners
3. Find ALL motorbike/scooter listings with prices
4. Extract for each bike:
   - Bike name/model (e.g. "Honda Wave 110", "Yamaha NVX 155")
   - Engine size in cc (e.g. 110, 125, 155)
   - Bike type: one of "scooter", "semi-auto", "manual", "adventure"
   - Daily rental price in USD (convert from VND if needed: 1 USD = 25,000 VND)
   - Weekly rental price in USD (if available)
   - Monthly rental price in USD (if available)
   - Deposit amount in USD (if available)
   - Whether the bike is currently available (true/false)
   - URL to this bike's detail page (null if all bikes share one page)

Return ONLY this JSON, no other text:
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
      "available": true,
      "url": null
    }
  ],
  "notes": "Any relevant notes (e.g. helmet included, free delivery)"
}`;

type SearchBody = {
  city: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
const elapsedSeconds = (startedAt: number) => ((Date.now() - startedAt) / 1000).toFixed(1);

async function runAgentForSite(
  url: string,
  apiKey: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  console.log(`[TINYFISH] Starting: ${url}`);

  try {
    const client = new TinyFish({ apiKey });
    const stream = await client.agent.stream({ url, goal: GOAL_PROMPT });

    for await (const event of stream) {
      if (event.type === EventType.STREAMING_URL) {
        enqueue({
          type: "STREAMING_URL",
          siteUrl: url,
          streaming_url: event.streaming_url,
          run_id: event.run_id,
        });
      }

      if (event.type === EventType.COMPLETE && event.status === RunStatus.COMPLETED) {
        const result = typeof event.result === "string"
          ? JSON.parse(event.result)
          : event.result;

        enqueue({ type: "SHOP_RESULT", siteUrl: url, shop: result });
        enqueue({ type: "STREAMING_DONE", siteUrl: url, success: true });
        console.log(`[TINYFISH] Complete: ${url} (${elapsedSeconds(startedAt)}s)`);
        return true;
      }
    }

    throw new Error("Stream ended without COMPLETED event");
  } catch (error) {
    enqueue({ type: "STREAMING_DONE", siteUrl: url, success: false });
    console.error(`[TINYFISH] Failed: ${url}`, error);
    return false;
  }
}

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

  let apiKey: string;
  try {
    apiKey = getEnv().TINYFISH_API_KEY;
  } catch {
    return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });
  }

  const searchStartedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": ping\n\n"));

      const enqueue = (payload: unknown) => {
        controller.enqueue(encoder.encode(sseData(payload)));
      };

      // Send total upfront so progress bar works immediately
      enqueue({ type: "SEARCH_STARTED", total: sites.length });

      // Run all agents in parallel
      const tasks = sites.map((url, i) =>
        (async () => {
          if (REQUEST_STAGGER_MS > 0 && i > 0) await sleep(i * REQUEST_STAGGER_MS);
          return runAgentForSite(url, apiKey, enqueue);
        })()
      );

      const settled = await Promise.allSettled(tasks);
      const succeeded = settled.filter(
        (r): r is PromiseFulfilledResult<boolean> => r.status === "fulfilled" && r.value
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
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
