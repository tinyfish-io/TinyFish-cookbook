# SafeDine

**Live:** [https://restaurant-comparison-tool.vercel.app](https://restaurant-comparison-tool.vercel.app)

SafeDine is a pre-visit restaurant safety intelligence tool that compares 2–5 restaurants before dining by analyzing Google Maps reviews, menu photos, and allergen signals. It uses the TinyFish API to dispatch parallel web agents — one per restaurant — that each navigate Google Maps, read 8–12 reviews, check menu images, and return a structured safety report with scores, allergen risks, and dietary suitability ratings.

## Demo

https://github.com/user-attachments/assets/c684dac5-5e89-43fe-9592-0665a31513f6


## TinyFish API Usage

The app calls the TinyFish SSE endpoint once per restaurant, in parallel. Each agent navigates Google Maps, samples reviews for safety signals, checks menu photos for allergen labeling, and returns a structured JSON report:

```typescript
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": import.meta.env.VITE_MINO_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://www.google.com/maps",
    goal: `You are a fast food-safety research agent. Investigate "${restaurantName}" in ${city}.
           Stay ONLY on Google Maps — do NOT visit external websites.

           STEP 1 — FIND THE RESTAURANT on Google Maps:
           Search "${restaurantName} ${city}". Confirm the correct listing.

           STEP 2 — SAMPLE REVIEWS (keep it fast):
           Open the Reviews tab. Read 8–12 recent reviews. Prioritize mentions of:
           - Food poisoning, allergic reactions, cross-contamination
           - Hygiene, cleanliness, staff responsiveness
           Focus on user allergens: ${allergenList}

           STEP 3 — CHECK MENU IMAGES (if available on Maps):
           Look at the Menu tab or Photos section (3–4 images max).

           STEP 4 — RETURN RESULTS as JSON:
           { "restaurantName": "...", "overallSafetyScore": 75,
             "allergenRisks": [...], "safetySignals": [...], ... }`,
  }),
});
```

The response streams SSE events including a `streamingUrl` (live view of the agent navigating Google Maps) and a final `COMPLETE` event with the extracted safety data JSON.

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

2. Create a `.env` file with your TinyFish API key:

```
VITE_MINO_API_KEY=your_tinyfish_api_key_here
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173)

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      User (Browser)                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │   React + Vite Frontend (Tailwind + shadcn + Framer)   │  │
│  │                                                        │  │
│  │  1. Enter city + 2–5 restaurant names                  │  │
│  │  2. Select allergens & dietary preferences              │  │
│  │  3. Click "Compare Restaurants"                         │  │
│  │  4. Watch live browser previews as agents research      │  │
│  │  5. View ranked safety cards + detail panel             │  │
│  └────────────────────┬───────────────────────────────────┘  │
└───────────────────────┼──────────────────────────────────────┘
                        │  POST /v1/automation/run-sse (x N restaurants, parallel)
                        ▼
┌──────────────────────────────────────────────────────────────┐
│              TinyFish API (agent.tinyfish.ai)                 │
│                                                              │
│  Receives goal prompt + Google Maps URL per restaurant       │
│  Spins up a web agent for each request                       │
│                                                              │
│  SSE Stream Events:                                          │
│    • streamingUrl → live browser preview (iframe)            │
│    • STEP         → agent progress updates                   │
│    • COMPLETE     → structured safety JSON                   │
│    • ERROR        → failure message                          │
└────────┬──────────────┬──────────────┬───────────────────────┘
         │              │              │
         ▼              ▼              ▼
   ┌───────────┐  ┌───────────┐  ┌───────────┐
   │  Google   │  │  Google   │  │  Google   │  ... (2–5 restaurants)
   │  Maps:    │  │  Maps:    │  │  Maps:    │
   │  Rest. A  │  │  Rest. B  │  │  Rest. C  │
   └───────────┘  └───────────┘  └───────────┘
```
