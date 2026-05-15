# SafeDine
**Live Demo: https://restaurant-comparison-tool.vercel.app**

**Pre-visit restaurant safety intelligence — AI agents compare 2–5 restaurants simultaneously before you dine.**

Enter a city and up to 5 restaurant names, select your allergens and dietary preferences, and SafeDine dispatches one TinyFish browser agent per restaurant in parallel. Each agent navigates Google Maps, reads 8–12 reviews, checks menu photos for allergen signals, and returns a structured safety report. Results stream back as each agent completes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  SearchForm → AllergenSelector → ComparisonDashboard        │
│              (live previews + results stream in)            │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/scrape (one per restaurant, parallel)
                           │ (SSE — results stream as agents finish)
┌──────────────────────────▼──────────────────────────────────┐
│                   Next.js API Route                         │
│                   /api/scrape/route.ts                      │
│                                                             │
│  TinyFish SDK — client.agent.stream() per restaurant        │
│  TINYFISH_API_KEY stored server-side in .env.local          │
│                                                             │
│  SSE events:                                                │
│    STREAMING_URL → live browser iframe per agent            │
│    STEP          → agent progress updates                   │
│    COMPLETE      → structured safety JSON                   │
│    ERROR         → failure message                          │
└──────────┬──────────────┬──────────────┬────────────────────┘
           │              │              │
           ▼              ▼              ▼
    ┌────────────┐ ┌────────────┐ ┌────────────┐
    │  Google    │ │  Google    │ │  Google    │  ... (2–5)
    │  Maps:     │ │  Maps:     │ │  Maps:     │
    │  Rest. A   │ │  Rest. B   │ │  Rest. C   │
    └────────────┘ └────────────┘ └────────────┘

No database. No cache. Pure in-memory — results fetched live every search.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal }, {
  onStreamingUrl: (event) => forward iframe URL to client,
  onProgress:     (event) => forward step description to client,
  onComplete:     (event) => {
    if (event.status === RunStatus.FAILED) → ERROR
    else → event.result → structured safety JSON → COMPLETE → SSE
  }
})

// for-await drains the stream as fallback
for await (const event of stream) {
  if (event.type === EventType.COMPLETE) → handle result
}
```

## What Each Agent Extracts

Each agent navigates Google Maps for the restaurant and returns:

- **Safety score** (0–100) based on review signals and allergen mentions
- **Allergen risks** — detected allergens flagged against your selections
- **Dietary suitability** — vegan, vegetarian, gluten-free, halal, kosher ratings
- **Review highlights** — safety-relevant quotes from real reviews
- **Menu photo analysis** — allergen labeling visible in menu images
- **Confidence level** — how much data the agent found

## Features

- Compare **2–5 restaurants** simultaneously
- Select from **common allergens** (nuts, dairy, gluten, shellfish, etc.)
- Set **dietary preferences** (vegan, vegetarian, halal, etc.)
- Watch **live browser agent iframes** as each agent navigates Google Maps
- Results ranked by safety score — worst risks surfaced first

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
restaurant-comparison-tool/
├── src/
│   ├── app/
│   │   ├── layout.tsx                    # Root layout
│   │   ├── page.tsx                      # Main UI
│   │   ├── globals.css
│   │   └── api/
│   │       └── scrape/route.ts           # POST /api/scrape — SSE + TinyFish per restaurant
│   ├── components/
│   │   ├── search/
│   │   │   ├── SearchForm.tsx            # City + restaurant name inputs
│   │   │   ├── AllergenSelector.tsx      # Allergen multi-select
│   │   │   ├── PreferenceSelector.tsx    # Dietary preference selector
│   │   │   └── RestaurantInput.tsx       # Individual restaurant input row
│   │   ├── live/
│   │   │   ├── LiveSearchPanel.tsx       # Live agent status panel
│   │   │   ├── LiveBrowserPreview.tsx    # Agent iframe grid
│   │   │   ├── RestaurantAgentCard.tsx   # Per-agent status card
│   │   │   └── AgentStatusIndicator.tsx  # Running/done indicator
│   │   ├── results/
│   │   │   ├── ComparisonDashboard.tsx   # Ranked results layout
│   │   │   ├── RestaurantResultCard.tsx  # Per-restaurant result card
│   │   │   ├── SafetyScoreRing.tsx       # Score visualisation
│   │   │   ├── AllergenRiskPanel.tsx     # Allergen risk breakdown
│   │   │   ├── AllergenRiskBadge.tsx     # Individual allergen badge
│   │   │   ├── FitExplanation.tsx        # Dietary fit explanation
│   │   │   ├── ConfidenceIndicator.tsx   # Data confidence level
│   │   │   ├── ResultDetailPanel.tsx     # Full detail drawer
│   │   │   ├── GoogleMapsLink.tsx        # Link to Google Maps listing
│   │   │   └── AgentLoadingCard.tsx      # Skeleton while agent runs
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   └── Footer.tsx
│   │   └── ui/                           # badge, button, card, dialog, input, etc.
│   ├── hooks/
│   │   └── useRestaurantSearch.ts        # SSE client + state management
│   ├── context/
│   │   └── SearchContext.tsx             # Search state context
│   └── lib/
│       ├── goal-builder.ts               # Builds TinyFish goal prompt per restaurant
│       ├── score-calculator.ts           # Safety score computation
│       ├── allergens.ts                  # Allergen definitions
│       ├── tinyfish-client.ts            # SDK wrapper
│       ├── constants.ts                  # App-wide constants
│       └── utils.ts                      # Shared helpers
├── next.config.ts
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Cache layer used? | NO (all results fetched live) |
| Scraping parallel? | YES (one `client.agent.stream` per restaurant, all concurrent) |
| Live browser preview? | YES (`onStreamingUrl` → iframe per agent) |
| Allergen risk detection? | YES (review + menu photo analysis) |
| Results ranked? | YES (by safety score, worst risks first) |

## Tech Stack

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **UI Components:** shadcn/ui
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **Icons:** Lucide React
- **Deployment:** Vercel
