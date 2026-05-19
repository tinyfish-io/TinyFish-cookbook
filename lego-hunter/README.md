# Lego Restock Hunter
**Live Demo:** _add URL after deploy_

**Find sold-out LEGO sets across multiple retailers simultaneously — TinyFish Search discovers real product pages, then parallel browser agents check stock and price in real time.**

Enter a LEGO set name or number and the app runs two parallel TinyFish Search queries to find real retailer product pages for that specific set. One browser agent fires per retailer simultaneously — each checking stock availability, extracting price and shipping, and streaming results back as it finishes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  Search input + budget → RetailerStatusCard grid            │
│  Best deal banner → Results table                           │
│  (results + iframes stream in as agents finish)             │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
   POST /api/discover-retailers   POST /api/search-lego
                  │                 │
                  ▼                 ▼
┌─────────────────────┐  ┌──────────────────────────────────┐
│ TinyFish Search API │  │        TinyFish SDK              │
│                     │  │                                  │
│ Two parallel queries│  │ client.agent.stream({ url, goal })│
│                     │  │                                  │
│ 1. Targeted at known│  │ EventType.STREAMING_URL          │
│    LEGO retailers   │  │   → live iframe per agent        │
│    (lego.com,       │  │ EventType.PROGRESS               │
│    amazon, target,  │  │   → step updates                 │
│    bricklink, etc.) │  │ EventType.COMPLETE               │
│                     │  │   + RunStatus.COMPLETED          │
│ 2. Broader search   │  │   → stock/price JSON → SSE       │
│    for any retailer │  │                                  │
│    carrying the set │  │ Promise.allSettled (all parallel) │
│                     │  │                                  │
│ Aggregators filtered│  │ Built-in deal analysis           │
│ Deduped by domain   │  │ (no LLM needed)                  │
└─────────────────────┘  └──────────────────────────────────┘

No database. No cache. No OpenAI. Pure in-memory — results fetched live.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal })
  │
  ├── EventType.STREAMING_URL → live iframe URL forwarded to client
  ├── EventType.PROGRESS      → step description forwarded to client
  └── EventType.COMPLETE
        └── RunStatus.COMPLETED
              // COMPLETED only means the browser ran without crashing
              // — always validate result content, not just the status
              → parse event.result → { inStock, price, shipping, productUrl }
              → retailer_stock_found (if inStock) + retailer_complete → SSE
```

## What Each Agent Extracts

Each agent navigates the retailer's product or search page and returns:

- **In stock** — true/false
- **Price** — numeric, in local currency
- **Shipping** — free / cost / check website
- **Product URL** — direct link to the listing

## Search Flow

1. User enters LEGO set name/number and optional max budget
2. `/api/discover-retailers` runs two parallel TinyFish Search queries to find real product pages
3. All discovered retailer URLs fire browser agents simultaneously via `Promise.allSettled`
4. Each agent navigates the page, extracts stock and price data
5. `EventType.STREAMING_URL` → live browser iframe shown in the retailer card
6. `EventType.COMPLETE` + `RunStatus.COMPLETED` → parse result → stream to client
7. Results appear as each retailer finishes — no waiting for the slowest one
8. Best deal calculated in-memory (lowest price among in-stock results)

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
lego-hunter/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Main UI — search, agent grid, results
│   ├── globals.css                       # LEGO brick design system
│   └── api/
│       ├── discover-retailers/route.ts   # POST — TinyFish Search → retailer URLs
│       └── search-lego/route.ts          # POST — TinyFish Agent stream → SSE
├── components/
│   └── lego-confetti.tsx                 # Confetti on stock found
├── lib/
│   └── retailers.ts                      # Default retailer logos
├── types/
│   └── index.ts                          # TypeScript definitions
├── .env.example
├── .gitignore
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| OpenAI / LLM for URL generation? | NO (TinyFish Search finds real pages) |
| LLM for deal analysis? | NO (built-in price sort logic) |
| Scraping parallel? | YES (`Promise.allSettled` across all retailers) |
| Live browser preview? | YES (`EventType.STREAMING_URL` → iframe per agent) |
| Result validation? | YES (COMPLETED status ≠ goal achieved — content validated) |
| Aggregator sites filtered? | YES (reddit, quora, youtube, etc. excluded) |

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **URL Discovery:** TinyFish Search API (`client.search.query`)
- **Confetti:** canvas-confetti
- **Icons:** Lucide React
- **Deployment:** Vercel
