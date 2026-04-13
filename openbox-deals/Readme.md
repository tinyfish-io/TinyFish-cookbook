# OpenBox Deals

A real-time open-box and refurbished product deal finder. Search once and get parallel results from 8 major retailers simultaneously — Amazon Warehouse, Best Buy Outlet, Newegg, BackMarket, Swappa, Walmart Renewed, Target Clearance, and Micro Center. Results stream in live as each agent finishes.

## Demo

> Add your demo video or screenshot here

## TinyFish API Usage

The app uses the TinyFish Agent API to dispatch one agent per retailer in parallel. Each agent navigates to the retailer's search page, extracts open-box/refurbished product listings, and streams results back as it completes — so you see results from faster sites immediately without waiting for slower ones.

```typescript
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });

const stream = await client.agent.stream(
  {
    url: searchUrl,
    goal,
    browser_profile: "stealth", // stealth for anti-bot protected sites
    proxy_config: { enabled: true, country_code: "US" }, // for geo-restricted sites
  },
  {
    onStreamingUrl: (event) => {
      // live browser preview URL
    },
    onComplete: (event) => {
      if (event.status === RunStatus.COMPLETED) {
        // event.result contains the extracted product listings
      }
    },
  }
);

for await (const event of stream) {
  if (event.type === EventType.COMPLETE) break;
}
```

Results from each agent are emitted immediately via SSE as each one finishes — the frontend doesn't wait for all 8 agents to complete before showing results.

## Supported Retailers

| Retailer | Type | Browser Profile |
|---|---|---|
| Amazon Warehouse | Renewed / Used / Refurbished | Stealth + US Proxy |
| Best Buy Outlet | Open-Box | Stealth |
| Newegg | Open Box | Lite |
| BackMarket | Refurbished | Lite |
| Swappa | Used listings | Stealth |
| Walmart | Renewed / Refurbished | Stealth |
| Target | Clearance | Lite |
| Micro Center | Open Box | Lite |

## How to Run

### Prerequisites

- Node.js 18+
- A TinyFish API key ([get one here](https://agent.tinyfish.ai/api-keys))

### Setup

1. Install dependencies:

```bash
cd openbox-deals
npm install
```

2. Create a `.env.local` file:

```
TINYFISH_API_KEY=your_tinyfish_api_key_here
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
Browser (Static HTML + Vanilla JS)
    ↓ GET /api/search/live?q={query}&max_price={price}
Next.js API Route (/api/search/live)
    ↓ client.agent.stream() × 8 retailers in parallel
TinyFish Agent API
    ↓ navigates each retailer's search page
Amazon / Best Buy / Newegg / BackMarket / Swappa / Walmart / Target / Micro Center
```

SSE events flow back to the browser as each agent completes:

- `search_start` — search initiated, lists all sites
- `session_status` — agent connecting to a site
- `session_start` — agent live, includes streaming preview URL
- `session_result` — agent done, includes extracted products
- `session_error` — agent failed for this site
- `complete` — all agents finished

## Adding a New Retailer

Add an entry to `src/lib/sites.ts`:

```typescript
export const SITES: Record<string, SiteConfig> = {
  // ...existing sites
  yoursite: {
    name: "Your Site Name",
    searchUrl: "https://yoursite.com/search?q={query}",
    goal: "Extract the first 5 open-box '{query}' products. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}].",
    browserProfile: "lite", // or "stealth" for anti-bot protected sites
  },
};
```

No other changes needed — the agent runner picks it up automatically.
