# Pharmacy Panic

> Real-time medicine price comparison across Vietnam's major pharmacy chains — powered by [TinyFish](https://tinyfish.ai/) parallel browser agents.

**Live demo → [pharmacy-panic.vercel.app](https://pharmacy-panic.vercel.app)**

---

## What it does

Vietnamese pharmacies don't publish prices online. You have to visit Long Châu, Pharmacity, An Khang, Guardian, and Medicare separately, each with different layouts and product names. This app sends TinyFish browser agents to all five **simultaneously**, extracts structured pricing data, and streams results back in real time.

- Search any medicine or health product across **5 pharmacy chains**
- See **live prices** from Long Châu, Pharmacity, An Khang, Guardian, and Medicare side-by-side
- **Quick category buttons** for common searches (pain relief, cold medicine, vitamins, etc.)
- Results stream in as each pharmacy completes — no waiting for the slowest one
- Optional **6-hour result caching** via Supabase (app works fine without it)

---

## Demo

![Demo](./public/demo.gif)

---

## How it works

```
User enters medicine name
        │
        ▼
POST /api/search
        │
        ├── Cache hit? → stream result instantly via SSE
        │
         └── Cache miss? → fire TinyFish SSE requests for all 3 pharmacies in parallel
                               │
                               ├── TinyFish: Long Châu
                               ├── TinyFish: Pharmacity
                               └── TinyFish: An Khang
                                   │
                                   ├── Parse results
                                   ├── Normalize prices (VND)
                                   └── Stream to client via SSE
```

Each pharmacy search is handled by a separate TinyFish agent. The agents handle cookie banners, dynamic loading, and pagination. The API route streams results via **Server-Sent Events** so the UI updates as pharmacies finish — typically within 10–20 seconds for a full search.

---

## TinyFish API snippet

Here's how the app calls TinyFish for each pharmacy:

```typescript
import { TinyFish } from "@tiny-fish/sdk";

const client = new TinyFish({
  apiKey: process.env.TINYFISH_API_KEY,
  timeout: 780_000,
  maxRetries: 0,
});

const stream = await client.agent.stream({
  url: searchUrl,
  goal: "Extract medicine/health product pricing from this Vietnamese pharmacy website...",
});

for await (const event of stream) {
  if (event.type === "STREAMING_URL") {
    console.log(event.streaming_url);
  }
  if (event.type === "COMPLETE") {
    console.log(event.run_id, event.result);
  }
}
```

The response streams back as Server-Sent Events, with each pharmacy's results arriving as they complete.

---

## Running locally

```bash
git clone https://github.com/tinyfish-io/tinyfish-cookbook
cd tinyfish-cookbook/pharmacy-panic
npm install
```

Create a `.env.local` file:

```env
TINYFISH_API_KEY=your_key_here

# Optional — for result caching (app works fine without it)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Get a TinyFish API key at [tinyfish.ai](https://tinyfish.ai/).

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Architecture diagram

```mermaid
graph TD
  Browser -->|POST /api/search| API["Search API Route"]
  API -->|SSE| TF1["TinyFish: Long Châu"]
  API -->|SSE| TF2["TinyFish: Pharmacity"]
  API -->|SSE| TF3["TinyFish: An Khang"]
  API -->|SSE| TF4["TinyFish: Guardian"]
  API -->|SSE| TF5["TinyFish: Medicare"]
  API -.->|cache lookup| SB[("Supabase<br/>pharmacy_cache")]
  TF1 --> N["Normalize Results"]
  TF2 --> N
  TF3 --> N
  TF4 --> N
  TF5 --> N
  N -->|SSE Stream| Browser
  N -.->|upsert cache| SB
```

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Next.js 16 (App Router) | SSE streaming via Node.js runtime |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui | Fast, clean, no design system overhead |
| Scraping | [TinyFish API](https://tinyfish.ai/) | Parallel browser agents, structured JSON output |
| Validation | Zod | Type-safe schema validation for pharmacy results |
| Caching | Supabase (Postgres) | 6-hour TTL, graceful degradation if unavailable |
| Hosting | Vercel | Zero-config, auto-deploys |

---

Built as a take-home demo for [TinyFish](https://tinyfish.ai) — showing what's possible when you give TinyFish a list of niche local websites and let it run in parallel.
