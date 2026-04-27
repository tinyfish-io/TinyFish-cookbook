# BestBet
**Live Demo:** _add URL after deploy_

**Compare live betting odds across multiple sportsbooks simultaneously — parallel TinyFish browser agents scrape each sportsbook and stream results back in real time.**

Select a sport and enter a match name. BestBet fires one browser agent per sportsbook in parallel — DraftKings, FanDuel, BetMGM, Kalshi, Bet365, Polymarket (or any custom URL you add). Each agent navigates to the sportsbook, finds the match, and extracts moneyline odds. Results stream back as each agent finishes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  Sport selector → Match input → Sportsbook grid             │
│  Live iframes while agents run → Odds cards when done       │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/scrape { url, goal }
                           │ (SSE — one request per sportsbook)
┌──────────────────────────▼──────────────────────────────────┐
│                   Next.js API Route                         │
│                   /api/scrape/route.ts                      │
│                                                             │
│  TINYFISH_API_KEY stored server-side — never exposed        │
│                                                             │
│  client.agent.stream({ url, goal })                         │
│    EventType.STREAMING_URL → live iframe forwarded to client│
│    EventType.COMPLETE + RunStatus.COMPLETED                 │
│      // COMPLETED only means the browser ran without crashing│
│      // — always validate result content, not just the status│
│      → parse event.result → odds JSON → SSE → client        │
└─────────────────────────────────────────────────────────────┘

All sportsbooks run in parallel via Promise.all on the client.
No database. No cache. Pure in-memory — results fetched live.
```

## Supported Sportsbooks

| Sportsbook | URL |
|---|---|
| DraftKings | draftkings.com |
| FanDuel | fanduel.com |
| BetMGM | nj.betmgm.com |
| Kalshi | kalshi.com |
| Bet365 | bet365.com |
| Polymarket | polymarket.com |

You can also add any custom sportsbook URL via the settings panel.

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
bestbet/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                    # Main UI — sport/match input, results grid
│   ├── globals.css
│   └── api/
│       └── scrape/route.ts         # POST — TinyFish agent stream per sportsbook
├── components/
│   ├── SportsbookSelector.tsx      # Sportsbook picker + custom URL support
│   └── MoneyParticle.tsx           # Animated money particles during loading
├── public/                         # Logo and coin assets
├── .env.example
├── .gitignore
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Raw SSE fetch? | NO (TinyFish SDK on server-side API route) |
| API key exposed to browser? | NO (server-side only, no NEXT_PUBLIC_) |
| Scraping parallel? | YES (Promise.all across all selected sportsbooks) |
| Live browser preview? | YES (EventType.STREAMING_URL → iframe per agent) |
| Result validation? | YES (COMPLETED ≠ goal achieved — content validated) |
| Custom sportsbooks? | YES (user can add any URL) |

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **Animations:** Framer Motion
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **Deployment:** Vercel
