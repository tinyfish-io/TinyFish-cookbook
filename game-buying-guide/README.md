# GamePulse

**Live:** [https://v0-game-buying-guide.vercel.app/](https://v0-game-buying-guide.vercel.app/)

GamePulse helps users decide **whether to buy a video game now or wait for a better deal**.  
It compares pricing, discounts, and store signals across **10 major gaming platforms in parallel** using **Mino autonomous browser agents**, then surfaces a clear recommendation for each store.

Instead of relying on price-tracking APIs or scraped datasets, GamePulse launches real browser agents that visit each store, observe the live page, and return structured pricing analysis in real time.

---

## Demo

https://github.com/user-attachments/assets/61c22b80-2cfc-40a6-bc3a-7d5917cf71a9

---

## Mino API Usage

GamePulse uses the **TinyFish SSE Browser Automation API** to analyze multiple game stores simultaneously.

For each platform (Steam, Epic, PlayStation Store, etc.), the app launches a Mino agent that:
- Navigates to the store search page
- Locates the requested game
- Extracts pricing, discounts, and sale signals
- Returns a structured JSON recommendation

### Example API Call

```ts
const response = await fetch("https://mino.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.MINO_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: platformSearchUrl,
    goal: `
You are analyzing a game store page to help a user decide
whether to buy "${gameTitle}" now or wait.

Observe:
- Current price
- Sale or discount indicators
- User ratings and review signals

Return a JSON object with pricing and a recommendation.
`,
    timeout: 300000,
  }),
})
```

The response streams **Server-Sent Events (SSE)**, including:

- `STREAMING_URL` → live browser preview of the agent

- `STATUS` → navigation and extraction progress

- `COMPLETE` → final structured pricing analysis JSON

## How It Works

1. User enters a game title (e.g., Elden Ring)

2. Platform discovery generates search URLs from a curated list of 10 stores

3. Parallel Mino agents launch (one per platform)

4. Live browser previews stream into the UI

5. Results aggregate into a buy / wait / consider recommendation dashboard

## Supported Platforms

GamePulse checks the following platforms for every search:

- Steam

- Epic Games Store

- GOG

- PlayStation Store

- Xbox Store

- Nintendo eShop

- Humble Bundle

- Green Man Gaming

- Fanatical

- CDKeys

No external discovery APIs or LLMs are used — the platform list is curated and deterministic.


## How to Run
**Prerequisites**
- Node.js 18+
- A Mino API key [get one here](https://mino.ai/api-keys)

## Setup

1. Install dependencies:
```bash
cd game-buying-guide
npm install
```


2. Create a .env.local file:
```bash
MINO_API_KEY=your_mino_api_key_here
```

3. Start the dev server:
```bash
npm run dev
```

Open http://localhost:3000

## Architecture Diagram
```bash
┌─────────────────────────────────────────────────────────┐
│                     User (Browser)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Next.js Frontend                                │    │
│  │                                                  │    │
│  │  1. Enter game title                             │    │
│  │  2. View 10 live agent cards                     │    │
│  │  3. See buy / wait recommendations               │    │
│  └──────────────────┬──────────────────────────────┘    │
└─────────────────────┼───────────────────────────────────┘
                      │  POST /api/analyze-platform (x10, parallel)
                      ▼
┌─────────────────────────────────────────────────────────┐
│               Next.js API Routes                         │
│                                                         │
│  - /api/discover-platforms                              │
│  - /api/analyze-platform → Mino SSE proxy               │
└─────────────────────┬───────────────────────────────────┘
                      │  POST /v1/automation/run-sse
                      ▼
┌─────────────────────────────────────────────────────────┐
│                     Mino API                            │
│                                                         │
│  - Spins up autonomous browser agents                   │
│  - Streams live previews and status                     │
│  - Returns structured pricing JSON                     │
└──────────┬──────────┬──────────┬──────────┬────────────┘
           ▼          ▼          ▼          ▼
       Steam      Epic      PlayStation   Xbox   ... (10 platforms)
```

## Environment Variables

MINO_API_KEY	- API key for Mino browser automation


## Notes

- All platform analysis is performed via live browser automation

- No price databases, scraping services, or AI discovery APIs are used

- Results reflect real-time store state, not cached data
