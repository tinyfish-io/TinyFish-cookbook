# Tutor Finder
**Live Demo:** _add URL after deploy_

**AI-powered tutor search — parallel TinyFish browser agents scrape multiple tutoring platforms simultaneously and stream results in real time.**

Select an exam type and enter your location. The app discovers relevant tutoring websites via the TinyFish Search API, then fires one browser agent per site in parallel — each extracting tutor profiles, rates, ratings, and availability. Results stream back as each site completes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  ExamSelector → LocationInput → TutorResultsGrid            │
│  AgentPreviewGrid (live iframes) → CompareDashboard         │
│  (results stream in as agents finish)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
          POST /api/discover   POST /api/scrape
                  │                 │
                  ▼                 ▼
┌─────────────────────┐  ┌──────────────────────────────────┐
│ TinyFish Search API │  │        TinyFish SDK              │
│                     │  │                                  │
│ Finds tutoring      │  │ client.agent.stream({            │
│ platform URLs for   │  │   url, goal                      │
│ exam + location     │  │ })                               │
│                     │  │                                  │
│ Falls back to       │  │ EventType.STREAMING_URL          │
│ hardcoded list if   │  │   → live iframe per agent        │
│ Search unavailable  │  │ EventType.PROGRESS               │
│                     │  │   → status updates               │
│                     │  │ EventType.COMPLETE               │
│                     │  │   + RunStatus.COMPLETED          │
│                     │  │   → tutor profiles → SSE         │
└─────────────────────┘  └──────────────────────────────────┘

No database. No cache. Pure in-memory — results fetched live every search.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal })
  │
  ├── EventType.STREAMING_URL  → live iframe URL forwarded to client
  ├── EventType.PROGRESS       → status message forwarded to client
  └── EventType.COMPLETE
        └── RunStatus.COMPLETED → parse event.result → tutor profiles → SSE
```

## Supported Exams

SAT, ACT, GRE, GMAT, LSAT, MCAT, AP exams, IB, and more — configurable via the exam selector.

## Scraping Flow

1. User selects exam type and enters location
2. `/api/discover` calls TinyFish Search API to find relevant tutoring platforms for that exam + location (falls back to a curated list if Search is unavailable)
3. One TinyFish browser agent fires per discovered site — all in parallel
4. Each agent extracts up to 10 tutor profiles: name, rate, rating, subjects, availability, profile URL
5. `EventType.STREAMING_URL` events forward live iframe URLs to the client as agents start
6. `EventType.COMPLETE` + `RunStatus.COMPLETED` → parse `event.result` → stream profiles to client
7. UI updates as each site finishes — no waiting for the slowest one
8. Select tutors and compare side-by-side in the Compare Dashboard

## Setup

### Prerequisites

- Node.js 18+
- TinyFish API key

### Environment Variables

```bash
cp .env.example .env.local
```

Then fill in:

```env
# TinyFish Web Agent API key
# Get yours at: https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
tutor-finder/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Main UI
│   │   ├── globals.css
│   │   └── api/
│   │       ├── discover/route.ts       # POST — TinyFish Search → tutoring site URLs
│   │       └── scrape/route.ts         # POST — TinyFish Agent stream → tutor profiles
│   ├── components/
│   │   ├── ExamSelector.tsx            # Exam type picker
│   │   ├── LocationInput.tsx           # Location input
│   │   ├── AgentPreviewGrid.tsx        # Live agent iframe grid
│   │   ├── AgentPreviewCard.tsx        # Per-agent status + iframe
│   │   ├── TutorResultsGrid.tsx        # Tutor profile cards
│   │   ├── TutorCard.tsx               # Individual tutor card
│   │   ├── CompareButton.tsx           # Trigger comparison
│   │   ├── CompareDashboard.tsx        # Side-by-side comparison
│   │   ├── DiscoveringState.tsx        # Loading state while discovering
│   │   └── ui/                         # button, dialog, input, label,
│   │                                   # scroll-area, separator, sheet,
│   │                                   # skeleton, toast, toggle, tooltip
│   ├── hooks/
│   │   └── useTutorSearch.ts           # Search state + SSE client
│   ├── lib/
│   │   └── utils.ts
│   └── types/
│       └── tutor.ts                    # TypeScript definitions
├── .env.example
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Cache layer used? | NO (all results fetched live) |
| Scraping parallel? | YES (one agent per discovered site, all concurrent) |
| Live browser preview? | YES (`EventType.STREAMING_URL` → iframe per agent) |
| Fallback for discovery? | YES (hardcoded platform list if Search API unavailable) |
| Tutor comparison? | YES (select multiple, compare side-by-side) |

## Tech Stack

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **URL Discovery:** TinyFish Search API
- **Icons:** Lucide React
- **Deployment:** Vercel
