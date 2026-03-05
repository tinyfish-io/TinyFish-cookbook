# PRD: Vietnam Bike Price Scout

## Product Architecture Overview

The Vietnam Bike Price Scout is a real-time price comparison tool for motorbike rentals in Vietnam. It solves the problem of fragmented pricing information by aggregating data from multiple local rental shops that lack public APIs.

### How it works:
1. **User Input**: The user selects a city (e.g., Ho Chi Minh City, Hanoi).
2. **Parallel Extraction**: The Next.js backend triggers multiple TinyFish Mino API calls in parallel, one for each known rental shop in that city.
3. **Real-time Streaming**: Using Server-Sent Events (SSE), the backend streams results back to the frontend as soon as each shop's data is extracted.
4. **Data Normalization**: The frontend receives the raw JSON from Mino, normalizes currency (VND to USD), and updates the UI dynamically.
5. **Visual Comparison**: Users can filter and sort bikes by type (scooter, manual, etc.) and price to find the best deal.

---

## Runnable Code Snippet (SSE Proxy Pattern)

This snippet from `src/app/api/search/route.ts` demonstrates how to proxy Mino's SSE stream to a client-side frontend.

```typescript
// src/app/api/search/route.ts
export const runtime = "edge";

const MINO_SSE_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

async function runMinoSseForSite(url: string, apiKey: string, enqueue: (payload: unknown) => void) {
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
  });

  if (!response.ok || !response.body) return false;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const event = JSON.parse(line.slice(6));
      if (event.status === "COMPLETED" && event.resultJson) {
        enqueue({ type: "SHOP_RESULT", shop: event.resultJson });
      }
    }
  }
  return true;
}
```

---

## Exact Mino Goal Prompt

The following prompt is sent to the Mino API to ensure consistent, structured extraction across different website layouts.

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
