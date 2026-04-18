# Competitive pricing intelligence (TinyFish cookbook)

**Package:** `competitor-analysis` (see `package.json`)

**Live demo:** https://competitor-priceanalysis.vercel.app/

A competitive pricing intelligence app for tracking many competitors at once. It follows **Source → Extract → Present**: OpenRouter helps discover pricing URLs, **Tinyfish Agent** (via `@tiny-fish/sdk`) scrapes and extracts structured JSON from pricing pages in parallel, and OpenRouter analyzes the results for the dashboard.

**Status:** Working

---

## Stack

| Piece | Role |
|-------|------|
| Next.js 16 (App Router) | UI and API routes |
| `@tiny-fish/sdk` | Tinyfish Agent streaming runs (`client.agent.stream`) in `/api/scrape-pricing` |
| OpenRouter | URL hints, pricing analysis (`/api/generate-urls`, `/api/analyze-pricing`) |
| React 19, Tailwind, shadcn/ui | Frontend |

---

## How Tinyfish Agent is wired

Scraping is implemented in `app/api/scrape-pricing/route.ts`: for each competitor URL it calls `new TinyFish({ apiKey }).agent.stream({ url, goal, browser_profile: 'lite' })`, forwards step and `streamingUrl` events to the browser over SSE, and on `COMPLETE` maps `resultJson` into the app’s `CompetitorPricing` schema. Environment variable: `TINYFISH_API_KEY`.

---

## Demo

*[Demo video/screenshot to be added]*

---

## Quick start

```bash
npm install
export TINYFISH_API_KEY=your_key
export OPENROUTER_API_KEY=your_key
npm run dev
```

Or use a `.env.local` file (see `.env.local.example`).

---

## How to Run

### Prerequisites

- Node.js 18+
- Tinyfish API key (set `TINYFISH_API_KEY`)

### Setup

1. Clone the repository:
```bash
git clone https://github.com/tinyfish-io/TinyFish-cookbook
cd TinyFish-cookbook/competitor-analysis
```

2. Install dependencies:
```bash
npm install
```

3. Create `.env.local` file:
```bash
TINYFISH_API_KEY=xxx          # Browser automation
OPENROUTER_API_KEY=xxx    # AI URL generation + pricing analysis
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

---

## Architecture Diagram

```mermaid
flowchart TB
    subgraph Input[USER INPUT]
        Step1[Step 1: Baseline Pricing]
        Step2[Step 2: Competitor List + Detail Level]
    end
    subgraph Phase1[PHASE 1: URL GENERATION]
        AI1[OpenRouter AI]
        URLs[Generated Pricing URLs]
    end
    subgraph Phase2[PHASE 2: PARALLEL SCRAPING]
        A1[Agent 1]
        A2[Agent 2]
        A3[Agent 3]
        A15[Agent 15...]
    end
    subgraph Phase3[PHASE 3: AI ANALYSIS]
        AI2[OpenRouter AI]
        Analysis[Strategic Insights]
    end
    subgraph Output[RESULTS]
        Dashboard[4-Tab Dashboard]
        Export[CSV/JSON Export]
    end
    Step1 --> Step2
    Step2 --> AI1
    AI1 --> URLs
    URLs --> A1
    URLs --> A2
    URLs --> A3
    URLs --> A15
    A1 --> AI2
    A2 --> AI2
    A3 --> AI2
    A15 --> AI2
    AI2 --> Analysis
    Analysis --> Dashboard
    Dashboard --> Export
    A1 -.-> Dashboard
    A2 -.-> Dashboard
    A3 -.-> Dashboard
    A15 -.-> Dashboard
```

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant Ctx as PricingContext
    participant API1 as /api/generate-urls
    participant API2 as /api/scrape-pricing
    participant API3 as /api/analyze-pricing
    participant AI as OpenRouter AI
    participant M as Tinyfish Agent Runs
    U->>FE: Enter baseline pricing
    FE->>Ctx: Store baseline
    U->>FE: Add 10-15 competitors
    FE->>Ctx: Store competitors
    FE->>API1: Generate missing URLs
    API1->>AI: Generate pricing URLs
    AI-->>API1: URLs with confidence
    API1-->>FE: Enriched competitors
    U->>FE: Start scraping
    FE->>API2: POST /api/scrape-pricing
    API2->>M: Launch parallel agents
    M-->>API2: Stream live URLs
    API2-->>FE: Forward streaming URLs
    FE-->>U: Show live competitor grid
    M-->>API2: Extract pricing data
    API2-->>FE: Stream results
    FE-->>U: Update dashboard
    API2->>API3: Trigger analysis
    API3->>AI: Analyze pricing structures
    AI-->>API3: Insights + recommendations
    API3-->>FE: Analysis complete
    FE-->>U: Display insights
```

```mermaid
classDiagram
    class BaselinePricing {
        +string companyName
        +string pricingModel
        +string unitType
        +number pricePerUnit
        +string currency
    }
    class Competitor {
        +string id
        +string name
        +string url
        +string generatedUrl
        +string urlConfidence
    }
    class CompetitorPricing {
        +string company
        +string url
        +string pricingModel
        +string primaryUnit
        +string unitDefinition
        +PricingTier[] tiers
        +string additionalNotes
        +datetime scrapedAt
    }
    class PricingTier {
        +string name
        +number price
        +string billingPeriod
        +string unit
        +string includedUnits
        +string overagePrice
    }
    class Analysis {
        +string[] insights
        +string[] recommendations
        +Record pricingModelBreakdown
        +Record normalizedPrices
        +number yourPosition
    }
    class ScrapingStatus {
        +string status
        +string streamingUrl
        +string[] steps
        +CompetitorPricing data
        +string error
    }
```


