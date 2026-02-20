# Wing Command

[**Live App**](https://wingscommand.up.railway.app/)

A hyper-local chicken wing price comparison tool for Super Bowl watch parties. Wing Command uses the TinyFish API to dispatch parallel web agents across DoorDash, UberEats, Grubhub, and Google, finding the best wing deals near any US zip code in real-time.

## TinyFish API Usage

Wing Command fires 4 TinyFish agents simultaneously using `Promise.allSettled` for fault-tolerant parallel scraping:

```typescript
// lib/agentql.ts — Core TinyFish API call
async function runMinoScrape(url: string, goal: string, timeoutMs: number) {
    const response = await fetch(MINO_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': MINO_API_KEY,
        },
        body: JSON.stringify({ url, goal }),
        signal: AbortSignal.timeout(timeoutMs),
    });
    const data = await response.json();
    return { success: true, data: data.result };
}

// Parallel scraping across 4 platforms
export async function scrapeAllSources(zipCode, lat, lng, flavor, city, state) {
    const results = await Promise.allSettled([
        withTimeout(scrapeGoogle(zipCode, city, state),   120000, []),
        withTimeout(scrapeDoorDash(zipCode, city, state), 120000, []),
        withTimeout(scrapeGrubhub(zipCode, city, state),  120000, []),
        withTimeout(scrapeUberEats(zipCode, city, state), 120000, []),
    ]);

    // Merge results — if one platform fails, others still return data
    const allRestaurants = [];
    results.forEach((result) => {
        if (result.status === 'fulfilled') {
            allRestaurants.push(...result.value);
        }
    });
    return deduplicateAndProcess(allRestaurants);
}
```

Each platform scraper uses a natural language goal to extract structured JSON:

```typescript
// Example: DoorDash scraper goal
const goal = `Find chicken wings restaurants that deliver to zip code ${zipCode}.
Extract a JSON array of restaurants with: name, address, delivery_time,
rating, image_url, is_open, store_url. Return as JSON array called "restaurants".`;

const result = await runMinoScrape(searchUrl, goal);
```

## How to Run

### Prerequisites

- Node.js >= 18
- TinyFish API key ([sign up at tinyfish.ai](https://tinyfish.ai))
- Supabase project (free tier works)
- Upstash Redis (optional, recommended for caching)

### Setup

1. Install dependencies:
```bash
npm install
```

2. Create `.env.local`:
```env
# Required
AGENTQL_API_KEY=your_tinyfish_api_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional (caching)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

3. Run the database schema:
```bash
# Execute supabase/schema.sql in your Supabase SQL editor
```

4. Start the app:
```bash
npm run dev
```

5. Open http://localhost:3000

## Architecture

```
User Browser
    |
    v
Next.js 14 (App Router)
    |
    |-- GET /api/scout?zip=94306 ---------> TinyFish API (parallel agents)
    |                                         |-- DoorDash search
    |                                         |-- UberEats search
    |                                         |-- Grubhub search
    |                                         |-- Google search
    |                                         v
    |                                    Merge + Deduplicate + Score
    |
    |-- GET /api/menu?spot_id=xxx --------> TinyFish API (per-restaurant)
    |                                         |-- Extract menu items + prices
    |                                         v
    |                                    Calculate $/wing
    |
    |-- GET /api/deals?spot_id=xxx -------> TinyFish API
    |                                         |-- Scan deal roundups (KCL, TODAY.com)
    |                                         v
    |                                    Match deals to restaurants
    |
    |-- Supabase (PostgreSQL) -----------> Persistence (wing_spots, menus)
    |-- Upstash Redis -------------------> Cache (15-min TTL, scouting locks)
```

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Animations:** Framer Motion
- **Database:** Supabase (PostgreSQL)
- **Cache:** Upstash Redis
- **Web Agents:** TinyFish API (parallel scraping)
- **Geocoding:** Nominatim (OpenStreetMap, no API key needed)
- **Deployment:** Railway
