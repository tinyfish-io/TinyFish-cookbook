# Scholarship Finder

A Next.js app that finds real scholarships in real time. Enter a scholarship type, university, and region — Groq discovers relevant sources, then parallel TinyFish browser agents scrape each one using `@tiny-fish/sdk` and stream results back as they arrive.

## Demo

Each agent card shows live progress as it scrapes. Results appear once all agents complete, with equal-height cards and a side-by-side comparison tool.

## How It Works

```
User submits search
       ↓
/api/search — Groq (llama-3.3-70b) discovers 5-8 relevant scholarship URLs
       ↓
Parallel TinyFish browser agents (via @tiny-fish/sdk) scrape each URL simultaneously
       ↓
Results appear once all agents complete
       ↓
User can select scholarships and compare side by side
```

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                     Browser (UI)                    │
│                                                     │
│  SearchForm → useScholarshipSearch hook             │
│                    │                                │
│                    │ POST /api/search               │
│                    ▼                                │
│  LoadingAnimation ←── SSE stream                   │
│  SearchResults    ←── (on complete)                │
└─────────────────────────────────────────────────────┘
                         │
              ┌──────────▼──────────┐
              │   /api/search        │
              │   route.ts           │
              │                     │
              │  STEP 1             │
              │  Groq llama-3.3-70b │
              │  discovers 5-8      │
              │  scholarship URLs   │
              │                     │
              │  STEP 2             │
              │  Promise.all() runs │
              │  one @tiny-fish/sdk │
              │  agent per URL      │
              └──────────┬──────────┘
                         │
          ┌──────────────┼──────────────┐
          ▼              ▼              ▼
    ┌──────────┐   ┌──────────┐  ┌──────────┐
    │ Agent 1  │   │ Agent 2  │  │ Agent N  │
    │ fastweb  │   │ niche    │  │  ...     │
    │ .com     │   │ .com     │  │          │
    └────┬─────┘   └────┬─────┘  └────┬─────┘
         │              │              │
         └──────────────┼──────────────┘
                        ▼
                 { scholarships: [...] }
                 streamed back to UI
```

## Code Snippet

```typescript
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });

await Promise.all(
  scholarshipUrls.map(async (site, index) => {
    const agentStream = await client.agent.stream({ url: site.url, goal });
    for await (const event of agentStream) {
      if (event.type === EventType.COMPLETE) {
        send({ type: "AGENT_COMPLETE", scholarships: event.result?.scholarships });
        return; // always exit after COMPLETE
      }
    }
  })
);
```

## Running Locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment**
   ```bash
   cp .env.example .env.local
   # Add your API keys to .env.local
   ```

3. **Run the dev server**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TINYFISH_API_KEY` | Browser agents that scrape scholarship pages. Get yours at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |
| `GROQ_API_KEY` | LLM-powered URL discovery via llama-3.3-70b. Get yours at [console.groq.com/keys](https://console.groq.com/keys) |
