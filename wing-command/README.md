# Wing Command
**Live Demo: https://wings-command.up.railway.app/**

**Flavor-first, hyper-local chicken wing tracker powered by TinyFish**

A "War Room" interface that scouts the best chicken wings near you in real-time. Pick a flavor persona, enter your zip, and parallel AI browser agents hit DoorDash, Uber Eats, Grubhub, and Google simultaneously — streaming results back as each source completes.

## Visual Identity

- **Theme:** "Midnight Turf" — dark `#050505` background with subtle grass texture grid
- **Accents:** Neon Green (`#39FF14`) glows, stadium lighting effects
- **Typography:** Bebas Neue (scoreboard) + Inter (body)
- **Cards:** Glassmorphism Scout Cards with backdrop blur
- **Animations:** Framer Motion parallax, floating particles, tackle-in card entrances

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Client)                    │
│                                                         │
│  FlavorSelector → ZipSearch → WingGrid (streams in)     │
└──────────────────────────┬──────────────────────────────┘
                           │ GET /api/scout?zip=&flavor=
                           │ (SSE — results stream as agents finish)
┌──────────────────────────▼──────────────────────────────┐
│                   Next.js App Router                    │
│                                                         │
│  /api/scout/route.ts                                    │
│    │                                                    │
│    ├─ 1. geocode.ts ──► Nominatim (free, no key)        │
│    │                                                    │
│    ├─ 2. Groq LLM ────► generates 5–7 source URLs       │
│    │      llama-3.3-70b-versatile                       │
│    │                                                    │
│    └─ 3. TinyFish SDK ─► Promise.allSettled             │
│           client.agent.stream({ url, goal })            │
│           │                                             │
│           ├── Agent → DoorDash city wings page          │
│           ├── Agent → Uber Eats city wings page         │
│           ├── Agent → Grubhub city wings page           │
│           └── Agent → Google search results             │
│                                                         │
│           Each agent fires EventType.COMPLETE           │
│           → spots sent to client immediately via SSE    │
└─────────────────────────────────────────────────────────┘

No database. No cache. Pure in-memory — results live only for the request.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal })
  │
  ├── EventType.STARTED   → agent confirmed running
  ├── EventType.PROGRESS  → live step updates (shown in UI)
  └── EventType.COMPLETE
        └── RunStatus.COMPLETED → event.result → parse restaurants → SSE → client
```

## Flavor Personas

Users pick a team/flavor before searching:

| Persona | Keywords | Emoji |
|---------|----------|-------|
| **The Face-Melter** | Habanero, Ghost Pepper, Carolina Reaper, Atomic | 🔥 |
| **The Classicist** | Buffalo, Hot, Mild, Traditional, Cayenne | 🦬 |
| **The Sticky Finger** | Honey BBQ, Garlic Parm, Teriyaki, Korean | 🍯 |

Spots are scored 0–100 against the selected persona.

## Scraping Flow

1. User enters ZIP + selects Flavor Persona
2. **Geocode** via Nominatim (free, no API key)
3. **Groq** (`llama-3.3-70b-versatile`) generates 5–7 real search URLs for the location
4. **Parallel scrape** (`Promise.allSettled`) — one TinyFish browser agent per URL:
   - DoorDash city wings page
   - Uber Eats city wings page
   - Grubhub city wings page
   - Google search results
5. **Deduplicate** by normalized name + address
6. **Score** against flavor persona keywords
7. Results stream back to the client as each agent completes

## Setup

### Prerequisites

- Node.js 22.x
- TinyFish API key
- Groq API key

### Environment Variables

```bash
cp .env.example .env.local
```

Then fill in:

```env
# TinyFish (required) — https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=your-tinyfish-api-key

# Groq (required) — https://console.groq.com
GROQ_API_KEY=your-groq-api-key
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Deployment

The app is deployed on Railway. Any Node-compatible host works — no external services to provision.

### Render.com (alternative)

Vercel serverless functions have a 60-second timeout. Parallel scraping across 4 platforms can exceed this. Render Web Services have no timeout limit.

1. Create a Web Service — connect your GitHub repo
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
2. Add environment variables:

```yaml
services:
  - type: web
    name: wing-command
    runtime: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: TINYFISH_API_KEY
        sync: false
      - key: GROQ_API_KEY
        sync: false
```

`next.config.mjs` already includes `output: 'standalone'` for Render compatibility.

## Project Structure

```
wing-command/
├── app/
│   ├── layout.tsx              # Root layout (Bebas Neue + Inter fonts)
│   ├── page.tsx                # War Room main page
│   ├── globals.css             # Midnight Turf theme
│   ├── loading.tsx             # Loading state
│   ├── error.tsx               # Error boundary
│   └── api/
│       ├── scout/route.ts      # GET /api/scout?zip=xxxxx&flavor=classicist
│       └── discover/route.ts   # URL discovery via Groq
├── components/
│   ├── HeroVisuals.tsx         # Parallax + floating particles (Framer Motion)
│   ├── FlavorSelector.tsx      # 3 flavor persona cards with pulse animation
│   ├── ZipSearch.tsx           # Stadium-lit glowing zip input
│   ├── WingGrid.tsx            # Scout Cards grid (glassmorphism)
│   └── ui/                     # Reusable UI primitives
├── lib/
│   ├── types.ts                # TypeScript definitions (pure in-memory, no DB)
│   ├── utils.ts                # Flavor scoring, dedup, formatting
│   ├── geocode.ts              # Nominatim geocoding (no API key needed)
│   └── env.ts                  # Environment validation
├── tailwind.config.ts          # Midnight Turf theme
├── next.config.mjs             # Standalone output
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|-----------|--------|
| Google Places API used? | NO (OSM/Nominatim) |
| Yelp API used? | NO |
| External database or cache used? | NO (pure in-memory) |
| UI "Mesmerizing"? | YES (Framer Motion, glassmorphism, neon glow) |
| Scraping parallel? | YES (`Promise.allSettled` across 4–7 sources) |
| Flavor persona filtering? | YES (keyword matching, 0–100 scoring) |

## Tech Stack

- **Framework:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **AI / LLM:** Groq (`llama-3.3-70b-versatile`) for URL discovery
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **Geocoding:** Nominatim (OpenStreetMap) — no API key required
- **Deployment:** Railway / Render.com
