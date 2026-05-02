# Stay vs Hotel Scout

**Compare Airbnb, Booking.com & Agoda — all at once, powered by AI.**

Searching for accommodation means juggling three different tabs, three different layouts, and three different pricing formats. Stay vs Hotel Scout fires a TinyFish browser agent at all three platforms simultaneously, streams results back in real time, and then runs a two-stage Gemini AI pipeline to brief you before the search and rank every listing after it — with per-listing reasoning, benefits, and drawbacks.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Browser (Client)                       │
│                                                              │
│  City + dates + guests + trip type → Search All Platforms   │
│                                                              │
│  Stage 1: Trip Briefing card (Gemini, fires immediately)     │
│  Stage 2: Live agent iframes per platform (TinyFish)         │
│  Stage 3: AI Smart Summary + per-listing ranking (Gemini)    │
└─────────────────────┬────────────────────────────────────────┘
                      │ GET /api/search/live (SSE)
                      │ POST /api/brief        (pre-search)
                      │ POST /api/rank         (post-search)
┌─────────────────────▼────────────────────────────────────────┐
│                    Express.js Backend                         │
│                                                              │
│  /api/search/live                                            │
│    └─ TinyFish SDK ──► Promise.allSettled                    │
│         client.agent.stream({ url, goal, browser_profile,    │
│                               proxy_config })                │
│         │                                                    │
│         ├── Agent → Airbnb   (stealth + US proxy)           │
│         ├── Agent → Booking.com (stealth + US proxy)        │
│         └── Agent → Agoda    (stealth + US proxy)           │
│                                                              │
│  /api/brief  ──► Gemini (pre-search trip briefing)          │
│  /api/rank   ──► Gemini (post-search listing ranking)       │
└──────────────────────────────────────────────────────────────┘

No database. No cache. Every search hits live platforms in real time.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal })
  │
  ├── onStreamingUrl  → live iframe URL forwarded to client via SSE
  └── onComplete
        └── RunStatus.COMPLETED → extractListings(event.result)
                                   → enriched listings → SSE → client
```

### Two-stage Gemini pipeline

```
User hits Search
  │
  ├── [immediately] POST /api/brief
  │     └── Gemini: city context, best platform for trip type,
  │                 3 tips, what to prioritise
  │                 → Trip Briefing card shown during search
  │
  └── [after all agents complete] POST /api/rank
        └── Gemini: rank all listings by value, rating, fees,
                    trip-purpose suitability
                    → score/10, reasoning, benefits[], drawbacks[]
                    → rank numbers + "Why?" button on every card
```

---

## Features

- **3 parallel agents** — Airbnb, Booking.com, and Agoda searched simultaneously
- **Live browser previews** — iframe streams of each agent while it works
- **Pre-search AI briefing** — Gemini gives trip-specific advice before results arrive
- **Post-search AI ranking** — every listing ranked with a score, reasoning, and benefits/drawbacks
- **Smart Summary** — top pick, best budget, and best rated cards at a glance
- **Trip Type selector** — Leisure, Business, Family, Romantic, Budget, or Backpacking; all Gemini analysis is tailored to your purpose
- **City autocomplete** — Google Maps Places API for accurate city names
- **Gemini model fallback** — automatically tries `gemini-2.5-flash-lite` → `gemini-2.5-flash` → `gemini-2.5-pro` if a model is under load

---

## Scraping Flow

1. User fills in city, check-in, check-out, guests, and trip type and clicks Search
2. `/api/search/live` opens an SSE connection and fires `search_start`
3. `/api/brief` fires immediately — Gemini returns trip briefing while agents work
4. Three TinyFish agents launch in parallel via `Promise.allSettled`, each with stealth browser profile and US proxy
5. `onStreamingUrl` events forward live iframe URLs to the client as agents start
6. Each agent handles cookie banners, popups, login prompts, and currency formats automatically
7. `onComplete` + `RunStatus.COMPLETED` → `extractListings` parses the JSON result → enriched with platform metadata → streamed to client
8. After all agents finish, `complete` event fires and `/api/rank` is called with all listings
9. Gemini ranks every listing and returns scores + reasoning → rank numbers and "Why?" buttons appear on every card

---

## TinyFish Agent Goals

Each platform gets a numbered, explicit goal prompt. Example for Booking.com:

```
You are on Booking.com showing hotel search results for ${city},
check-in ${checkIn}, check-out ${checkOut}, ${guests} guest(s).

1. If you see a cookie consent banner, click "Accept" or "Decline" to dismiss it.
2. If you see a sign-in or registration modal, close it using the X button.
3. Scroll down slightly to see the property listing cards.
4. Extract data from the first 5 property cards you can see.
5. For each property extract: name, property_type, price_per_night in USD,
   total_price in USD, rating (0-10), review_count, listing_url,
   breakfast_included (true/false/null).

Return ONLY a valid JSON array:
[{name, property_type, price_per_night, total_price, rating,
  review_count, listing_url, breakfast_included}]
Use null for missing fields.
```

All three agents use `browser_profile: 'stealth'` and `proxy_config: { enabled: true, country_code: 'US' }`.

---

## Gemini Ranking Prompt

After all listings are collected, a slimmed-down version (name, platform, price, rating, fees) is sent to Gemini:

```
You are a travel expert. Analyse these accommodation listings for a
${purpose} trip and return a JSON ranking.

Return ONLY valid JSON:
{
  "top_pick":    { "name": "...", "platform": "...", "reason": "..." },
  "best_budget": { "name": "...", "platform": "...", "reason": "..." },
  "best_rated":  { "name": "...", "platform": "...", "reason": "..." },
  "ranked": [{
    "rank": 1, "name": "...", "platform": "...", "score": 8.5,
    "summary": "one sentence",
    "reasoning": "2-3 sentences considering the trip purpose",
    "benefits": ["...", "..."],
    "drawbacks": ["...", "..."]
  }],
  "overall_insight": "2-3 sentence summary for this trip purpose"
}
```

---

## Setup

### Prerequisites

- Node.js 18+
- TinyFish API key — [get one here](https://agent.tinyfish.ai/api-keys)
- Gemini API key — [Google AI Studio](https://aistudio.google.com/app/apikey)
- Google Maps API key (optional, for city autocomplete) — [Google Cloud Console](https://console.cloud.google.com/)

### Environment Variables

Create a `.env` file in the project root:

```env
TINYFISH_API_KEY=your-tinyfish-api-key
GEMINI_API_KEY=your-gemini-api-key
GOOGLE_MAPS_KEY=your-google-maps-key   # optional
PORT=3000
```

### Install & Run

```bash
cd stay-vs-hotel-scout
npm install
npm run build
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Express server with `--watch` hot-reload |
| `npm run build` | Build React frontend with Parcel into `public/` |
| `npm run watch` | Watch and rebuild frontend on file changes |

---

## Project Structure

```
stay-vs-hotel-scout/
├── src/
│   ├── index.html              # Entry point
│   ├── index.css               # Tailwind v4 + brand colour
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── App.tsx                 # Root component — state, SSE, Gemini calls
│   └── components/
│       ├── SearchForm.tsx      # City autocomplete, dates, guests, trip type
│       ├── PlatformCard.tsx    # Per-platform column with live iframe
│       ├── ListingCard.tsx     # Single listing — price, rating, rank, Why? toggle
│       └── SmartSummary.tsx    # AI summary — top pick, budget, rated, full ranking
├── lib/
│   ├── platforms.js            # Platform configs — URL builders + agent goals
│   └── helpers.js              # extractListings, sanitizeInput, calcNights
├── server.js                   # Express — SSE search, /api/brief, /api/rank
├── .postcssrc                  # Tailwind v4 PostCSS config
├── tsconfig.json
└── package.json
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Tailwind CSS v4, Parcel |
| Backend | Express.js, Node.js |
| Browser Agents | TinyFish SDK (`client.agent.stream`) |
| AI | Google Gemini (`@google/generative-ai`) |
| City Autocomplete | Google Maps Places API |
| Streaming | Server-Sent Events (SSE) |

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `TINYFISH_API_KEY` | Yes | Browser agent access |
| `GEMINI_API_KEY` | Yes | Pre-search briefing + post-search ranking |
| `GOOGLE_MAPS_KEY` | No | City autocomplete in the search form |
| `PORT` | No | Server port (default: 3000) |
