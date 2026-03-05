# Vietnam Motorbike Rental Aggregator

## Use Case Name
**Vietnam Bike Price Scout**

## The "Why"
Tourists and expats in Vietnam waste hours checking 10-20 individual rental shop websites to compare motorbike prices — there's no aggregator and no API for any of them.

## Description
Users select a city (HCMC, Hanoi, Da Nang, Hoi An, Nha Trang) and bike type (scooter, semi-auto, manual, adventure) → Mino scrapes 15-20+ rental shop websites **in parallel** → returns a unified price comparison dashboard showing daily/weekly/monthly rates, bike models, deposit requirements, and booking links — all in one view.

## Why Mino Is the Only Solution
- **200+ independent rental shops** across Vietnam, each with their own website (WordPress, Wix, custom builds)
- **Zero API exists** — no shop exposes pricing data programmatically
- **Zero aggregator exists** — no Vietnamese "Kayak for motorbikes"
- Sites require **multi-step navigation**: bike model pages → pricing tables → availability calendars → booking forms
- Mino's **parallel processing** is the killer feature: checking 20 shops simultaneously vs. opening 20 browser tabs manually

## Target Persona
- **Primary**: Tourists and backpackers planning Vietnam trips (millions annually)
- **Secondary**: Expats and digital nomads needing monthly rentals
- **Tertiary**: Vietnamese locals comparing prices for weekend trips

## Target Websites (Verified, Real, With Pricing)

### Ho Chi Minh City
| Site | URL | Pricing Visible | Complexity |
|------|-----|----------------|------------|
| Tigit Motorbikes | https://www.tigitmotorbikes.com/prices | Yes — full price table, currency switcher | Multi-step booking (dates, pickup/drop-off city) |
| The Extra Mile | https://theextramile.co/city-rental-prices/ | Yes — monthly/daily rates by model | Multi-step (city, date, return city) |
| Wheelie Saigon | https://wheelie-saigon.com/scooter-motorcycle-rental-hcmc-daily-weekly-or-monthly/ | Yes — daily/weekly/monthly | Simple listing |
| Saigon Motorcycles | https://saigonmotorcycles.com/rentals/ | Yes — rates by engine size (50cc–750cc) | Simple + form |
| Style Motorbikes | https://stylemotorbikes.com/ | Yes — rental guide with pricing | Simple listing |

### Hanoi
| Site | URL | Pricing Visible | Complexity |
|------|-----|----------------|------------|
| Motorbike Rental Hanoi | https://motorbikerentalinhanoi.com/ | Yes — USD/day per model | Simple listing |
| Offroad Vietnam | https://offroadvietnam.com/ | Yes — scooter + adventure rates | Multi-step (tour vs rental) |
| Rent Bike Hanoi | https://rentbikehanoi.com/ | Yes — daily rates | Simple listing |
| Book2Wheel | https://book2wheel.com | Yes — per-bike USD pricing | Multi-step (date picker, login) |
| MotoVina | https://motorvina.com | Yes — city-based, USD/VND toggle | Multi-step (city, dates, model) |

### Da Nang / Hoi An
| Site | URL | Pricing Visible | Complexity |
|------|-----|----------------|------------|
| Motorbike Rental Da Nang | https://motorbikerentaldanang.com/ | Yes — VND + USD per model | Simple + booking |
| Da Nang Bikes Rental | https://danangmotorbikesrental.com/ | Yes — pricing in posts | Simple |
| DaNangBike | https://danangbike.com/ | Yes — pricing guide | Simple |
| Motorbike Rental Hoi An | https://motorbikerentalhoian.com/ | Yes — VND daily per model | Simple listing |
| Hoi An Bike Rental | https://hoianbikerental.com/pricing/ | Yes — dedicated pricing page, multi-currency | Simple |
| Tuan Motorbike | https://tuanmotorbike.com/ | Yes — one-way pricing (Da Nang ↔ Hoi An) | Simple |

### Nha Trang / Mui Ne
| Site | URL | Pricing Visible | Complexity |
|------|-----|----------------|------------|
| Moto4Free | https://moto4free.com/ | Yes — fleet with booking | Simple + booking |
| Motorbike Mui Ne | https://motorbikemuine.com/ | Yes — VND + USD per model | Simple listing |

**Total: 18 verified sites across 5 cities, all with visible pricing, all English-language.**

---

## Architecture Overview

```
┌─────────────────────────────────────────────────┐
│  User Interface (Next.js + Tailwind + shadcn/ui)│
│  - Up to 4 parallel city search slots           │
│  - Bike type filter (scooter, semi-auto, etc.)  │
│  - Sort by price + filter by model name         │
│  - Live browser agent iframes (max 5 per search)│
└────────────────────┬────────────────────────────┘
                     │ User clicks "Search All"
                     ▼
┌─────────────────────────────────────────────────┐
│  Next.js API Route (/api/search)  [Node.js]     │
│  - Check Supabase cache (6h TTL)                │
│  - Stream cached results instantly via SSE      │
│  - Fire parallel Mino calls for uncached sites  │
│  - Cache-before-stream: persist before sending  │
│  - Uses Promise.allSettled() for fault tolerance │
└────────┬────────────────────────┬───────────────┘
         │ Cached hits            │ Uncached sites
         ▼                        ▼
┌────────────────┐  ┌────────────────────────────┐
│  Supabase      │  │  TinyFish Mino API (SSE)   │
│  (PostgreSQL)  │  │                             │
│  6h TTL cache  │  │  Agent 1 → site1.com  ─┐   │
│  keyed by      │  │  Agent 2 → site2.com  ─┤   │
│  (city,website)│  │  Agent N → siteN.com  ─┘   │
└────────────────┘  │  Zero stagger, parallel    │
                    │  STREAMING_URL + COMPLETED  │
                    └────────────┬───────────────┘
                                 │ SSE stream
                                 ▼
┌─────────────────────────────────────────────────┐
│  Results Dashboard                               │
│  - Cards populate as each agent completes        │
│  - Sort by price (low→high, high→low)           │
│  - Filter by model name (Honda, Vespa, etc.)    │
│  - Clickable cards → original rental site       │
│  - Live iframe grid (active only, auto-cleanup) │
└─────────────────────────────────────────────────┘
```

**API calls per search**: 2-6 Mino SSE calls (one per uncached rental site in the selected city), fired in parallel with zero stagger via `Promise.allSettled()`.

**Why SSE streaming**: Results appear in real-time as each agent finishes — the user watches bikes populate the dashboard live. Live browser agent iframes show Mino navigating each site in real time. This is the best UX for demos and showcases Mino's parallel power visually.

---

## Mino Goal (Exact Prompt)

```
You are extracting motorbike/scooter rental pricing from this rental shop website.

STEP 1 - NAVIGATE TO PRICING:
Look for links or pages containing: "Pricing", "Rates", "Rental", "Fleet", "Our Bikes", "Price List"
Click to navigate to the pricing/rental page.
If the homepage already shows bikes with prices, stay on this page.

STEP 2 - HANDLE POPUPS:
If a cookie banner, newsletter popup, or chat widget appears, close it by clicking "Accept", "Close", "X", or "Got it".

STEP 3 - EXTRACT BIKE LISTINGS:
For each motorbike or scooter listed on the page, extract:
- Bike name/model (e.g. "Honda Wave 110", "Yamaha NVX 155")
- Engine size if shown (e.g. "110cc", "155cc")  
- Bike type: classify as "scooter", "semi-auto", "manual", or "adventure"
- Daily rental price (if shown)
- Weekly rental price (if shown)
- Monthly rental price (if shown)
- Currency (VND or USD)
- Deposit amount (if mentioned)
- Whether the bike is currently available

STEP 4 - CHECK FOR MORE BIKES:
If there is a "Load More", "View All", "Next Page", or "See More Bikes" button, click it once to load additional listings. Then extract those too.

STEP 5 - RETURN RESULTS:
Return a JSON object with this exact structure:
{
  "shop_name": "Name of the rental shop",
  "city": "City where the shop is located",
  "website": "The URL you are on",
  "bikes": [
    {
      "name": "Honda Wave 110",
      "engine_cc": 110,
      "type": "semi-auto",
      "price_daily_usd": 5,
      "price_weekly_usd": 28,
      "price_monthly_usd": 80,
      "currency": "USD",
      "deposit_usd": 50,
      "available": true
    }
  ],
  "notes": "Any important rental terms (helmet included, delivery available, etc.)"
}

If prices are in VND, convert to approximate USD using 1 USD = 25,000 VND.
If a price tier is not shown (e.g. no weekly rate), set it to null.
Extract up to 20 bikes maximum.
```

---

## Sample JSON Output

```json
{
  "type": "COMPLETE",
  "status": "COMPLETED",
  "resultJson": {
    "shop_name": "Tigit Motorbikes",
    "city": "Ho Chi Minh City",
    "website": "https://www.tigitmotorbikes.com/prices",
    "bikes": [
      {
        "name": "Honda Blade 110",
        "engine_cc": 110,
        "type": "semi-auto",
        "price_daily_usd": 8,
        "price_weekly_usd": 45,
        "price_monthly_usd": 120,
        "currency": "USD",
        "deposit_usd": 100,
        "available": true
      },
      {
        "name": "Yamaha NVX 155",
        "engine_cc": 155,
        "type": "scooter",
        "price_daily_usd": 12,
        "price_weekly_usd": 70,
        "price_monthly_usd": 180,
        "currency": "USD",
        "deposit_usd": 150,
        "available": true
      },
      {
        "name": "Honda XR 150",
        "engine_cc": 150,
        "type": "manual",
        "price_daily_usd": 15,
        "price_weekly_usd": 85,
        "price_monthly_usd": 250,
        "currency": "USD",
        "deposit_usd": 200,
        "available": true
      },
      {
        "name": "Honda CB500X",
        "engine_cc": 500,
        "type": "adventure",
        "price_daily_usd": 35,
        "price_weekly_usd": 200,
        "price_monthly_usd": 550,
        "currency": "USD",
        "deposit_usd": 500,
        "available": false
      }
    ],
    "notes": "Helmet and phone holder included. Free delivery in District 1. One-way rental to Da Nang available (+$30)."
  }
}
```

---

## Code Snippet (TypeScript — Next.js SSE API Route)

```typescript
// src/app/api/search/route.ts — Simplified (see full source for cache + error handling)
export const runtime = "nodejs";
export const maxDuration = 800;

const MINO_SSE_URL = "https://agent.tinyfish.ai/v1/automation/run-sse";

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

export async function POST(request: Request): Promise<Response> {
  const { city, useCache } = await request.json();
  const sites = CITY_SITES[city];
  const apiKey = process.env.TINYFISH_API_KEY!;

  // SSE streaming response — results flow to client as agents complete
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (payload: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));

      // Optionally stream cached results instantly from Supabase
      // ... (cache-aside pattern, see full source)

      // Fire ALL Mino requests in parallel — zero stagger, zero rate limits
      const tasks = sites.map((url) =>
        (async () => {
          // Each agent call uses getReader() + buffer pattern for SSE
          // Forwards STREAMING_URL events (live browser iframes) to client
          // On COMPLETED: caches result to Supabase, then streams SHOP_RESULT
          return runMinoSseForSite(url, apiKey, enqueue);
        })()
      );
      await Promise.allSettled(tasks);

      enqueue({ type: "SEARCH_COMPLETE", total: sites.length });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
  });
}
```

---

## What Makes This Use Case Stand Out

1. **Parallel Scale**: Up to 18 sites scraped simultaneously across 4 cities at once — the core Mino advantage, visually demonstrated as results stream in real-time
2. **Zero API Territory**: Not a single rental shop has an API — this is impossible without a web agent
3. **Vietnam-Specific**: Leverages local market knowledge that no other applicant has. Vietnam = uncovered category in the Use Case Library
4. **Real Utility**: Millions of tourists visit Vietnam annually. Every single one rents a motorbike. This solves a daily pain point
5. **Complex Navigation**: Multi-step booking forms, currency switchers, pagination — showcases Mino's AI navigation vs. simple scrapers
6. **Visual Demo**: Live browser agent iframes show Mino navigating in real-time + cards populating as agents complete = compelling demo video
7. **No Anti-Bot Risk**: These are small WordPress/Wix sites with zero bot protection — most reliable demo possible
8. **Smart Caching**: Supabase cache with 6h TTL means repeat searches are instant — graceful degradation if Supabase is unavailable

---

## Tech Stack
- **Frontend**: Next.js 16 + React 19 + Tailwind CSS v4 + shadcn/ui
- **API**: TinyFish Mino SSE streaming endpoint (`https://agent.tinyfish.ai/v1/automation/run-sse`)
- **Caching**: Supabase (PostgreSQL) — 6h TTL, graceful degradation
- **Hosting**: Vercel (800s max duration, Node.js runtime)
- **Build Tool**: Claude Code

## Estimated Build Time
- Scaffold + UI: ~30 min (Next.js + Tailwind + shadcn/ui)
- Mino integration + prompt tuning: 1-2 hours
- Frontend polish + real-time streaming UX: 1-2 hours
- Testing across all cities + edge cases: 1 hour
- Demo video recording: 1 hour
- **Total: ~4-6.5 hours**
