# Saigon Happy Hour Sniper
**Live Demo:** _add URL after deploy_

**Real-time happy hour and deals tracker for Ho Chi Minh City — powered by TinyFish parallel browser agents.**

Select a district and the app fires one TinyFish browser agent per venue simultaneously, extracting happy hours, ladies' nights, live music events, and weekly specials in real time. Results stream back as each venue completes.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                    │
│                                                         │
│  District selector → VenueCard grid                     │
│                      (results stream in as done)        │
└──────────────────────────┬──────────────────────────────┘
                           │ POST /api/search { district }
                           │ (SSE — results stream as agents finish)
┌──────────────────────────▼──────────────────────────────┐
│                   Next.js App Router                    │
│                                                         │
│  /api/search/route.ts                                   │
│    │                                                    │
│    ├─ env check ─────► explicit 500 if key missing      │
│    │                                                    │
│    └─ TinyFish SDK ──► Promise.allSettled               │
│         client.agent.stream({ url, goal })              │
│         │                                               │
│         ├── Agent → Pasteur Street Brewing (D1)         │
│         ├── Agent → Heart of Darkness Brewery (D1)      │
│         ├── Agent → Chill Saigon (D1)                   │
│         ├── Agent → The Deck Saigon (Thảo Điền)         │
│         └── Agent → ... (3–5 venues per district)       │
│                                                         │
│         onStreamingUrl → live iframe shown in UI        │
│         onComplete → venue data sent to client via SSE  │
└─────────────────────────────────────────────────────────┘

No database. No cache. Pure in-memory — results fetched live every search.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal }, {
  onStreamingUrl: (event) => forward iframe URL to client,
  onComplete:     (event) => parse event.result → VENUE_RESULT → SSE → client,
})

// for-await loop drains the stream as fallback if callbacks don't fire
for await (const event of stream) {
  if (event.type === EventType.COMPLETE) → VENUE_RESULT → SSE
}
```

## Covered Venues

| District | Venues |
|---|---|
| 🏙️ District 1 | Pasteur Street Brewing, Heart of Darkness Brewery, Chill Saigon, Momento Rooftop, Mia Saigon |
| 🌴 Thảo Điền | The Deck Saigon, Saigon Outcast, Biacraft |
| 🍜 District 3 | Pasteur Street Brewing, Biacraft |

## Deal Types Extracted

| Type | Description |
|---|---|
| `happy_hour` | Time-limited drink/food discounts |
| `ladies_night` | Ladies' night specials |
| `brunch` | Weekend brunch deals |
| `live_music` | Live music events |
| `daily_special` | Daily or weekly recurring specials |

Each deal includes: name, days of week, time window, description, individual item prices in VND, and any conditions.

## Scraping Flow

1. User selects a district
2. `/api/search` resolves the list of venue URLs for that district
3. One TinyFish browser agent fires per venue — all in parallel via `Promise.allSettled`
4. Each agent handles popups, cookie banners, and Vietnamese-language pages automatically
5. `onStreamingUrl` forwards live iframe URLs to the client as agents start
6. `onComplete` → parse `event.result` → stream structured deal data to client
7. UI updates as each venue finishes — no waiting for the slowest one

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

## Project Structure

```
saigon-happy-hour-sniper/
├── src/
│   ├── app/
│   │   ├── layout.tsx                  # Root layout
│   │   ├── page.tsx                    # Main UI — district selector, results grid
│   │   ├── globals.css
│   │   └── api/
│   │       └── search/route.ts         # POST /api/search — SSE + TinyFish orchestration
│   ├── components/
│   │   ├── venue-card.tsx              # Venue + deals display
│   │   ├── deal-badge.tsx              # Deal type badge
│   │   ├── live-preview-grid.tsx       # Live agent iframe grid
│   │   ├── results-grid.tsx            # Venue results grid
│   │   └── ui/                         # badge, button, card, skeleton, switch
│   ├── hooks/
│   │   └── use-deal-search.ts          # SSE client + state management
│   └── lib/
│       ├── district-sites.ts           # Venue URLs + goal prompt per district
│       ├── types.ts                    # TypeScript definitions
│       ├── normalize.ts                # Result normalization
│       ├── env.ts                      # Environment validation
│       └── utils.ts                    # Shared helpers
├── next.config.ts
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Cache layer used? | NO (all results fetched live) |
| Scraping parallel? | YES (`Promise.allSettled` across 3–5 venues per district) |
| Live browser preview? | YES (`onStreamingUrl` → iframe) |
| Vietnamese page handling? | YES (agent translates deal descriptions to English) |
| VND pricing extracted? | YES (per-item promo and regular prices) |

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **Icons:** Lucide React
- **Deployment:** Vercel
