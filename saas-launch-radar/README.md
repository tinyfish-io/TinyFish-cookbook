# 🚀 SaaS Launch Radar

An autonomous web scouting and pricing intelligence dashboard that discovers newly launched SaaS products in any market niche, deploys parallel browser agents to audit their landing pages, and compiles structured pricing matrices, core features, and target audiences.

---

## What this app does (and where TinyFish is used)

1. **SaaS Discovery (TinyFish Search API):** The app accepts a market niche (e.g., "Developer Tools", "AI Copilots") and executes multi-angle queries utilizing `client.search.query` across Product Hunt, Hacker News, and search indexes. It automatically filters out social feeds and deduplicates urls.
2. **Scouting & Auditing (TinyFish Agent stream):** For each discovered candidate, a dedicated, parallel **TinyFish Browser Agent** (`client.agent.stream`) is deployed. The agent navigates directly to the target product landing page, bypasses cookie overlays, and extracts structured JSON containing the tagline, detailed overview, core feature list, target audience, and every pricing tier mapped to price tags and capabilities.
3. **TinyFish Signature Interface:** Displays the results in a premium, light-stone themed dashboard that strictly matches the official **TinyFish Brand Design System** (utilizing the brand orange `#FF6700` accents, sharp `border-radius: 3px` buttons, soft page shadows, and custom teal halftone dotted backgrounds). Features a side-by-side split screen where active crawler progress maps are streamed live in a terminal window next to active controls.

---

## 🌟 Key Highlights & Design Alignment

* **Official Brand Style Matching:** Direct adherence to TinyFish design guidelines—using `#fafaf9` backgrounds, `#FF6700` primary buttons, clean `#0a0a0a` typography, and the dotted visual backdrops to match their live site experience.
* **Real-time Agent Telemetry Stream:** Harnesses Next.js Server-Sent Events (SSE) to stream active scraping updates (`client.agent.stream`) directly into the retro console element, allowing users to watch the agent navigate, bypass popups, and audit pricing models live.
* **Production-Ready & Fully Pruned:** Zero boilerplates. All unused generated Next.js SVG elements, boilerplate pages, and unused dependencies have been completely removed to keep the directory lightweight and performant.

---

## Code Snippet (Calling the TinyFish SDK)

### 1. Discovering Candidates (Search API)
```typescript
import { TinyFish } from "@tiny-fish/sdk";

const client = new TinyFish({ apiKey });

// Multi-angle searches to capture Product Hunt and Hacker News Show cases
const queries = [
  `site:producthunt.com "${niche}" 2026`,
  `site:news.ycombinator.com "Show HN" "${niche}" 2026`,
  `"${niche}" SaaS product launch 2026`
];

const results = await Promise.all(
  queries.map(q => client.search.query({ query: q }).catch(() => ({ results: [] })))
);
```

### 2. Extracting Page Pricing & Features (Agent Stream API)
```typescript
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

const client = new TinyFish({ apiKey });
const goal = `Analyze the page at ${url} to extract:
1. ProductName (string)
2. Tagline (string)
3. Description (string)
4. KeyFeatures (array of strings)
5. TargetAudience (array of strings)
6. PricingModels (array of objects with 'tier', 'price', and 'features' array)

Return a clean JSON object containing these 6 keys.`;

const agentStream = await client.agent.stream({ url, goal });

for await (const event of agentStream) {
  if (event.type === EventType.PROGRESS) {
    // Stream live browser event to the frontend
    send({ type: "PROGRESS", purpose: event.purpose });
  } else if (event.type === EventType.COMPLETE && event.status === RunStatus.COMPLETED) {
    send({ type: "COMPLETE", status: "COMPLETED", result: event.result });
  }
}
```

---

## Architecture Diagram

```
                 ┌────────────────────────────────┐
                 │       SaaS Launch Radar        │
                 │   Next.js React Client (App)   │
                 └──────────────┬───▲─────────────┘
          1. POST /discover     │   │  4. Stream Events (SSE)
                                ▼   │
                 ┌──────────────────┴─────────────┐
                 │        Server API Routes       │
                 │       (api/discover, api/scrape)│
                 └──────────────┬───▲─────────────┘
            2. Search Queries   │   │  3. Stream Agent telemetries
                                ▼   │
                 ┌──────────────────┴─────────────┐
                 │         TinyFish Cloud         │
                 │   Search Engine & Web Agent    │
                 └────────────────────────────────┘
```

---

## How to Run

### 1. Prerequisites
Get your free API key at [agent.tinyfish.ai](https://agent.tinyfish.ai/). No credit card is required.

### 2. Configure Environment
Copy `.env.example` to `.env` inside the `saas-launch-radar` directory:
```bash
cp .env.example .env
```
Fill in your API key:
```env
TINYFISH_API_KEY=tf_abc123...
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Boot Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view your SaaS Launch Radar dashboard!
