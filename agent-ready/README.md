# AgentReady

AI shopping agents from Amazon, ChatGPT, and Google are trying to buy from your store right now. AgentReady deploys 5 real TinyFish web agents that simulate the full shopping experience — from product discovery to checkout — and tells you exactly where they fail. Each agent runs a behavioral test, scores the results 0–100, and produces a weighted **Agent Readiness Score**.

## Demo

https://drive.google.com/file/d/1EPKTTvUmnzqqHLvcCgPyclCpOCjAeQEL/view?usp=sharing

## TinyFish API Usage

AgentReady calls the TinyFish SSE endpoint to run 5 parallel web agents against a target e-commerce URL. Each agent is given a specific goal (e.g. "find products", "add to cart", "reach checkout") and streams real-time progress events back to the client:

```typescript
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": apiKey,
    "Content-Type": "application/json",
    Accept: "text/event-stream",
  },
  body: JSON.stringify({
    url: request.url,
    goal: request.goal, // e.g. "Navigate to the site and try to find products using search..."
    browser_profile: "lite",
    proxy_config: { enabled: true },
  }),
});

// Parse SSE stream for real-time updates
const reader = response.body.getReader();
// Events: STARTED → STREAMING_URL (live browser preview) → PROGRESS → COMPLETE (JSON result)
```

The 5 test suites and their weights:

| Test | What It Checks | Weight |
|------|---------------|--------|
| Discovery | Can an agent find products via search/navigation? | 25% |
| Product Understanding | Can an agent extract price, variants, availability? | 25% |
| Cart Interaction | Can an agent select options and add to cart? | 25% |
| Checkout Navigation | Can an agent reach the checkout page? | 15% |
| Policy Extraction | Can an agent find return/shipping/warranty policies? | 10% |

## How to Run

### Prerequisites

- Node.js 18+
- A TinyFish API key ([get one here](https://agent.tinyfish.ai/signup))
- Upstash Redis credentials (optional — works without Redis, just no persistence/leaderboard)

### Setup

1. Install dependencies:

```bash
cd agent-ready
npm install
```

2. Create a `.env.local` file with your keys:

```
TINYFISH_API_KEY=your_tinyfish_api_key_here
UPSTASH_REDIS_REST_URL=your_upstash_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_token_here
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) and enter a store URL to audit.

## Architecture Diagram

```
                         ┌─────────────────┐
                         │   User / Judge   │
                         └────────┬─────────┘
                                  │  submits URL
                                  ▼
                    ┌─────────────────────────────┐
                    │     Next.js 14 (App Router)  │
                    │  ┌──────────┐ ┌───────────┐  │
                    │  │ Frontend │ │ API Routes │  │
                    │  │ (React)  │ │   (SSE)    │  │
                    │  └──────────┘ └─────┬──────┘  │
                    └─────────────────────┼─────────┘
                                          │ spawns 5 parallel agents
                         ┌────────────────┼────────────────┐
                         ▼                ▼                ▼
                   ┌──────────┐    ┌──────────┐    ┌──────────┐
                   │ TinyFish │    │ TinyFish │    │ TinyFish │  (x5)
                   │  Agent 1 │    │  Agent 2 │    │  Agent 3 │
                   │ Discovery│    │ Product  │    │  Cart    │  ...
                   └────┬─────┘    └────┬─────┘    └────┬─────┘
                        │               │               │
                        └───────────────┼───────────────┘
                                        ▼
                              ┌──────────────────┐
                              │  Upstash Redis   │
                              │ • JSON storage   │
                              │ • Sorted Sets    │
                              │ • TTL caching    │
                              └──────────────────┘
```
