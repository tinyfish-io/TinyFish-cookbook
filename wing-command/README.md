# Wing Command v4

**Find the best chicken wings near you — powered by TinyFish + Gemini.**

Enter a zip code and flavor preference, and Wing Command dispatches parallel TinyFish browser agents across DoorDash, UberEats, Grubhub, Yelp, and Google — streaming live results back as each agent completes.

## Demo

Live agents scrape real delivery platforms in parallel. Results stream in as each source finishes.

## How It Works

```
User enters zip code + flavor
        ↓
/api/discover — Gemini (gemini-2.0-flash) finds 5-7 relevant restaurant source URLs
        ↓
/api/scout — TinyFish agents scrape each source in parallel via SSE
        ↓
Results stream back to UI as each agent completes
```

## TinyFish API Usage

```typescript
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk';

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });

const stream = await client.agent.stream({ url, goal });

for await (const event of stream) {
  if (event.type === EventType.COMPLETE) {
    if (event.status === RunStatus.COMPLETED) {
      // event.result contains extracted restaurant data
    }
    break;
  }
}
```

Results are streamed back to the browser via SSE as each agent finishes.

## Architecture

```
Browser (Next.js)
    ↓ POST /api/discover
Gemini — discovers restaurant source URLs for the zip code
    ↓ GET /api/scout (SSE)
TinyFish Agents (parallel) — scrape each source
    ↓
DoorDash / UberEats / Grubhub / Yelp / Google
    ↓
Results stream back → TradingCardGrid renders live
```

## Setup

```bash
cd wing-command
npm install
cp .env.example .env.local
# Fill in your API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|---|---|
| `TINYFISH_API_KEY` | TinyFish browser agents. Get yours at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |
| `GEMINI_API_KEY` | URL discovery via gemini-2.0-flash. Get yours at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Web scraping | TinyFish Agent API (`@tiny-fish/sdk`) |
| URL discovery | Google Gemini (`@google/generative-ai`) |
| Streaming | Server-Sent Events (SSE) |
| Styling | Tailwind CSS |
