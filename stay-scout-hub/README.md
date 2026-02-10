# StayScout Hub

**Live:** [https://stayscouthub.lovable.app/](https://stayscouthub.lovable.app/)

StayScout Hub helps travelers decide **where to stay in a city — and why**.  
Instead of jumping straight to hotel booking sites, it analyzes **neighborhoods first**, using AI-powered area discovery and live browser research to explain the pros, cons, risks, and best hotels in each area.

The app combines:
- **Gemini** for intelligent area suggestions
- **Mino autonomous browser agents** for real-time hotel and neighborhood research

---

## Demo

https://github.com/user-attachments/assets/0413dc34-c20d-481e-9a70-ca860cdf36e1

---

## Mino API Usage

StayScout Hub uses the **Mino SSE Browser Automation API** to research each recommended neighborhood in parallel.

For every suggested area, a Mino agent:
- Opens Google Maps and hotel listings
- Observes location context, nearby landmarks, and transport
- Scans hotel ratings and review signals
- Returns a structured analysis with suitability, pros/cons, risks, and top hotels

### Example Mino API Call

```ts
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.TINYFISH_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: `https://www.google.com/maps/search/hotels+in+${areaName},+${city}`,
    goal: `
You are researching "${areaName}" in ${city} to help a traveler
decide if it's a good place to stay for a ${purpose} trip.

Return structured JSON with suitability, pros, cons, risks,
and top hotel recommendations.
`,
  }),
})
```

The response streams **Server-Sent Events (SSE)**:

- `STREAMING_URL` → live browser view

- `STATUS` → progress updates

- `COMPLETE` → final area analysis JSON

## How It Works

- User enters city and travel purpose (e.g., San Francisco — Business trip)

- Area discovery (Gemini) suggests 3–6 relevant neighborhoods

- Parallel Mino agents launch — one per area

- Live research streams into the UI with screenshots and status updates

- Final recommendations explain where to stay, with reasons and hotel examples

## Architecture Overview
```bash
┌─────────────────────────────────────────────────────────┐
│                     User (Browser)                       │
│  ┌─────────────────────────────────────────────────┐    │
│  │  React Frontend                                  │    │
│  │                                                  │    │
│  │  1. Enter city & purpose                         │    │
│  │  2. View live area research cards                │    │
│  │  3. Compare neighborhoods                        │    │
│  └──────────────────┬──────────────────────────────┘    │
└─────────────────────┼───────────────────────────────────┘
                      │
          Stage 1     │  POST /discover-areas
                      ▼
┌─────────────────────────────────────────────────────────┐
│                 Gemini API                               │
│  - Suggests best neighborhoods for the trip             │
└─────────────────────┬───────────────────────────────────┘
                      │
          Stage 2     │  POST /research-area (x N, parallel)
                      ▼
┌─────────────────────────────────────────────────────────┐
│                     Mino API                            │
│  - Launches browser agents per area                     │
│  - Streams live previews and status                     │
│  - Returns structured area analysis                    │
└──────────┬──────────┬──────────┬──────────┬────────────┘
           ▼          ▼          ▼          ▼
      Area 1      Area 2      Area 3      Area N
```

## What the App Analyzes

For each area, StayScout Hub returns:

  - Overall suitability score (1–10)
  
  - Who the area is best for (business, family, sightseeing, etc.)
  
  - Pros, cons, and potential risks
  
  - Walkability, noise level, safety notes
  
  - Top 3–5 recommended hotels with ratings

This helps users choose the right neighborhood first, before comparing hotel prices.

## How to Run
Prerequisites :
- Node.js 18+
- Gemini API key
- Mino API key [get one her](https://mino.ai/api-keys)

## Setup

1. Install dependencies:
```bash
cd stay-scout-hub
npm install
```

2. Create a .env.local file:
```bash
GEMINI_API_KEY=your_gemini_api_key
TINYFISH_API_KEY=your_mino_api_key
```

3. Start the dev server:
```bash
npm run dev
```

4. Open http://localhost:3000

## Environment Variables

- GEMINI_API_KEY	- Area discovery and neighborhood reasoning 
- TINYFISH_API_KEY -	Live browser automation for area research	

## Notes

- Area discovery uses Gemini for reasoning, not web scraping

- All neighborhood research uses live browser automation via Mino

- No booking platforms or hotel pricing APIs are required

- Results explain why an area is good or bad — not just where to book
