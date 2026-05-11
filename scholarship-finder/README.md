# Scholarship Finder

A Next.js app that finds real scholarships in real time. Enter a scholarship type, university, and region — Gemini discovers relevant sources, then parallel TinyFish browser agents scrape each one and stream results back as they arrive.

## Demo

Each agent card shows a live browser preview as it scrapes. Results appear as each agent completes rather than waiting for all to finish.

## How It Works

```
User submits search
       ↓
/api/search — Gemini (gemini-2.0-flash) discovers 5-8 relevant scholarship URLs
       ↓
Parallel TinyFish browser agents scrape each URL simultaneously
       ↓
Results stream back to the UI as each agent completes
```

## Architecture

```
src/
├── app/
│   ├── api/
│   │   └── search/route.ts     ← single route: Gemini discovery + parallel agent scraping
│   └── page.tsx
├── components/
│   ├── SearchForm.tsx           ← search inputs
│   ├── SearchResults.tsx        ← results grid
│   ├── ScholarshipCard.tsx      ← individual scholarship card
│   ├── SelectableScholarshipCard.tsx
│   ├── CompareDashboard.tsx     ← side-by-side comparison
│   ├── CompareButton.tsx
│   ├── LoadingAnimation.tsx     ← live agent status feed
│   └── Header.tsx
├── hooks/
│   └── useScholarshipSearch.ts  ← SSE stream consumer
└── types/
    └── scholarship.ts
```

## Code Snippet

```typescript
// /api/search — Gemini discovers URLs, then TinyFish agents scrape in parallel
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
const result = await model.generateContent(prompt);
const urls = JSON.parse(result.response.text());

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });

await Promise.all(
  scholarshipUrls.map(async (site, index) => {
    const agentStream = await client.agent.stream({ url: site.url, goal });
    for await (const event of agentStream) {
      if (event.type === EventType.COMPLETE) {
        send({ type: "AGENT_COMPLETE", scholarships: event.result?.scholarships });
        return;
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
| `GEMINI_API_KEY` | LLM-powered URL discovery via gemini-2.0-flash. Get yours at [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
