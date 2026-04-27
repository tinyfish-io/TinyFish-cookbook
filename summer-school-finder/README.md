# Summer School Finder

Discover summer school programs with AI-powered browser agents that scan multiple university sites in parallel.

**Live demo:** _add URL after deploy_

## What it does

Search by program type, location, age group, and duration. The app runs two stages:

1. **Discover** — queries the TinyFish Search API to find relevant program pages
2. **Scrape** — spins up parallel browser agents (one per URL) that extract structured program data in real time

Results stream in as each agent finishes — you don't wait for all of them.

## Demo

```
Search: "STEM programs, San Francisco, ages 13-16"
→ Discovers 8 program URLs
→ 8 browser agents run in parallel
→ Results appear as each agent completes
```

## Architecture

```
page.tsx  →  /api/discover  →  TinyFish Search API
          →  /api/scrape    →  TinyFish Agent (stream, one per URL)
                                ↳ EventType.STARTED
                                ↳ EventType.STREAMING_URL  (live iframe)
                                ↳ EventType.PROGRESS
                                ↳ EventType.COMPLETE → structured JSON
```

## Run locally

```bash
# 1. Install
npm install

# 2. Set your API key (get one at https://agent.tinyfish.ai/api-keys)
cp .env.example .env.local
# add: TINYFISH_API_KEY=your_key_here

# 3. Start
npm run dev
# → http://localhost:3000
```

## Environment variables

| Variable | Description |
|---|---|
| `TINYFISH_API_KEY` | Required. Covers Search + Agent APIs. Get at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |

## Key code

**Parallel agents** (`src/hooks/useSummerSchoolSearch.ts`):
```ts
await Promise.all(
  newAgents.map((agent) => runAgent(agent.url, agent.id, searchData))
);
```

**SDK streaming** (`src/app/api/scrape/route.ts`):
```ts
const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });
const agentStream = await client.agent.stream({ url, goal });

for await (const event of agentStream) {
  if (event.type === EventType.COMPLETE) {
    send({ type: "COMPLETE", result: event.result });
    break; // always break after COMPLETE
  }
}
```
