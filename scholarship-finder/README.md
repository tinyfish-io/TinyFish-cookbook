# Summer School Finder

A Next.js app that uses TinyFish to discover and extract summer school programs in real time. Search by program type, location, age group, and duration — parallel browser agents scrape each result and stream findings back as they arrive.

## Demo

Search runs parallel agents that you can watch live via the streaming browser preview embedded in each agent card.

## How It Works

```
User submits search
       ↓
/api/search — TinyFish Search API discovers up to 8 relevant URLs
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
│   │   └── search/route.ts   ← single route: discovery + agent scraping
│   └── page.tsx
├── components/
│   ├── AgentCard.tsx          ← live agent status + streaming browser preview
│   ├── ResultCard.tsx         ← extracted program card
│   ├── SearchForm.tsx         ← search inputs
│   └── CompareModal.tsx       ← side-by-side program comparison
├── hooks/
│   └── useSummerSchoolSearch.ts  ← SSE stream consumer
└── types/
    └── summer-school.ts
```

## Code Snippet

```typescript
// /api/search discovers URLs then runs agents in parallel
const urls = await discoverUrls(programType, targetAge, location, duration);

await Promise.all(
  urls.map(async (url, idx) => {
    const agentStream = await client.agent.stream({ url, goal });
    for await (const event of agentStream) {
      if (event.type === EventType.COMPLETE) {
        send({ type: "COMPLETE", agentId: `agent-${idx}`, result: event.result });
        break;
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
   # Add your TinyFish API key to .env.local
   ```

3. **Run the dev server**
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable | Description |
|----------|-------------|
| `TINYFISH_API_KEY` | Used for both Search API (URL discovery) and browser agents. Get yours at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |
