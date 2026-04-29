# District Rent Shark
**Live Demo:** _add URL after deploy_

**Vietnamese rental market intelligence — parallel TinyFish browser agents scrape live listings from Cho Tot and Bat Dong San, while separate agents extract neighborhood vibe scores from Google Maps.**

Select a city (HCMC, Hanoi, or Da Nang). The app fires parallel browser agents at Vietnamese rental listing sites, extracting prices, amenities, trust signals, and building rules — all translated to English. A separate vibe tab sends agents to Google Maps for each district, counting coworking spaces, gyms, nightlife, supermarkets, and pharmacies to produce a walkability score.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  City selector → ListingCard grid → FilterToolbar           │
│  VibeCard grid → ListingMap (Mapbox)                        │
│  LivePreviewGrid (agent iframes while running)              │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
        POST /api/search      POST /api/vibe
                  │                 │
                  ▼                 ▼
┌─────────────────────────────────────────────────────────────┐
│                    TinyFish SDK                             │
│  browser_profile: STEALTH                                    │
│                                                             │
│  /api/search — parallel agents (Promise.allSettled)         │
│    Agent → chotot.com/HCMC listings                         │
│    Agent → batdongsan.com/HCMC listings                     │
│    → LISTING_RESULT SSE events → client                     │
│                                                             │
│  /api/vibe — sequential agents (2s stagger, anti-bot)       │
│    Agent → Google Maps: District 1 amenities                │
│    Agent → Google Maps: District 3 amenities                │
│    Agent → Google Maps: Binh Thanh amenities                │
│    → VIBE_RESULT SSE events → client                        │
│                                                             │
│  EventType.STREAMING_URL → live iframe per agent            │
│  EventType.COMPLETE + RunStatus.COMPLETED                   │
│    // COMPLETED only means browser ran without crashing     │
│    // — always validate result content, not just the status │
│    → parse event.result → structured JSON → SSE → client   │
└─────────────────────────────────────────────────────────────┘

No database. No cache. Pure in-memory — results fetched live every search.
```

## What Gets Extracted

**Rental listings** (per listing):
- Title, price (VND/month), area (m²), address, district
- Bedrooms, bathrooms, amenities, description (all translated to English)
- Trust signals: `is_likely_broker`, `is_repost`, `price_suspicious`, `deposit_terms`
- Building rules: pets allowed, parking, curfew

**Vibe scores** (per district):
- Coworking spaces, gyms, nightlife venues, supermarkets, pharmacies — count + top 3 each
- Walkability score (1–10)

## Covered Cities

| City | Rental Sites | Districts |
|---|---|---|
| HCMC | Cho Tot, Bat Dong San | District 1, 3, 7, Binh Thanh, Thu Duc |
| Hanoi | Cho Tot, Bat Dong San | Hoan Kiem, Ba Dinh, Cau Giay, Tay Ho, Dong Da |
| Da Nang | Cho Tot, Bat Dong San | Hai Chau, Son Tra, Ngu Hanh Son |

## Setup

### Prerequisites

- Node.js 22.x
- TinyFish API key
- Mapbox token (optional — map is hidden if missing)

### Environment Variables

```bash
cp .env.example .env.local
```

Then fill in:

```env
# TinyFish Web Agent API key (server-side only)
# Get yours at: https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=

# Optional — Mapbox map (hidden if missing)
# Get yours at: https://account.mapbox.com
NEXT_PUBLIC_MAPBOX_TOKEN=
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
district-rent-shark/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                      # Main UI
│   │   ├── globals.css
│   │   └── api/
│   │       ├── search/route.ts           # POST — parallel agents → rental listings SSE
│   │       └── vibe/route.ts             # POST — sequential agents → vibe scores SSE
│   ├── components/
│   │   ├── listing-card.tsx              # Individual rental listing card
│   │   ├── results-grid.tsx              # Listing results grid
│   │   ├── filter-toolbar.tsx            # Price/bedroom/trust filters
│   │   ├── platform-group.tsx            # Results grouped by platform
│   │   ├── live-preview-grid.tsx         # Live agent iframe grid
│   │   ├── listing-map.tsx               # Mapbox map of listings
│   │   ├── vibe-card.tsx                 # District vibe score card
│   │   ├── trust-badge.tsx               # Trust signal badge
│   │   ├── building-rules.tsx            # Building rules display
│   │   └── ui/                           # badge, button, card, skeleton, switch
│   ├── hooks/
│   │   ├── use-listing-search.ts         # Rental search SSE client
│   │   └── use-vibe-search.ts            # Vibe search SSE client
│   ├── lib/
│   │   ├── env.ts                        # Env validation (TINYFISH_API_KEY only)
│   │   ├── normalize.ts                  # Result normalization
│   │   └── utils.ts                      # Shared helpers
│   └── __tests__/                        # Vitest unit tests
├── .env.example
├── .gitignore
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory, Supabase fully removed) |
| Cache layer used? | NO (all results fetched live) |
| Stealth for protected sites? | YES (`BrowserProfile.STEALTH`) |
| Rental agents parallel? | YES (`Promise.allSettled` across sites) |
| Vibe agents staggered? | YES (2s between districts — Google Maps anti-bot) |
| Live browser preview? | YES (`STREAMING_URL` → iframe per agent) |
| Result validation? | YES (COMPLETED ≠ goal achieved — content validated) |
| Vietnamese → English translation? | YES (handled in agent goal prompt) |

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **Browser Agents:** TinyFish SDK (`client.agent.stream`, stealth mode)
- **Map:** Mapbox GL + react-map-gl (optional)
- **Icons:** Lucide React
- **Tests:** Vitest
- **Deployment:** Vercel
