# SoleRadar

**Real-time sneaker prices and stock across every retailer in your region, instantly.**

SoleRadar lets you look up any sneaker and get live pricing, stock status, colorway availability, and purchase links — scraped in parallel from 7–9 region-specific retailers using TinyFish AI agents, all in real time.

**Live:** https://soleradar.vercel.app/

---

## What it does

Type in a sneaker name (e.g. `Jordan 1 Low`) and a region (e.g. `Singapore`) and SoleRadar will:

1. **Discover** the right retailers for your region — Novelship, StockX, GOAT, Nike, Adidas, and local market-specific stores
2. **Scrape** all sites concurrently using parallel TinyFish agents, streaming live agent status back in real time
3. **Score** every result by availability, price completeness, and link quality into a 1–10 quality score
4. **Display** a clean dashboard with prices, sizes, stock status, colorways, purchase links, and a side-by-side compare tool

---

## TinyFish API Usage

The app uses `@tiny-fish/sdk` to run one Agent per retailer in parallel with `browser_profile: 'stealth'` since sneaker sites have strong bot detection. Results stream back via SSE as each agent completes:

```typescript
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk'

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY })

const stream = await client.agent.stream(
  { url, goal, browser_profile: 'stealth' },
  {
    onStreamingUrl: (event) => {
      // forward live browser preview URL to frontend
    },
    onComplete: (event) => {
      if (event.status === RunStatus.COMPLETED) {
        // event.result contains extracted sneaker listings JSON
      }
    },
  }
)

for await (const event of stream) {
  if (event.type === EventType.COMPLETE) break
}
```

---

## Architecture

```
User Input (sneaker + size + colorway + region + currency)
        │
        ▼
┌─────────────────────────────────────┐
│         /api/find-sites             │
│  Looks up curated retailer list     │
│  for the selected region:           │
│  - Brand-aware sorting              │
│    (Nike stores first for Jordans,  │
│     Adidas first for Yeezys)        │
│  - Returns top 9 retailer URLs      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│          /api/search                │
│  @tiny-fish/sdk — one agent per     │
│  retailer, all running in parallel  │
│                                     │
│  ┌─────────────┐ ┌───────────────┐  │
│  │   StockX    │ │   Novelship   │  │
│  └─────────────┘ └───────────────┘  │
│  ┌─────────────┐ ┌───────────────┐  │
│  │   Nike SG   │ │  Foot Locker  │  │
│  └─────────────┘ └───────────────┘  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         Client-side scoring         │
│  Quality score computed per result  │
│  → structured SneakerDrop[] cards   │
└──────────────┬──────────────────────┘
               │
               ▼
        Next.js Frontend
   (price, stock, size, colorway,
    quality score, compare dashboard)
```

---

## How to run locally

**1. Install dependencies**
```bash
cd soleradar
npm install
```

**2. Set up environment variables**

Create a `.env.local` file:
```
TINYFISH_API_KEY=your_tinyfish_key_here
```

Get a key at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)

**3. Run the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to use

1. Enter a **sneaker name** — e.g. `Jordan 1 Low`, `Yeezy 350 V2`, `New Balance 550`
2. Enter a **size** (optional) — e.g. `US 10`, `UK 9`
3. Enter a **colorway** (optional) — e.g. `University Blue`, `Bred`
4. Select a **region** and **currency**
5. Click **Lock on Target**
6. Watch the agents run live across all retailers, then browse your results

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Web scraping | TinyFish Agent API (`@tiny-fish/sdk`) |
| Streaming | Server-Sent Events (SSE) |
| Styling | Inline CSS with CSS variables |
| Deployment | Vercel |

---

## Supported Regions

| Region | Key Retailers |
|---|---|
| 🇸🇬 Singapore | Novelship, KicksCrew, SOLE WHAT, StockX, Nike SG, Adidas SG |
| 🇺🇸 United States | StockX, GOAT, Flight Club, Nike US, Foot Locker, Stadium Goods |
| 🇬🇧 United Kingdom | END. Clothing, JD Sports, KLEKT, Nike UK, Adidas UK, Size? |
| 🇯🇵 Japan | Atmos, Snkrdunk, Zozotown, Rakuten, Mita Sneakers, Nike JP |
| 🇦🇺 Australia | Culture Kings, Stylerunner, GOAT, StockX, Foot Locker AU |
| 🇩🇪 Germany | Solebox, Asphaltgold, Snipes, KLEKT, Nike DE, Adidas DE |
| 🇨🇦 Canada | GOAT, StockX, Haven, Bodega, Livestock, Nike CA |
| 🇫🇷 France | Courir, Footdistrict, KLEKT, Zalando FR, Nike FR |
| 🇮🇳 India | Superkicks, VegNonVeg, Mainstreet Marketplace, Nike IN |

---

## Environment Variables

| Variable | Description |
|---|---|
| `TINYFISH_API_KEY` | TinyFish API key — get one at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |
