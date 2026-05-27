# ModuleMapper

**Real student reviews for any university course, instantly.**

ModuleMapper lets you look up any course at any university and get a structured, AI-synthesised verdict based on live student reviews scraped from Reddit, RateMyProfessors, university course platforms, and student blogs — all in real time.

**Live:** https://modulemapper-ten.vercel.app/

---

## What it does

Type in a course code (e.g. `BT1101`) and a university (e.g. `NUS`) and ModuleMapper will:

1. **Discover** the right sources for that university in real-time — subreddits, course review platforms like NUSMods or Bruinwalk, the official course catalog page
2. **Scrape** all sources concurrently using parallel TinyFish agents, streaming live progress back to you as it runs
3. **Synthesise** everything with Groq into a structured verdict
4. **Display** a clean dashboard with score, difficulty, workload, student quotes, exam tips, grading patterns, and more

---

## TinyFish API Usage

The app uses `@tiny-fish/sdk` to run one Agent per source in parallel with `browser_profile: 'stealth'`. Sources include Reddit, RateMyProfessors, university course platforms, and student blogs. Each agent extracts structured JSON from its source and streams the result back:

```typescript
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk'

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY })

const stream = await client.agent.stream(
  { url: agent.url, goal: agent.goal, browser_profile: 'stealth' },
  {
    onComplete: (event) => {
      if (event.status === RunStatus.COMPLETED) {
        // event.result contains extracted reviews JSON
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
User Input (course code + university)
        │
        ▼
┌─────────────────────────────────────┐
│         /api/discover               │
│  Groq LLM figures out in real-time: │
│  - Which subreddits to search       │
│  - Course platform URL (NUSMods,    │
│    Bruinwalk, Carta, etc.)          │
│  - Official course catalog URL      │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│          /api/scrape                │
│  @tiny-fish/sdk — one agent per     │
│  source, all running in parallel:   │
│                                     │
│  ┌─────────────┐ ┌───────────────┐  │
│  │ RateMyProf  │ │  r/nus        │  │
│  └─────────────┘ └───────────────┘  │
│  ┌─────────────┐ ┌───────────────┐  │
│  │  NUSMods    │ │ Student blogs │  │
│  └─────────────┘ └───────────────┘  │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│         /api/synthesise             │
│  Groq LLM analyses all raw data     │
│  → structured JSON verdict          │
└──────────────┬──────────────────────┘
               │
               ▼
        Next.js Frontend
     (score, reviews, tags,
      difficulty, workload…)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript |
| Web scraping | TinyFish Agent API (`@tiny-fish/sdk`) |
| LLM (discover + synthesise) | Groq — `llama-3.3-70b-versatile` |
| Streaming | Server-Sent Events (SSE) |
| Styling | Inline CSS with CSS variables |
| Deployment | Vercel |

---

## How to run locally

**1. Install dependencies**
```bash
cd modulemapper
npm install
```

**2. Set up environment variables**

Create a `.env.local` file:
```
TINYFISH_API_KEY=your_tinyfish_key_here
GROQ_API_KEY=your_groq_key_here
```

- Get a TinyFish key: https://agent.tinyfish.ai/api-keys
- Get a Groq key (free): https://console.groq.com

**3. Run the dev server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## How to use

1. Enter a **course code** — e.g. `BT1101`, `CS50`, `MATH101`
2. Enter a **university** — e.g. `NUS`, `Harvard`, `MIT`
3. Click **Analyse**
4. Watch the agents run live, then read your verdict

Works for any university worldwide.

---

## Environment Variables

| Variable | Description |
|---|---|
| `TINYFISH_API_KEY` | TinyFish API key — get one at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |
| `GROQ_API_KEY` | Groq API key for LLM inference — get one at [console.groq.com](https://console.groq.com) |
