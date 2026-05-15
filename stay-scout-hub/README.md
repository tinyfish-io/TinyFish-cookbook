# Stay Scout Hub
**Live Demo:** _add URL after deploy_

**Smart hotel research tool — AI agents find the right neighborhood and booking platform before you book.**

Enter your destination, travel purpose, and dates. Stay Scout discovers the best neighborhoods for your trip using real travel guides, researches each area via Google Maps, and checks availability across all relevant booking platforms simultaneously.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  SearchFormV2 → PurposeSelector → AreaResultsSection        │
│                                 → ResultsSection            │
│                 (results stream in as agents finish)        │
└────────────────────────────┬────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐ ┌───────────────┐ ┌────────────────────┐
│ /api/discover-  │ │ /api/discover-│ │ /api/research-area │
│ areas           │ │ platforms     │ │ /api/check-platform│
│                 │ │               │ │                    │
│ TinyFish Search │ │ TinyFish      │ │ TinyFish Agent     │
│ → find guides   │ │ Search        │ │ client.agent       │
│                 │ │ → find which  │ │ .stream(...)       │
│ TinyFish Fetch  │ │ platforms     │ │                    │
│ → extract       │ │ operate here  │ │ SSE → client       │
│ neighborhoods   │ │               │ │                    │
│                 │ │ Groq LLM      │ │                    │
│ Groq LLM        │ │ → build URLs  │ │                    │
│ → structure     │ │               │ │                    │
└─────────────────┘ └───────────────┘ └────────────────────┘
```

### All three TinyFish APIs — each used for what it does best

```
Search API  → client.search.query({ query })
              Discovers relevant travel guide URLs and booking platform URLs
              No browser needed — fast structured results

Fetch API   → client.fetch.get_contents({ urls, format: "markdown" })
              Extracts clean text from travel guides found by Search
              Up to 10 URLs per call, returned as clean markdown

Agent API   → client.agent.stream({ url, goal })
              Full browser navigation for Google Maps area research
              and entering dates/guests on booking platforms
              EventType.STREAMING_URL → live iframe in UI
              EventType.COMPLETE + RunStatus.COMPLETED → event.result
```

## Flow

1. User enters city, purpose, dates, guests
2. **`/api/discover-areas`** — Search finds travel guides → Fetch extracts neighborhood content → Groq structures into area recommendations
3. **`/api/discover-platforms`** — Search finds which booking platforms operate in that city/region
4. **`/api/research-area`** — one TinyFish agent per area navigates Google Maps, returns suitability score, pros/cons, walkability, noise level, top hotels (streamed via SSE)
5. **`/api/check-platform`** — one TinyFish agent per platform enters dates + guests, returns direct search results URL (streamed via SSE)

## Purpose Modes

| Purpose | What it optimises for |
|---|---|
| Business | Proximity to business district, conference centers |
| Exam / Interview | Quiet area, good sleep, low noise |
| Family Visit | Family-friendly, comfortable, residential |
| Sightseeing | Walking distance to attractions, transport |
| Late Night | Nightlife access, flexible check-in |
| Airport Transit | Proximity to airport, shuttle access |

## Setup

### Prerequisites

- Node.js 18+
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

## Project Structure

```
stay-scout-hub/
├── src/
│   ├── app/
│   │   ├── layout.tsx                   # Root layout
│   │   ├── page.tsx                     # Main UI
│   │   ├── globals.css
│   │   └── api/
│   │       ├── discover-areas/          # Search + Fetch → neighborhood discovery
│   │       ├── discover-platforms/      # Search → booking platform discovery
│   │       ├── research-area/           # Agent → Google Maps area research (SSE)
│   │       └── check-platform/          # Agent → platform date/guest search (SSE)
│   ├── components/
│   │   ├── HeroSection.tsx
│   │   ├── SearchFormV2.tsx
│   │   ├── PurposeSelector.tsx
│   │   ├── AreaResultsSection.tsx
│   │   ├── AreaCard.tsx
│   │   ├── ResultsSection.tsx
│   │   ├── PlatformCard.tsx
│   │   └── LiveBrowserPreview.tsx       # Live agent iframe grid
│   ├── hooks/
│   │   ├── useAreaSearch.ts             # Area discovery + research state
│   │   └── useHotelSearch.ts            # Platform discovery + check state
│   ├── lib/
│   │   ├── api/area-search.ts
│   │   ├── api/hotel-search.ts
│   │   └── utils.ts
│   └── types/hotel.ts
├── next.config.ts
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Cache layer used? | NO (all results fetched live) |
| All three TinyFish APIs used? | YES (Search, Fetch, Agent) |
| Area research via real browser? | YES (`client.agent.stream` → Google Maps) |
| Platform check via real browser? | YES (`client.agent.stream` → booking sites) |
| Live browser preview? | YES (`EventType.STREAMING_URL` → iframe) |

## Tech Stack

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Animations:** Framer Motion
- **Icons:** Lucide React
- **Browser Agents:** TinyFish SDK (`client.agent.stream`, `client.search.query`, `client.fetch.get_contents`)
- **LLM:** Groq (`llama-3.3-70b-versatile`) for structuring extracted content
- **Deployment:** Vercel
