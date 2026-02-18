# CostLens — Reverse-Engineer the True Cost of Any SaaS

**Live Demo:** [https://naked-saa-s-tiny-fish.vercel.app](https://naked-saa-s-tiny-fish.vercel.app)

CostLens is an open-source intelligence tool that reverse-engineers the real cost behind any SaaS product across **five pillars**: Infrastructure, Build, Buyer, Risk, and Competitors. It uses the **TinyFish Web Agent** to autonomously crawl live websites and extract structured data — pricing pages, tech stacks, security headers, and competitor landscapes — then synthesizes everything with OpenAI GPT-4o into actionable reports with confidence scores.

---

## Demo

*Demo video coming soon*

---

## TinyFish API Usage

CostLens launches **5 parallel TinyFish async runs** — one per pillar — to scrape structured data from live websites. Each run receives a natural-language goal and returns JSON.

### Code Snippet

```javascript
import { TinyFishWebAgentClient } from "./tinyfish/tinyfish-web-agent-client.js";

const tinyfish = new TinyFishWebAgentClient({
  endpoint: "https://agent.tinyfish.ai",
  apiKey: process.env.TINYFISH_API_KEY,
  browserProfile: "stealth",
});

// Launch 5 parallel async runs — one per pillar
const [infraRun, buildRun, buyerRun, riskRun, competitorsRun] =
  await Promise.allSettled([
    tinyfish.runAsync({
      url: targetUrl,
      goal: "Analyze the site and infer infrastructure + traffic signals. Return strict JSON...",
    }),
    tinyfish.runAsync({
      url: targetUrl,
      goal: "Analyze the product site and return detected build-relevant features. Return strict JSON...",
    }),
    tinyfish.runAsync({
      url: targetUrl,
      goal: "Find and extract pricing page details including plan cards. Return strict JSON...",
    }),
    tinyfish.runAsync({
      url: targetUrl,
      goal: "Analyze the site for security and compliance signals. Return strict JSON...",
    }),
    tinyfish.runAsync({
      url: targetUrl,
      goal: "Find top 3-5 competitors or alternatives. Return strict JSON...",
    }),
  ]);

// Poll for results
const result = await tinyfish.getRun(infraRun.value.run_id);
// result.status === "COMPLETED" → result.result contains structured JSON
```

---

## How to Run

### Prerequisites

- **Node.js 22+**
- **TinyFish API Key** — get one at [tinyfish.ai](https://tinyfish.ai)
- **OpenAI API Key** — get one at [platform.openai.com](https://platform.openai.com)

### Setup

1. Clone the repository and navigate to the project:

```bash
git clone https://github.com/tinyfish-io/TinyFish-cookbook
cd TinyFish-cookbook/costlens
```

2. Install dependencies:

```bash
npm install
```

3. Create a `.env` file from the example:

```bash
cp .env.example .env
```

4. Fill in your API keys in `.env`:

```
TINYFISH_API_KEY=your_tinyfish_api_key
OPENAI_API_KEY=your_openai_api_key
```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

| Variable | Required | Description |
|---|---|---|
| `TINYFISH_API_KEY` | Yes | TinyFish Web Agent API key |
| `OPENAI_API_KEY` | Yes | OpenAI API key (GPT-4o) |
| `PORT` | No | Server port (default: 3000, auto-fallback on conflict) |
| `CORS_ORIGIN` | No | Comma-separated allowed origins |
| `TINYFISH_BROWSER_PROFILE` | No | Browser profile: `stealth` (default) |
| `TINYFISH_PROXY_ENABLED` | No | Enable geo-proxy (`false` default) |
| `OPENAI_MODEL` | No | Model override (default: `gpt-4o`) |

---

## Architecture Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (React + Vite)"]
        Landing[Landing Page]
        Tabs["5-Tab Dashboard"]
        Infra[Infra View]
        Build[Build View]
        Buyer[Buyer View]
        Risk[Risk View]
        Competitors[Competitor Radar]
        Summary[Executive Summary]
        Playbook[Negotiation Playbook]
        Export[Export / History]
    end

    subgraph Backend["Backend (Express.js)"]
        API["/api/investigate/*"]
        Modeler["Cost Modeler (OpenAI GPT-4o)"]
        Quality["Quality & Trust Engine"]
    end

    subgraph TinyFish["TinyFish Web Agent"]
        R1["Run 1: Infra Scan"]
        R2["Run 2: Build Scan"]
        R3["Run 3: Buyer Scan"]
        R4["Run 4: Risk Scan"]
        R5["Run 5: Competitor Scan"]
    end

    subgraph Targets["Crawled Sources"]
        T1["Target Website"]
        T2["Pricing Pages"]
        T3["Security Headers"]
        T4["G2 / Capterra"]
    end

    Landing -->|"Enter SaaS URL"| API
    API -->|"5 parallel async runs"| TinyFish
    R1 --> T1
    R2 --> T1
    R3 --> T2
    R4 --> T3
    R5 --> T4
    TinyFish -->|"Structured JSON"| API
    API --> Modeler
    Modeler -->|"Synthesized report"| Quality
    Quality -->|"Scored results"| Tabs
    Tabs --> Infra
    Tabs --> Build
    Tabs --> Buyer
    Tabs --> Risk
    Tabs --> Competitors
    Modeler --> Summary
    Modeler --> Playbook
```

### Scan Flow

```mermaid
sequenceDiagram
    participant U as User
    participant FE as Frontend
    participant BE as Backend
    participant TF as TinyFish Agent
    participant AI as OpenAI GPT-4o

    U->>FE: Enter SaaS URL
    FE->>BE: POST /api/investigate/async
    BE->>TF: Launch 5 parallel async runs
    TF-->>BE: Return run IDs

    loop Poll every 3s
        FE->>BE: POST /api/investigate/async/poll
        BE->>TF: getRun(runId) × 5
        TF-->>BE: Status + partial results
        BE-->>FE: Progress update
    end

    BE->>AI: Synthesize infra/build/buyer costs
    BE->>AI: Generate Executive Summary
    BE->>AI: Generate Negotiation Playbook
    BE->>AI: Analyze Risk Profile
    BE->>AI: Analyze Competitor Landscape
    AI-->>BE: Structured analysis
    BE->>BE: Build quality scores & provenance
    BE-->>FE: Complete report with confidence scores
    FE-->>U: Interactive 5-pillar dashboard
```
