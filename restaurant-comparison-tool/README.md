# SafeDine

**Live:** [https://restaurant-comparison-tool.vercel.app](https://restaurant-comparison-tool.vercel.app)

SafeDine is a pre-visit restaurant safety intelligence tool that compares 2–5 restaurants before dining by analyzing Google Maps reviews, menu photos, and allergen signals. It uses the TinyFish Agent API to dispatch parallel web agents — one per restaurant — that each navigate Google Maps, read 8–12 reviews, check menu images, and return a structured safety report with scores, allergen risks, and dietary suitability ratings.

## Demo

https://github.com/user-attachments/assets/c684dac5-5e89-43fe-9592-0665a31513f6

## TinyFish API Usage

The app calls the TinyFish Agent API once per restaurant, in parallel, via a Next.js API route. Each agent navigates Google Maps, samples reviews for safety signals, checks menu photos for allergen labeling, and returns a structured JSON report:

```typescript
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });

const stream = await client.agent.stream(
  { url: "https://www.google.com/maps", goal },
  {
    onStreamingUrl: (event) => {
      // live browser preview URL
    },
    onProgress: (event) => {
      // agent progress updates
    },
    onComplete: (event) => {
      // structured safety JSON result
    },
  }
);

for await (const event of stream) {
  if (event.type === EventType.COMPLETE) {
    if (event.status === RunStatus.FAILED) {
      // handle error
    } else {
      // event.result contains the structured safety report
    }
  }
}
```

The stream emits events including a `streamingUrl` (live view of the agent navigating Google Maps) and a final `COMPLETE` event with the extracted safety data JSON.

## How to Run

### Prerequisites

- Node.js 18+
- A TinyFish API key ([get one here](https://agent.tinyfish.ai))

### Setup

1. Install dependencies:

```bash
cd restaurant-comparison-tool
npm install
```

2. Create a `.env.local` file with your TinyFish API key:

```
TINYFISH_API_KEY=your_tinyfish_api_key_here
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      User (Browser)                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         Next.js 15 Frontend (Tailwind + shadcn)        │  │
│  │                                                        │  │
│  │  1. Enter city + 2–5 restaurant names                  │  │
│  │  2. Select allergens & dietary preferences              │  │
│  │  3. Click "Compare Restaurants"                         │  │
│  │  4. Watch live browser previews as agents research      │  │
│  │  5. View ranked safety cards + detail panel             │  │
│  └────────────────────┬───────────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────────┘
                        │  POST /api/scrape (x N restaurants, parallel)
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              Next.js API Route (/api/scrape)                  │
│                                                              │
│  @tiny-fish/sdk — client.agent.stream() per restaurant       │
│  TINYFISH_API_KEY stored server-side in .env.local           │
│                                                              │
│  SSE Stream Events:                                          │
│    • STREAMING_URL → live browser preview (iframe)           │
│    • STEP          → agent progress updates                  │
│    • COMPLETE      → structured safety JSON                  │
│    • ERROR         → failure message                         │
└────────┬──────────────┬──────────────┬───────────────────────┘
         │              │              │
         ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐
   │  Google   │  │  Google   │  │  Google   │  ... (2–5 restaurants)
   │  Maps:    │  │  Maps:    │  │  Maps:    │
   │  Rest. A  │  │  Rest. B  │  │  Rest. C  │
   └───────────┘  └───────────┘  └───────────┘
```
