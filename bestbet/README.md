# BestBet

**Live:** [https://tinyfish-best-bet.vercel.app](https://tinyfish-best-bet.vercel.app)

BestBet helps you find the best betting odds for any sports match by comparing moneyline prices across multiple sportsbooks simultaneously. It uses the TinyFish API to dispatch web agents to each sportsbook site (DraftKings, FanDuel, BetMGM, Kalshi, Bet365, Polymarket, and any custom ones you add), scrape the live odds, and display them side-by-side so you can spot the best value instantly.

## Demo

https://github.com/user-attachments/assets/ee1d7f23-6bbd-4b88-92e0-4811382cbb77

## TinyFish API Usage

The app calls the TinyFish SSE endpoint to run a web agent on each selected sportsbook URL. The agent navigates the site, finds the requested match, and extracts the moneyline odds:

```typescript

const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.NEXT_PUBLIC_TINYFISH_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: sportsbook.url,
    goal: `You are extracting current betting market data from this sports betting webpage.
           ...
           STEP 3 - FIND UPCOMING BETTING SLOTS:
           - Find games matching "${match}" on ${getCurrentDate()}
           - Bet values appear on buttons/links with "+" or "-" symbols (e.g., +280, -105)
           STEP 4 - RETURN RESULT:
           { "betting_odds": { "home_wins": "+240", "draw": "+270", "away_wins": "+105" } }`,
  }),
});
```

The response streams SSE events including a `STREAMING_URL` (live view of the agent navigating) and a final `COMPLETE` event with the extracted odds JSON.

## How to Run

### Prerequisites

- Node.js 18+ (or Bun)
- A TinyFish API key ([get one here](https://mino.ai/api-keys))

### Setup

1. Install dependencies:

```bash
cd bestbet
npm install
```

2. Create a `.env.local` file with your TinyFish API key:

```
NEXT_PUBLIC_TINYFISH_API_KEY=your_tinyfish_api_key_here
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     User (Browser)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Next.js Frontend (React + Tailwind + Framer)   │    │
│  │                                                  │    │
│  │  1. Select sport & match                        │    │
│  │  2. Choose sportsbooks (settings panel)         │    │
│  │  3. Click "Find Best Odds"                      │    │
│  └──────────────────┬──────────────────────────────┘    │
└─────────────────────┼───────────────────────────────────┘
                      │  POST /v1/automation/run-sse (x N sportsbooks, parallel)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                  TinyFish API (mino.ai)                  │
│                                                          │
│  Receives goal prompt + target URL per sportsbook        │
│  Spins up a web agent for each request                   │
│                                                          │
│  SSE Stream Events:                                      │
│    • STREAMING_URL → live browser view                   │
│    • COMPLETE      → extracted odds JSON                 │
└────────┬────────────────┬──────────────┬────────────────┘
         │                │              │
         ▼                ▼              ▼
   ┌──────────┐    ┌──────────┐   ┌──────────┐
   │DraftKings│    │ FanDuel  │   │  BetMGM  │  ... (N sportsbooks)
   └──────────┘    └──────────┘   └──────────┘
```
