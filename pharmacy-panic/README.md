# Pharmacy Panic

Compare medicine prices across Vietnam's top pharmacy chains in real time.

## What It Does

Search for any medicine or health product and watch parallel TinyFish browser agents scrape Long Châu, Pharmacity, An Khang, Guardian, and Medicare simultaneously — streaming results back as each pharmacy finishes. Prices are normalized from VND and compared side-by-side so you can spot the cheapest option instantly.

## Architecture

```
Browser (Client)
  │
  └─ POST /api/search  (SSE — results stream as agents finish)
        │
        ├─ client.agent.stream({ url: longchau/search?key=... })
        ├─ client.agent.stream({ url: pharmacity/search?q=... })
        ├─ client.agent.stream({ url: ankhang/tim-kiem?keyword=... })
        ├─ client.agent.stream({ url: guardian/catalogsearch/... })
        └─ client.agent.stream({ url: medicare/products?keyword=... })
              │  Promise.allSettled — all 5 run in parallel
              │
              ▼
        Results stream back as each pharmacy completes
        normalize.ts — price parsing, dosage form mapping, stock status
```

## SDK Event Flow

```typescript
const stream = await client.agent.stream({ url, goal });

for await (const event of stream) {
  if (event.type === EventType.STREAMING_URL) {
    // Live browser preview available — show iframe
  }
  if (event.type === EventType.COMPLETE) {
    if (event.status === RunStatus.COMPLETED) {
      // COMPLETED only means the browser ran without crashing
      // — always validate result content, not just the status
      const result = normalizePharmacyResult(event.result);
    }
    break;
  }
}
```

## Pharmacy Coverage

| Chain | URL | Speciality |
|-------|-----|------------|
| Long Châu | nhathuoclongchau.com.vn | Largest chain, best prescription coverage |
| Pharmacity | pharmacity.vn | Urban focus, good generic range |
| An Khang | nhathuocankhang.com | Mid-range, strong VN brands |
| Guardian | guardian.com.vn | Health & beauty, international brands |
| Medicare | medicare.vn | Specialist and OTC focus |

## Setup

```bash
git clone https://github.com/your-org/tinyfish-cookbook
cd pharmacy-panic
npm install
cp .env.example .env.local
```

Edit `.env.local`:

```
TINYFISH_API_KEY=your_key_here
```

```bash
npm run dev
# Open http://localhost:3000
```

## Project Structure

```
pharmacy-panic/
├── src/
│   ├── app/
│   │   ├── api/search/route.ts   # SSE route — parallel TinyFish agents
│   │   ├── layout.tsx
│   │   └── page.tsx              # Search UI + live previews
│   ├── components/
│   │   ├── live-preview-grid.tsx # Agent browser iframes
│   │   ├── pharmacy-badge.tsx
│   │   ├── pharmacy-group.tsx
│   │   ├── product-card.tsx      # Price card with VND formatting
│   │   ├── results-grid.tsx
│   │   ├── savings-banner.tsx    # Best deal highlight
│   │   └── ui/                  # button, badge, card, skeleton
│   ├── hooks/
│   │   └── use-pharmacy-search.ts
│   └── lib/
│       ├── env.ts                # API key guard
│       ├── normalize.ts          # VND parsing, dosage form mapping
│       ├── types.ts
│       └── utils.ts
├── .env.example
└── README.md
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| TinyFish SDK used (not raw fetch) | YES — `client.agent.stream` |
| Parallel agents | YES — `Promise.allSettled` across 5 pharmacies |
| Result content validated | YES — `isEmptyResult` check after COMPLETED |
| External database or cache | NO (pure in-memory) |
| Supabase / Redis | NO |
| API key exposed to browser | NO (`TINYFISH_API_KEY` server-side only) |

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Agent API | TinyFish SDK — `client.agent.stream` |
| Streaming | Server-Sent Events (ReadableStream) |
| UI | React 19, Tailwind CSS 4, Radix UI |
| Normalization | Custom VND parser, dosage form mapper |
