# Loan Decision Copilot
**Live Demo:** _add URL after deploy_

**Compare loan offerings from multiple banks in real time — TinyFish Search finds real bank pages, then parallel browser agents analyze rates, fees, and eligibility simultaneously.**

Select a loan type, enter your location, and the app uses the TinyFish Search API to discover official bank loan pages for your area. One browser agent fires per bank in parallel — each navigating the real page, extracting interest rates, fees, eligibility requirements, and scoring the offering 1–10. Results stream back as each agent finishes.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  LoanTypeSelector → LocationInput → AgentCard grid          │
│  BankDetailPanel (side panel) → LiveBrowserPreview          │
│  (results stream in as agents finish)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
                  ┌────────┴────────┐
                  ▼                 ▼
     POST /api/discover-banks   POST /api/analyze-loan
                  │                 │
                  ▼                 ▼
┌─────────────────────┐  ┌──────────────────────────────────┐
│ TinyFish Search API │  │        TinyFish SDK              │
│                     │  │                                  │
│ client.search.query │  │ client.agent.stream({ url, goal })│
│ Finds real official │  │                                  │
│ bank loan pages for │  │ EventType.STREAMING_URL          │
│ loan type + location│  │   → live iframe per agent        │
│                     │  │ EventType.PROGRESS               │
│ Filters out         │  │   → status updates               │
│ aggregator sites    │  │ EventType.COMPLETE               │
│ (NerdWallet, etc.)  │  │   + RunStatus.COMPLETED          │
│                     │  │   → loan analysis JSON → SSE     │
└─────────────────────┘  └──────────────────────────────────┘

No database. No cache. No Supabase. Pure in-memory — results fetched live.
```

### TinyFish SDK event flow

```
// Discovery — real URLs, not hallucinated ones
const results = await client.search.query({
  query: `${loanType} loan ${location} bank official site`
});
// aggregator domains filtered out before returning to client

// Analysis — one agent per bank, all in parallel
client.agent.stream({ url, goal })
  │
  ├── EventType.STREAMING_URL → live iframe URL forwarded to client
  ├── EventType.PROGRESS      → status message forwarded to client
  └── EventType.COMPLETE
        └── RunStatus.COMPLETED
              // COMPLETED only means the browser ran without crashing
              // — always validate result content, not just the status
              → parse event.result → loan analysis → SSE → client
```

## What Each Agent Extracts

Each agent navigates the bank's loan page and returns:

- **Interest rate range** (APR, fixed/variable)
- **Tenure options** (repayment period)
- **Eligibility requirements** (income, credit score, etc.)
- **Fees** (processing, origination, prepayment)
- **Benefits** and **drawbacks**
- **Clarity score** (Clear / Moderate / Unclear)
- **Overall score** (1–10 based on value, transparency, competitiveness)

## Loan Types

| Type | What it searches for |
|---|---|
| Personal | Personal loan pages from local banks and credit unions |
| Home | Mortgage and home loan product pages |
| Education | Student loan and education financing pages |
| Business | SME and business loan product pages |

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
# TinyFish Web Agent API key (server-side only)
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
loan-decision-copilot/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                      # Main UI
│   │   ├── globals.css
│   │   └── api/
│   │       ├── discover-banks/route.ts   # POST — TinyFish Search → bank URLs
│   │       └── analyze-loan/route.ts     # POST — TinyFish Agent stream → SSE
│   ├── components/
│   │   ├── LoanTypeSelector.tsx          # Loan type picker (personal/home/edu/biz)
│   │   ├── LocationInput.tsx             # Location input + search trigger
│   │   ├── AgentCard.tsx                 # Per-bank agent status + result card
│   │   ├── BankDetailPanel.tsx           # Full detail side panel
│   │   ├── SearchProgress.tsx            # Discovery + analysis progress bar
│   │   ├── LiveBrowserPreview.tsx        # Expandable live agent iframe
│   │   └── ui/                           # button, input, scroll-area, separator
│   ├── hooks/
│   │   └── useLoanSearch.ts              # Discovery + parallel agent SSE client
│   ├── lib/
│   │   └── utils.ts
│   └── types/
│       └── loan.ts                       # TypeScript definitions
├── .env.example
├── .gitignore
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory, Supabase fully removed) |
| Cache layer used? | NO (all results fetched live) |
| LLM hallucinating URLs? | NO (TinyFish Search finds real current pages) |
| Aggregator sites filtered? | YES (NerdWallet, Bankrate, etc. excluded) |
| Scraping parallel? | YES (`Promise.allSettled` across all discovered banks) |
| Live browser preview? | YES (`EventType.STREAMING_URL` → iframe per agent) |
| Result validation? | YES (COMPLETED ≠ goal achieved — content always validated) |

## Tech Stack

- **Framework:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Animations:** Framer Motion
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **URL Discovery:** TinyFish Search API (`client.search.query`)
- **Icons:** Lucide React
- **Deployment:** Vercel
