# ★ awesome.dev — Aggregator

> Aggregate GitHub Awesome-* lists in parallel using TinyFish AI agents

**Live:** https://awesomeaggregator.vercel.app/

---

## What it does

Enter a topic (e.g. `machine-learning`, `react`, `rust`) and TinyFish agents scrape 5–10 GitHub Awesome repos **simultaneously**, returning a unified, deduplicated, searchable resource directory.

### Features

- **Parallel TinyFish agents** — one per repo, running at the same time
- **Directory-style UI** — categories → subcategories → resources
- **Results stream in** as each agent completes
- **Quality scoring** (1–10) based on repo stars + description richness
- **Deduplication** across repos
- **Sort** by quality, stars, or A–Z
- **Filter** resources inline
- **Compare** up to 5 resources side-by-side
- **Export** to JSON or CSV

---

## TinyFish API Usage

The app uses `@tiny-fish/sdk` to run one Agent per Awesome repo in parallel. Each agent navigates the GitHub README and extracts structured resource data. The Next.js API route acts as a server-side proxy so the API key never reaches the browser:

```typescript
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk'

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY })

const stream = await client.agent.stream(
  { url, goal },
  {
    onStreamingUrl: (event) => {
      // forward live browser preview URL to frontend
    },
    onComplete: (event) => {
      if (event.status === RunStatus.COMPLETED) {
        // event.result contains extracted resources JSON
      }
    },
  }
)

for await (const event of stream) {
  if (event.type === EventType.COMPLETE) break
}
```

Results are streamed back to the browser via SSE as each agent finishes — the UI updates in real time without waiting for the slowest repo.

---

## Setup

### 1. Install dependencies

```bash
cd awesome-aggregator
npm install
```

### 2. Add your TinyFish API key

```bash
cp .env.example .env.local
# Edit .env.local:
# TINYFISH_API_KEY=your_key_here
```

Get a key at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)

### 3. Run locally

```bash
npm run dev
# Open http://localhost:3000
```

---

## Deploy to Vercel

```bash
npm i -g vercel
vercel
# Add TINYFISH_API_KEY as an environment variable in the Vercel dashboard
```

---

## Architecture

```
User Input (topic)
  ↓
Next.js Frontend (React)
  ↓
/api/tinyfish (Next.js API Route — server-side proxy)
  ↓
@tiny-fish/sdk — client.agent.stream() × N repos in parallel
  ↓
GitHub Awesome-* READMEs
  ↓
Parsed JSON → Unified Directory UI
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `TINYFISH_API_KEY` | Your TinyFish API key — get one at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Web scraping | TinyFish Agent API (`@tiny-fish/sdk`) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Hosting | Vercel |
