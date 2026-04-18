export const runtime = "nodejs";
export const maxDuration = 120;

import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function formatDateForUrl(dateStr: string) {
  return new Date(dateStr).toISOString().split("T")[0];
}

function buildSearchUrlWithParams(baseUrl: string, city: string, checkIn?: string, checkOut?: string): string {
  try {
    const url = new URL(baseUrl);
    const lower = baseUrl.toLowerCase();
    const ci = checkIn ? formatDateForUrl(checkIn) : "";
    const co = checkOut ? formatDateForUrl(checkOut) : "";

    if (lower.includes("booking.com")) {
      if (ci) url.searchParams.set("checkin", ci);
      if (co) url.searchParams.set("checkout", co);
    } else if (lower.includes("expedia.com")) {
      if (ci) url.searchParams.set("startDate", ci);
      if (co) url.searchParams.set("endDate", co);
    } else if (lower.includes("hotels.com")) {
      if (ci) url.searchParams.set("checkIn", ci);
      if (co) url.searchParams.set("checkOut", co);
    } else if (lower.includes("airbnb.com")) {
      if (ci) url.searchParams.set("checkin", ci);
      if (co) url.searchParams.set("checkout", co);
    } else if (lower.includes("agoda.com")) {
      if (ci) url.searchParams.set("checkIn", ci);
      if (co) url.searchParams.set("checkOut", co);
    } else {
      if (ci) url.searchParams.set("checkin", ci);
      if (co) url.searchParams.set("checkout", co);
    }
    return url.toString();
  } catch {
    return baseUrl;
  }
}

export async function POST(request: Request) {
  const { platform, params } = await request.json();

  if (!platform || !params) {
    return Response.json({ error: "Platform and params are required" }, { status: 400 });
  }

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });

  const { city, checkIn, checkOut, guests } = params;

  const goal = `You are searching for hotels on ${platform.name}.

Inputs:
- City: ${city}
- Check-in date: ${checkIn ? formatDate(checkIn) : "Tomorrow"}
- Check-out date: ${checkOut ? formatDate(checkOut) : "Day after tomorrow"}
- Number of guests: ${guests}

STEP 1 – LOCATION INPUT: If a city or destination field is present, enter the city name "${city}".
STEP 2 – DATE INPUT: Select the exact check-in date (${checkIn ? formatDate(checkIn) : "tomorrow"}) and check-out date (${checkOut ? formatDate(checkOut) : "day after tomorrow"}).
STEP 3 – GUEST INPUT: Set the number of guests to ${guests}.
STEP 4 – SEARCH: Click the search or find hotels button.
STEP 5 – FINAL STATE: Wait until the hotel search results page is fully visible.

RETURN JSON ONLY:
{
  "platform": "${platform.name}",
  "search_results_url": "Current page URL after search",
  "available": true
}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (payload: unknown) => controller.enqueue(encoder.encode(sseData(payload)));

      try {
        enqueue({ type: "CONNECTED", message: `Starting search on ${platform.name}...` });

        const client = new TinyFish({ apiKey });
        const tfStream = await client.agent.stream({ url: platform.searchUrl, goal });

        for await (const event of tfStream) {
          if (event.type === EventType.STREAMING_URL) {
            enqueue({ type: "SCREENSHOT", data: { streamingUrl: event.streaming_url } });
          }

          if (event.type === EventType.COMPLETE && event.status === RunStatus.COMPLETED) {
            const result = typeof event.result === "string" ? JSON.parse(event.result) : event.result;
            let searchResultsUrl = (result as Record<string, string>)?.search_results_url || platform.searchUrl;

            if (!searchResultsUrl.includes("check")) {
              searchResultsUrl = buildSearchUrlWithParams(searchResultsUrl, city, checkIn, checkOut);
            }

            enqueue({
              type: "COMPLETE",
              data: {
                available: true,
                hotelsFound: 0,
                searchResultsUrl,
                message: `Search completed on ${platform.name}`,
              },
            });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
        }

        // Fallback if no COMPLETE event
        const fallbackUrl = buildSearchUrlWithParams(platform.searchUrl, city, checkIn, checkOut);
        enqueue({ type: "COMPLETE", data: { available: true, hotelsFound: 0, searchResultsUrl: fallbackUrl, message: "Search completed - click to view results" } });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        enqueue({ type: "ERROR", message: error instanceof Error ? error.message : "Unknown error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
