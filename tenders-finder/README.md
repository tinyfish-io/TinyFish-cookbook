# Tenders Finder
**Live Demo:** _add URL after deploy_

**Singapore government tender tracker — parallel TinyFish browser agents scrape multiple tender portals simultaneously and stream results in real time.**

Select a sector and the app fires one TinyFish browser agent per tender portal in parallel. Each agent extracts upcoming tenders with deadlines after today's date, streams results back as it completes. Compare tenders side-by-side before deciding which to pursue.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  SectorSelector → LinkConfigPage → TenderResultsList        │
│  AgentPreviewGrid (live iframes) → CompareModal             │
│  (results stream in as agents finish)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
          GET /api/discover-links   POST /api/scrape
                  │                 │
                  ▼                 ▼
┌─────────────────────┐  ┌──────────────────────────────────┐
│ Returns curated     │  │        TinyFish SDK              │
│ list of Singapore   │  │                                  │
│ tender portals      │  │ client.agent.stream({ url, goal })│
│                     │  │                                  │
│ GeBIZ, Tenders On   │  │ EventType.STARTED                │
│ Time, Bid Detail,   │  │   → agent confirmed              │
│ Tenders Info,       │  │ EventType.STREAMING_URL          │
│ Global Tenders,     │  │   → live iframe per agent        │
│ Tender Board        │  │ EventType.PROGRESS               │
│                     │  │   → status updates               │
│ User can add custom │  │ EventType.COMPLETE               │
│ URLs via config page│  │   + RunStatus.COMPLETED          │
│                     │  │   → tender details → SSE         │
└─────────────────────┘  └──────────────────────────────────┘

No database. No cache. Pure in-memory — results fetched live every search.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal })
  │
  ├── EventType.STARTED       → agent confirmed running
  ├── EventType.STREAMING_URL → live iframe URL forwarded to client
  ├── EventType.PROGRESS      → status message forwarded to client
  └── EventType.COMPLETE
        └── RunStatus.COMPLETED → parse event.result.tenderdetails[]
                                  → tender cards → SSE → client
```

## Covered Portals

| Portal | URL |
|---|---|
| GeBIZ | gebiz.gov.sg |
| GeBIZ Opportunities | gebiz.gov.sg/ptn/opportunity |
| Tenders On Time | tendersontime.com |
| Bid Detail | biddetail.com |
| Tenders Info | tendersinfo.com |
| Global Tenders | globaltenders.com |
| Tender Board | tenderboard.biz |

Users can also add custom tender portal URLs via the Link Config page.

## Scraping Flow

1. User selects a sector (IT, Construction, Healthcare, etc.)
2. `/api/discover-links` returns the list of curated tender portal URLs
3. User can customise the list on the Link Config page before searching
4. One TinyFish browser agent fires per portal — all in parallel
5. Each agent extracts only tenders with submission deadlines **after today's date**
6. `EventType.STREAMING_URL` events forward live iframe URLs to the client as agents start
7. `EventType.COMPLETE` + `RunStatus.COMPLETED` → parse `event.result.tenderdetails` → stream to client
8. UI updates as each portal finishes — no waiting for the slowest one
9. Select tenders and compare side-by-side in the Compare Modal

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
# TinyFish (required) — https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=

# Groq (optional) — https://console.groq.com
GROQ_API_KEY=
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
tenders-finder/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                        # Main UI
│   │   ├── globals.css
│   │   └── api/
│   │       ├── discover-links/route.ts     # GET — returns curated portal list
│   │       └── scrape/route.ts             # POST — TinyFish agent stream per portal
│   ├── components/
│   │   ├── tender/
│   │   │   ├── SectorSelector.tsx          # Sector picker
│   │   │   ├── SectorIcon.tsx              # Sector icons
│   │   │   ├── LinkConfigPage.tsx          # Custom URL configuration
│   │   │   ├── AgentPreviewGrid.tsx        # Live agent iframe grid
│   │   │   ├── AgentPreviewCard.tsx        # Per-agent status + iframe
│   │   │   ├── TenderResultsList.tsx       # Tender result cards list
│   │   │   ├── TenderResultCard.tsx        # Individual tender card
│   │   │   ├── CompareButton.tsx           # Trigger comparison
│   │   │   ├── CompareModal.tsx            # Side-by-side comparison
│   │   │   ├── LiveBrowserModal.tsx        # Full-screen agent browser view
│   │   │   └── Header.tsx
│   │   └── ui/                             # shadcn/ui components
│   ├── hooks/
│   │   └── useTenderSearch.ts              # Search state + SSE client
│   ├── lib/
│   │   └── utils.ts
│   └── types/
│       └── tender.ts                       # TypeScript definitions
├── .env.example
├── .gitignore
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Cache layer used? | NO (all results fetched live) |
| Scraping parallel? | YES (one agent per portal, all concurrent) |
| Live browser preview? | YES (`EventType.STREAMING_URL` → iframe per agent) |
| Deadline filtering? | YES (only tenders with future deadlines extracted) |
| Custom portal URLs? | YES (user-configurable via Link Config page) |
| Tender comparison? | YES (select multiple, compare side-by-side) |

## Tech Stack

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **Icons:** Lucide React
- **Deployment:** Vercel
