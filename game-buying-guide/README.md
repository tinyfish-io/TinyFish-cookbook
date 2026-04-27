# Game Buying Guide
**Live Demo:** _add URL after deploy_

**AI-powered game price comparison — parallel TinyFish browser agents analyze 10 gaming storefronts simultaneously and check SteamDB price history to help you decide when to buy.**

Enter a game title and the app fires one browser agent per storefront in parallel — Steam, Epic Games, GOG, PlayStation Store, Xbox Store, Nintendo eShop, Humble Bundle, Green Man Gaming, Fanatical, and CDKeys. Each agent extracts current price, discount, rating, and gives a buy/wait/consider recommendation. A separate SteamDB agent fetches price history to show the all-time historic low.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  SearchForm → AgentGrid → ResultsSummary                    │
│  SteamDB price card + live agent iframes                    │
│  (results stream in as agents finish)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
          ┌────────────────┼──────────────────┐
          ▼                ▼                  ▼
 POST /api/discover-  POST /api/analyze-  POST /api/steamdb-
 platforms            platform            price-history
          │                │                  │
          ▼                ▼                  ▼
┌──────────────────┐ ┌────────────────────────────────────────┐
│ Hardcoded list   │ │           TinyFish SDK                 │
│ of 10 gaming     │ │                                        │
│ storefronts with │ │ client.agent.stream({ url, goal })     │
│ templated search │ │                                        │
│ URLs — no LLM    │ │ EventType.STREAMING_URL                │
│ needed           │ │   → live iframe per agent              │
└──────────────────┘ │ EventType.PROGRESS                     │
                     │   → status updates                     │
                     │ EventType.COMPLETE                     │
                     │   + RunStatus.COMPLETED                │
                     │   → price/rating/rec JSON → SSE        │
                     │                                        │
                     │ Promise.allSettled (all parallel)      │
                     └────────────────────────────────────────┘

No database. No cache. Pure in-memory — results fetched live.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal })
  │
  ├── EventType.STREAMING_URL → live iframe URL forwarded to client
  ├── EventType.PROGRESS      → status message forwarded to client
  └── EventType.COMPLETE
        └── RunStatus.COMPLETED
              // COMPLETED only means the browser ran without crashing
              // — always validate result content, not just the status
              → parse event.result → analysis JSON → SSE → client
```

## Covered Platforms

| Platform | What the agent extracts |
|---|---|
| Steam | Price, discount, rating, sale end date |
| Epic Games Store | Price, discount, free game status |
| GOG | Price, DRM-free status, rating |
| PlayStation Store | Price, PS Plus discount, rating |
| Xbox Store | Price, Game Pass availability |
| Nintendo eShop | Price, regional pricing |
| Humble Bundle | Price, bundle availability |
| Green Man Gaming | Price, discount |
| Fanatical | Price, bundle deals |
| CDKeys | Key price, discount |

Plus a dedicated **SteamDB** agent that finds the all-time historic lowest price and whether now is a good time to buy.

## Setup

### Prerequisites

- Node.js 22.x
- TinyFish API key

### Environment Variables

```bash
cp .env.example .env.local
```

Then fill in:

```env
# TinyFish Web Agent API key (server-side only)
# Get yours at: https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
game-buying-guide/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                              # Main UI
│   ├── globals.css
│   └── api/
│       ├── discover-platforms/route.ts       # POST — hardcoded store list + search URLs
│       ├── analyze-platform/route.ts         # POST — TinyFish Agent → price/rating/rec SSE
│       └── steamdb-price-history/route.ts    # POST — TinyFish Agent → SteamDB historic low SSE
├── components/
│   ├── search-form.tsx                       # Game title input
│   ├── agent-grid.tsx                        # Agent card grid
│   ├── agent-card.tsx                        # Per-platform status + iframe + result
│   ├── live-browser-preview.tsx              # Expandable live browser iframe
│   ├── results-summary.tsx                   # Best deal summary
│   ├── steamdb-price-card.tsx                # SteamDB historic low card
│   ├── theme-provider.tsx
│   └── ui/                                   # alert, badge, button, card, input
├── hooks/
│   └── use-game-search.ts                    # Search state + SSE client
├── lib/
│   ├── types.ts                              # TypeScript definitions
│   └── utils.ts
├── .env.example
├── .gitignore
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Raw SSE fetch? | NO (TinyFish SDK throughout) |
| LLM for platform discovery? | NO (hardcoded store list with templated URLs) |
| Scraping parallel? | YES (`Promise.allSettled` across 10 platforms + SteamDB) |
| Live browser preview? | YES (`EventType.STREAMING_URL` → iframe per agent) |
| Result validation? | YES (COMPLETED ≠ goal achieved — content always validated) |
| SteamDB price history? | YES (dedicated agent for historic low price) |

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **Animations:** Framer Motion
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **Icons:** Lucide React
- **Deployment:** Vercel
