# 🏠 Viet Real Estate Scout

> Compare real estate listings across Vietnam's top property sites in seconds — powered by [TinyFish](https://tinyfish.ai/) parallel browser agents.

---

## What it does

Finding apartments, houses, or land in Vietnam means visiting 5+ different websites, each with different layouts, filters, and search UX. This app sends TinyFish browser agents to **all of them simultaneously**, extracts structured listing data, and streams results back to a unified dashboard with an interactive map.

- Search **any location** — type any address, district, or city
- Filter by **listing type** (Mua bán / Cho thuê) and **property type** (Căn hộ, Nhà phố, Đất nền, Phòng trọ)
- **Price range** presets adapted to buy vs rent
- **Map view** with geocoded pins (Leaflet + OpenStreetMap)
- Watch **live browser agent iframes** — see TinyFish scraping in real-time
- Toggle between **live scraping** and **cached results** (6-hour TTL)
- Results stream in as each site completes — no waiting for the slowest one

### Sites scraped

| Site | URL |
|------|-----|
| Batdongsan.com.vn | batdongsan.com.vn |
| Nha.vn | nha.vn |
| Cho Tot | nhatot.com |
| Muaban.net | muaban.net |
| Alonhadat | alonhadat.com.vn |

---

## How it works

```
User enters location + filters → clicks Search
       │
       ▼
POST /api/search
       │
       ├── Cache hit? → stream cached results instantly via SSE
       │
       └── Cache miss? → fire TinyFish SSE requests to all 5 sites in parallel
                              │
                              ├── STREAMING_URL event → forward iframe URL to client
                              │
                              └── LISTING_RESULT event → parse JSON, stream to client
                                                          │
                                                          └── Upsert to Supabase cache
       │
       ▼
Client receives results → geocodes addresses → renders grid + map pins
```

Each site is scraped independently via TinyFish. The API route streams results via **Server-Sent Events** so the UI updates as sites finish.

---

## TinyFish API usage

The core integration — sending a natural language goal to TinyFish for each real estate site:

```typescript
// src/lib/tinyfish-client.ts
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Accept: "text/event-stream",
    "X-API-Key": apiKey,
  },
  body: JSON.stringify({
    url: siteUrl,  // e.g. "https://batdongsan.com.vn"
    goal: `Search for "Quận 1, HCMC" → extract listings with title, price, area, address...`,
  }),
});
```

TinyFish handles navigation, popups, filters, and dynamic content extraction — no selectors needed.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js (App Router) | SSE streaming via Node.js runtime |
| UI | React + Tailwind CSS + shadcn/ui | Fast, clean, responsive |
| Scraping | [TinyFish API](https://tinyfish.ai/) | Parallel browser agents, structured JSON |
| Map | react-leaflet + OpenStreetMap | Free, no API key needed |
| Geocoding | Nominatim (OSM) | Free, no API key needed |
| Caching | Supabase (Postgres) | 6-hour TTL, optional |
| Hosting | Vercel | Zero-config deployment |

---

## Running locally

```bash
git clone https://github.com/tinyfish-io/tinyfish-cookbook
cd tinyfish-cookbook/viet-real-estate-scout
npm install
```

Create a `.env.local` file:

```env
TINYFISH_API_KEY=your_key_here

# Optional — for result caching (app works fine without it)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get a TinyFish API key at [tinyfish.ai](https://tinyfish.ai/).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Optional: Supabase cache setup

If you want result caching, create a Supabase project and run the migration:

```sql
-- supabase/migrations/001_create_property_cache.sql
CREATE TABLE IF NOT EXISTS property_cache (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  search_key TEXT NOT NULL,
  source_site TEXT NOT NULL,
  listing_data JSONB NOT NULL,
  scraped_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (search_key, source_site)
);
```

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Client (React)                    │
│                                                     │
│  SearchForm → usePropertySearch hook → SSE stream    │
│       │              │                    │          │
│       │         ResultsGrid          MapView         │
│       │         (property cards)    (Leaflet pins)   │
│       │              │                    │          │
│       │         LivePreviewGrid     Nominatim        │
│       │         (TinyFish iframes)  (geocoding)      │
├───────┼─────────────────────────────────────────────┤
│       ▼           Server (Next.js API Route)         │
│                                                     │
│  POST /api/search                                    │
│       │                                             │
│       ├── Supabase cache check (optional)            │
│       │                                             │
│       └── TinyFish SSE × 5 sites (parallel)          │
│              │                                      │
│              └── batdongsan · nha.vn · chotot        │
│                  muaban · alonhadat                   │
└─────────────────────────────────────────────────────┘
```
