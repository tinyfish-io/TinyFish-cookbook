# 🛵 Vietnam Bike Price Scout

> Compare motorbike rental prices across Vietnam in seconds — powered by [TinyFish Mino](https://mino.ai/) parallel browser agents.

**Live demo → [viet-bike-scout.vercel.app](https://viet-bike-scout.vercel.app)**

---

## What it does

Rental shops in Vietnam don't list prices on any aggregator. You have to visit 5–10 different websites, each with different layouts, currencies, and formats. This app sends Mino browser agents to all of them **simultaneously**, extracts structured pricing data, and streams results back to a unified dashboard in real time.

- Search up to **4 cities at once** — HCMC, Hanoi, Da Nang, Nha Trang
- Filter by **bike type** — Scooter, Semi-Auto, Manual, Adventure
- **Sort by price** (low→high or high→low) and **filter by model name** (Honda, Vespa, Yamaha, etc.)
- Watch **live browser agent iframes** — all agent windows shown in parallel by default
- Toggle between **live scraping** and **cached results** (6-hour TTL)
- Results stream in as each shop completes — no waiting for the slowest one

---

## How it works

```
User clicks Search
       │
       ▼
POST /api/search
       │
       ├── Cache hit? → stream result instantly via SSE
       │
       └── Cache miss? → fire Mino SSE request for each shop (staggered 500ms)
                              │
                              ├── STREAMING_URL event → forward iframe URL to client
                              │
                              └── COMPLETED event → parse JSON, stream to client, upsert to cache
```

Each city has 5–6 target shops. Mino handles all the hard parts: cookie banners, dynamic loading, VND→USD conversion, pagination. The API route streams results via **Server-Sent Events** so the UI updates as shops finish — typically within 15–30 seconds for a full city scrape.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSE streaming via Node.js runtime |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui | Fast, clean, no design system overhead |
| Scraping | [TinyFish Mino API](https://mino.ai/) | Parallel browser agents, structured JSON output |
| Caching | Supabase (Postgres) | 6-hour TTL, graceful degradation if unavailable |
| Hosting | Vercel | Zero-config, auto-deploys |

---

## Running locally

```bash
git clone https://github.com/tinyfish-io/tinyfish-cookbook
cd tinyfish-cookbook/viet-bike-scout
npm install
```

Create a `.env.local` file:

```env
TINYFISH_API_KEY=your_key_here

# Optional — for result caching (app works fine without it)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get a Mino API key at [mino.ai](https://mino.ai/).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Covered shops

| City | Shops |
|---|---|
| 🏙️ HCMC | Tigit Motorbikes, Wheelie Saigon, Saigon Motorcycles, Style Motorbikes, The Extra Mile |
| 🏛️ Hanoi | Motorbike Rental Hanoi, Off Road Vietnam, Rent Bike Hanoi, Book2Wheel, Motorvina |
| 🌊 Da Nang | Motorbike Rental Da Nang, Da Nang Motorbikes, Da Nang Bike, Motorbike Rental Hoi An, Hoi An Bike Rental, Tuan Motorbike |
| 🏖️ Nha Trang | Moto4Free, Motorbike Mui Ne |

---

## Mino prompt

The same goal prompt is sent to every shop URL:

```
You are extracting motorbike rental pricing from this website.

1. Navigate to the pricing or rental page if not already there
2. Handle any popups or cookie banners by dismissing them
3. Find ALL motorbike/scooter listings with their prices
4. If there is a "Load More" button or pagination, click through all pages
5. Extract: bike name, engine size (cc), type, daily/weekly/monthly price in USD,
   deposit, availability, and link to the bike's detail page
```

Output is a structured JSON object — shop name, city, website, and a `bikes[]` array. Mino handles currency conversion from VND automatically.

---

## Caching

Results are cached in Supabase with a 6-hour TTL, keyed by `(city, website)`. The cache toggle on the UI lets you choose between instant cached results and a fresh live scrape. The app degrades gracefully — if Supabase is unreachable, all requests go live without any error.

---

## Live browser agent iframes

When a live scrape is running, Mino returns a `streamingUrl` for each agent — a real browser session you can watch in an iframe. All active agent windows are shown in parallel by default, with a collapse button to minimize the grid.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx              # Main UI — city/type selection, sort/filter toolbar, results, iframes
│   └── api/search/route.ts   # SSE endpoint — cache lookup + Mino orchestration
├── hooks/
│   └── use-bike-search.ts    # SSE client, state management, StreamingPreview type
└── components/
    ├── live-preview-grid.tsx  # Live iframe grid (all shown by default, collapsible)
    ├── results-grid.tsx       # Shop cards grouped by store
    ├── shop-group.tsx         # Individual shop section
    └── bike-card.tsx          # Single bike listing card
```

---

Built as a take-home demo for [TinyFish](https://tinyfish.io) — showing what's possible when you give Mino a list of niche local websites and let it run in parallel.
