# PRD: Vietnam Bike Price Scout

## Product Architecture Overview

The Vietnam Bike Price Scout is a real-time price comparison tool for motorbike rentals in Vietnam. It solves the problem of fragmented pricing information by aggregating data from multiple local rental shops that lack public APIs.

### How it works:
1. **User Input**: The user selects up to 4 cities in parallel (HCMC, Hanoi, Da Nang, Nha Trang) and chooses bike types (scooter, semi-auto, manual, adventure).
2. **Cache Check**: The API route checks Supabase for cached results (6-hour TTL). Cached shops stream instantly; only uncached shops trigger TinyFish.
3. **Parallel Extraction**: The Next.js backend triggers multiple TinyFish API calls in parallel (zero stagger), one for each known rental shop in that city.
4. **Real-time Streaming**: Using Server-Sent Events (SSE), the backend streams results and live browser iframe URLs back to the frontend as each agent progresses.
5. **Data Normalization**: The frontend normalizes currency (VND to USD at 25,000:1), classifies bike types, and updates the UI dynamically.
6. **Visual Comparison**: Users can sort by price (low→high, high→low), filter by model name, and watch live TinyFish browser agents (up to 5 iframes per search).

---

## Runnable Code Snippet (SSE Proxy Pattern)

This snippet from `src/app/api/search/route.ts` demonstrates how to proxy TinyFish's SSE stream to a client-side frontend.

```typescript
// src/app/api/search/route.ts
export const runtime = "nodejs"; // Required for long-running SSE streams (up to 800s on Vercel Pro)

const TINYFISH_SSE_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

async function runTinyFishSseForSite(
  url: string,
  apiKey: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const response = await fetch(TINYFISH_SSE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "X-API-Key": apiKey, // env var: TINYFISH_API_KEY
    },
    body: JSON.stringify({ url, goal: GOAL_PROMPT }),
  });

  if (!response.ok || !response.body) return false;

  // MUST use getReader() + buffer pattern for SSE — never await response.text()
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
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6));

      // Forward live browser iframe URL to client
      if (event.streamingUrl) {
        enqueue({ type: "STREAMING_URL", siteUrl: url, streamingUrl: event.streamingUrl });
      }
      if (event.status === "COMPLETED") {
        resultJson = event.resultJson;
      }
    }
  }

  if (resultJson) {
    enqueue({ type: "SHOP_RESULT", siteUrl: url, shop: resultJson });
    return true;
  }
  return false;
}
```

---

## Exact TinyFish Goal Prompt

The following prompt is sent to the TinyFish API to ensure consistent, structured extraction across different website layouts.

```text
You are extracting motorbike rental pricing from this website.

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
}
```

---

## Sample JSON Output

Realistic sample data extracted from Wheelie Saigon in Ho Chi Minh City.

```json
{
  "shop_name": "Wheelie Saigon",
  "city": "HCMC",
  "website": "https://wheelie-saigon.com/",
  "bikes": [
    {
      "name": "Yamaha WR155 Super Motard",
      "engine_cc": 155,
      "type": "adventure",
      "price_daily_usd": 40,
      "price_weekly_usd": null,
      "price_monthly_usd": null,
      "deposit_usd": 20,
      "available": true
    },
    {
      "name": "Honda Lead 125",
      "engine_cc": 125,
      "type": "scooter",
      "price_daily_usd": 8,
      "price_weekly_usd": null,
      "price_monthly_usd": null,
      "deposit_usd": 20,
      "available": true
    },
    {
      "name": "Honda Scoopy 110",
      "engine_cc": 110,
      "type": "scooter",
      "price_daily_usd": 6,
      "price_weekly_usd": null,
      "price_monthly_usd": null,
      "deposit_usd": 20,
      "available": true
    }
  ],
  "notes": "Prices are converted from VND using a rate of 1 USD = 25,000 VND. Rentals include free delivery/pickup in Saigon, helmet, fuel, and insurance."
}
```
