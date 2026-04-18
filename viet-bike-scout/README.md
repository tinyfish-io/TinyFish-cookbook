# Viet Bike Scout
**Live Demo: https://viet-bike-scout.vercel.app**

**Real-time motorbike rental price comparison across Vietnam — powered by TinyFish parallel browser agents.**

Rental shops in Vietnam don't list prices on any aggregator. You have to visit 5–10 different websites, each with different layouts, currencies, and formats. This app sends TinyFish browser agents to all of them simultaneously, extracts structured pricing data, and streams results back to a unified dashboard in real time.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                    │
│                                                         │
│  City selector → Bike type filter → Results grid        │
│                  (results stream in as shops complete)  │
└──────────────────────────┬──────────────────────────────┘
                           │ POST /api/search { city }
                           │ (SSE — results stream as agents finish)
┌──────────────────────────▼──────────────────────────────┐
│                   Next.js App Router                    │
│                                                         │
│  /api/search/route.ts                                   │
│    │                                                    │
│    ├─ getEnv() ──────► explicit 500 if key missing      │
│    │                                                    │
│    └─ TinyFish SDK ──► Promise.allSettled               │
│         client.agent.stream({ url, goal })              │
│         │                                               │
│         ├── Agent → Tigit Motorbikes (HCMC)             │
│         ├── Agent → Wheelie Saigon (HCMC)               │
│         ├── Agent → Off Road Vietnam (Hanoi)            │
│         ├── Agent → Da Nang Motorbikes                  │
│         └── Agent → ... (5–6 shops per city)            │
│                                                         │
│         Each agent streams EventType.STREAMING_URL      │
│         → live iframe shown in UI                       │
│         Each agent fires EventType.COMPLETE             │
│         → shop result sent to client via SSE            │
└─────────────────────────────────────────────────────────┘

No database. No cache. Pure in-memory — results live only for the request.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal })
  │
  ├── EventType.STREAMING_URL  → live iframe URL forwarded to client
  └── EventType.COMPLETE
        └── RunStatus.COMPLETED → parse event.result → SHOP_RESULT → SSE → client
```

## Features

- Search up to **4 cities** — HCMC, Hanoi, Da Nang, Nha Trang
- Filter by **bike type** — Scooter, Semi-Auto, Manual, Adventure
- **Sort by price** (low→high or high→low) and **filter by model** (Honda, Vespa, Yamaha, etc.)
- Watch **live browser agent iframes** — up to 5 active agent windows per search, auto-removed when done
- Results stream in as each shop completes — no waiting for the slowest one

## Covered Shops

| City | Shops |
|---|---|
| 🏙️ HCMC | Tigit Motorbikes, Wheelie Saigon, Saigon Motorcycles, Style Motorbikes, The Extra Mile |
| 🏛️ Hanoi | Motorbike Rental Hanoi, Off Road Vietnam, Rent Bike Hanoi, Book2Wheel, Motorvina |
| 🌊 Da Nang | Motorbike Rental Da Nang, Da Nang Motorbikes, Da Nang Bike, Motorbike Rental Hoi An, Hoi An Bike Rental, Tuan Motorbike |
| 🏖️ Nha Trang | Moto4Free, Motorbike Mui Ne |

## Scraping Flow

1. User selects city and bike type
2. `/api/search` resolves the list of 5–6 shop URLs for that city
3. One TinyFish browser agent fires per shop — all in parallel via `Promise.allSettled`
4. Each agent handles cookie banners, dynamic loading, and VND→USD conversion automatically
5. `EventType.STREAMING_URL` events forward live iframe URLs to the client as agents start
6. `EventType.COMPLETE` + `RunStatus.COMPLETED` → parse `event.result` → stream shop data to client
7. UI updates as each shop finishes — typically 15–30 seconds for a full city

## TinyFish Prompt

The same goal prompt is sent to every shop URL:

```
Extract motorbike rental pricing from this website. Be fast and efficient.

1. Go directly to the pricing or rental page
2. Dismiss any popups or cookie banners
3. Find ALL motorbike/scooter listings with prices
4. Extract: bike name, engine size (cc), type, daily/weekly/monthly price in USD,
   deposit, availability, and link to the bike's detail page

Return ONLY structured JSON — shop name, city, website, and a bikes[] array.
```

TinyFish handles currency conversion from VND automatically (1 USD ≈ 25,000 VND).

## Setup

### Prerequisites

- Node.js 18+
- TinyFish API key

### Environment Variables

```bash
cp .env.example .env.local
```

Then fill in:

```env
# TinyFish (required) — https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=your-tinyfish-api-key
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deployment

Deployed on Vercel. Any Node-compatible host works — no external services to provision.

`maxDuration = 800` is set on the API route to accommodate long-running parallel scrapes.

## Project Structure

```
viet-bike-scout/
├── src/
│   ├── app/
│   │   ├── layout.tsx                # Root layout
│   │   ├── page.tsx                  # Main UI — city/type selection, results, iframes
│   │   ├── globals.css               # Global styles
│   │   └── api/
│   │       └── search/route.ts       # POST /api/search — SSE + TinyFish orchestration
│   ├── components/
│   │   ├── live-preview-grid.tsx     # Live iframe grid (max 5 active, auto-cleanup)
│   │   ├── results-grid.tsx          # Shop cards grouped by store
│   │   ├── shop-group.tsx            # Individual shop section
│   │   ├── bike-card.tsx             # Single bike listing card
│   │   └── ui/                       # badge, button, card, skeleton, switch
│   ├── hooks/
│   │   └── use-bike-search.ts        # SSE client + state management
│   └── lib/
│       ├── env.ts                    # Environment validation (throws if key missing)
│       └── utils.ts                  # Shared helpers
├── next.config.ts
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|-----------|--------|
| External database used? | NO (pure in-memory) |
| Cache layer used? | NO (all results fetched live) |
| Google Places / Yelp API used? | NO |
| Scraping parallel? | YES (`Promise.allSettled` across 5–6 shops per city) |
| Live browser preview? | YES (`EventType.STREAMING_URL` → iframe) |
| VND→USD conversion? | YES (handled automatically by TinyFish agent) |

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **UI:** React 19 + shadcn/ui (5 components — badge, button, card, skeleton, switch)
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **Icons:** Lucide React
- **Deployment:** Vercel
