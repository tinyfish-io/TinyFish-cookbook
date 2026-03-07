# Wing Scout - Super Bowl LX War Room

**Flavor-first, mesmerizing, hyper-local chicken wing tracker for Super Bowl LX (Feb 8, 2026).**

A "War Room" interface that scouts the best chicken wings near you in real-time using AI-powered parallel scraping from DoorDash, Uber Eats, Grubhub, and Google.

## Visual Identity

- **Theme:** "Midnight Turf" - Dark #050505 background with subtle grass texture grid
- **Accents:** Neon Green (#39FF14) glows, stadium lighting effects
- **Typography:** Bebas Neue (scoreboard style) + Inter (body)
- **Cards:** Glassmorphism "Scout Cards" with backdrop blur
- **Animations:** Framer Motion parallax, floating particles, "tackle-in" card entrances

## Architecture

```
Frontend (Next.js 14 App Router)
  |-- page.tsx           -> War Room hero + flavor selector + results grid
  |-- HeroVisuals.tsx    -> Parallax field lines + floating wing/confetti particles
  |-- FlavorSelector.tsx -> 3 flavor personas with pulsing selection
  |-- ZipSearch.tsx      -> Stadium-light illuminated zip input
  |-- WingGrid.tsx       -> Glassmorphism Scout Cards grid

Backend (API Route)
  |-- /api/scout         -> Main endpoint (zip + flavor)
  |-- lib/tinyfish-scraper.ts     -> TinyFish parallel scraping engine
  |-- lib/geocode.ts     -> Nominatim (OpenStreetMap) geocoding
  |-- lib/cache.ts       -> Upstash Redis caching layer

Data
  |-- Supabase (PostgreSQL + PostGIS)
  |-- Upstash Redis (15-min TTL cache)
```

## Flavor Personas

Users pick a team/flavor before searching:

| Persona | Keywords | Emoji |
|---------|----------|-------|
| **The Face-Melter** | Habanero, Ghost Pepper, Carolina Reaper, Atomic | 🔥 |
| **The Classicist** | Buffalo, Hot, Mild, Traditional, Cayenne | 🦬 |
| **The Sticky Finger** | Honey BBQ, Garlic Parm, Teriyaki, Korean | 🍯 |

Spots are scored 0-100 against the selected persona.

## Scraping Flow

1. User enters ZIP + selects Flavor Persona
2. **Geocode** via Nominatim (free, no API key)
3. **Parallel scrape** (`Promise.allSettled`):
   - DoorDash search results
   - Uber Eats search results
   - Grubhub search results
   - Google search (hidden gem detection)
4. **Deduplicate** by normalized name + address
5. **Score** against flavor persona keywords
6. **Cache** in Redis (15-min TTL) + persist to Supabase

## Setup

### Prerequisites

- Node.js >= 18
- Supabase project (free tier works)
- TinyFish API key
- Upstash Redis (optional but recommended)

### Environment Variables

Create `.env.local`:

```env
# Required - Server
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
TINYFISH_API_KEY=your-tinyfish-api-key

# Required - Client
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# Optional - Caching (highly recommended)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token

# Optional - Custom TinyFish endpoint
TINYFISH_API_URL=https://agent.tinyfish.ai/v1/automation/run
```

### Database Setup

Run the schema in your Supabase SQL editor:

```bash
# The schema file is at:
supabase/schema.sql
```

This creates:
- `wing_spots` table with `flavor_tags` (TEXT[]), `menu_json` (JSONB), and PostGIS spatial indexing
- `geocode_cache` table (permanent zip-to-lat/lng mapping)
- `scrape_queue` table (for background cron jobs)
- `menus` table (cached restaurant menus)
- PostGIS trigger for auto-computing `location` from `lat`/`lng`
- Row Level Security policies

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Render.com Deployment (Migration from Vercel)

### Why Render?

Vercel serverless functions have a **60-second timeout** (300s on Hobby with Fluid Compute). Parallel scraping across 4 platforms can exceed this. Render Web Services have **no timeout limit**.

### Render Setup

1. **Create a Web Service** on Render
   - Connect your GitHub repository
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
   - **Environment:** Node
   - **Plan:** Starter ($7/mo) or Free (with limitations)

2. **Environment Variables**
   - Add all env vars from the `.env.local` section above
   - Set `NODE_ENV=production`

3. **Render Config (`render.yaml`)**

```yaml
services:
  - type: web
    name: wing-scout
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: NEXT_PUBLIC_SUPABASE_URL
        sync: false
      - key: NEXT_PUBLIC_SUPABASE_ANON_KEY
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: TINYFISH_API_KEY
        sync: false
      - key: UPSTASH_REDIS_REST_URL
        sync: false
      - key: UPSTASH_REDIS_REST_TOKEN
        sync: false
```

4. **Next.js Standalone Output**
   - `next.config.mjs` includes `output: 'standalone'` which is required for Render deployment

### Cron Job (Optional)

Set up a Render Cron Job to pre-populate the database:

- **Schedule:** `0 */4 * * *` (every 4 hours)
- **Command:** `python scraper/scrape_wings.py`
- This pre-scrapes 150+ major US zip codes

## Project Structure

```
wing-scout/
├── app/
│   ├── layout.tsx              # Root layout (Bebas Neue + Inter fonts)
│   ├── page.tsx                # War Room main page
│   ├── globals.css             # Midnight Turf theme styles
│   ├── loading.tsx             # Loading state
│   ├── error.tsx               # Error boundary
│   └── api/
│       ├── scout/route.ts      # GET /api/scout?zip=xxxxx&flavor=classicist
│       └── menu/route.ts       # GET /api/menu?spot_id=xxxxx
├── components/
│   ├── HeroVisuals.tsx         # Parallax + floating particles (Framer Motion)
│   ├── FlavorSelector.tsx      # 3 flavor persona cards with pulse animation
│   ├── ZipSearch.tsx           # Stadium-lit glowing zip input
│   ├── WingGrid.tsx            # Scout Cards grid (glassmorphism)
│   └── ui/                     # Reusable UI primitives
├── lib/
│   ├── tinyfish-scraper.ts              # TinyFish scraper (parallel, flavor-aware)
│   ├── types.ts                # TypeScript definitions
│   ├── utils.ts                # Flavor scoring, dedup, formatting
│   ├── supabase.ts             # Database client
│   ├── cache.ts                # Upstash Redis caching
│   ├── geocode.ts              # Nominatim geocoding
│   ├── env.ts                  # Environment validation
│   └── menu.ts                 # Menu fetching
├── supabase/
│   └── schema.sql              # Full database schema
├── scraper/
│   └── scrape_wings.py         # Python cron pre-scraper
├── tailwind.config.ts          # Midnight Turf theme
├── next.config.mjs             # Standalone output for Render
└── package.json                # framer-motion, lucide-react, etc.
```

## Constraint Checklist

| Constraint | Status |
|-----------|--------|
| Google Places API used? | NO (OSM/Nominatim) |
| Yelp API used? | NO |
| Vercel deployment? | NO (Render.com) |
| UI "Mesmerizing"? | YES (Framer Motion, glassmorphism, neon glow) |
| Menu scraping parallel? | YES (`Promise.allSettled` across 4 sources) |
| Flavor persona filtering? | YES (keyword matching, 0-100 scoring) |

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Database:** Supabase (PostgreSQL + PostGIS)
- **Cache:** Upstash Redis
- **Scraper:** TinyFish
- **Geocoding:** Nominatim (OpenStreetMap)
- **Deployment:** Render.com (Web Service)
