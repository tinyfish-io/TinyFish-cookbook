# Openbox Deals
**Live Demo:** _add URL after deploy_

**Real-time open-box and refurbished product finder — parallel TinyFish agents scrape 8 retailers simultaneously and stream results as each one finishes.**

Enter a product name and optional max price. Eight browser agents fire at once — Amazon Warehouse, Best Buy Outlet, Newegg, BackMarket, Swappa, Walmart Renewed, Target Clearance, and Micro Center — each extracting structured product listings and streaming them back as they complete.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Browser (Client)                         │
│                                                             │
│  public/index.html — vanilla JS frontend                    │
│  Search form → SSE listener → results grid                  │
│  (results appear as each retailer agent finishes)           │
└──────────────────────────┬──────────────────────────────────┘
                           │ GET /api/search/live?q=&max_price=
                           │ (SSE — results stream as agents finish)
┌──────────────────────────▼──────────────────────────────────┐
│                   Next.js API Routes                        │
│                                                             │
│  /api/search/live                                           │
│    │                                                        │
│    ├─ validateQuery() — XSS sanitize, length check          │
│    ├─ 5s SSE heartbeats to keep connection alive            │
│    │                                                        │
│    └─ TinyFish SDK ──► Promise.allSettled (x8 parallel)     │
│         client.agent.stream({ url, goal,                    │
│           browser_profile, proxy_config })                  │
│         │                                                   │
│         ├── Agent → Amazon Warehouse      (stealth + proxy) │
│         ├── Agent → Best Buy Outlet       (stealth)         │
│         ├── Agent → Newegg Open Box                         │
│         ├── Agent → BackMarket                              │
│         ├── Agent → Swappa                (stealth)         │
│         ├── Agent → Walmart Renewed       (stealth)         │
│         ├── Agent → Target Clearance                        │
│         └── Agent → Micro Center                            │
│                                                             │
│  /api/sites — returns site list for frontend                │
└─────────────────────────────────────────────────────────────┘

Static frontend: page.tsx redirects to public/index.html.
Next.js handles API routes only — no React component tree.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal, browser_profile, proxy_config }, {
  onStreamingUrl: (event) => send session_start + iframe URL to client,
  onComplete:     (event) => RunStatus.COMPLETED → extractProducts(event.result)
                             → filterByPrice() → session_result → SSE
})

// for-await drains the stream; break after COMPLETE
for await (const event of stream) {
  if (event.type === EventType.COMPLETE) break;
}
```

## Adding a New Retailer

Adding a site is a two-line change in `src/lib/sites.ts`:

```typescript
mynewsite: {
  name: 'My New Site',
  searchUrl: 'https://mynewsite.com/search?q={query}',
  goal: "Extract the first 5 open-box '{query}' products. Return ONLY a JSON array: [{name, original_price, sale_price, condition, product_url}].",
  browserProfile: 'stealth',   // optional
  proxyConfig: { enabled: true, country_code: 'US' },  // optional
},
```

`{query}` is replaced with the URL-encoded search term at runtime. `country_code` is typed as `ProxyCountryCode` from `@tiny-fish/sdk` — supported values: `US`, `GB`, `CA`, `DE`, `FR`, `JP`, `AU`.

## SSE Event Types

| Event | Description |
|---|---|
| `search_start` | Search kicked off, lists all site keys |
| `session_status` | Initial `connecting` status per site |
| `session_start` | Agent live — includes `streaming_url` iframe |
| `session_result` | Products extracted — includes `products[]` array |
| `session_error` | Agent failed or returned no results |
| `heartbeat` | Sent every 5s to keep connection alive |
| `complete` | All agents done — includes total elapsed time |

## Setup

### Prerequisites

- Node.js 18+
- TinyFish API key

### Environment Variables

```bash
cp .env.example .env.local
```

Then fill in:

```env
# TinyFish (required) — https://tinyfish.ai
TINYFISH_API_KEY=your-tinyfish-api-key
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
openbox-deals/
├── public/
│   └── index.html               # Vanilla JS frontend (search form + SSE client)
├── src/
│   ├── app/
│   │   ├── page.tsx             # Redirects to /index.html
│   │   └── api/
│   │       ├── search/live/     # GET — SSE stream, parallel TinyFish agents
│   │       └── sites/           # GET — returns list of supported retailers
│   └── lib/
│       ├── sites.ts             # Retailer configs (add new sites here)
│       └── helpers.ts           # extractProducts, filterByPrice, sanitizeProduct
├── .env.example
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Cache layer used? | NO (all results fetched live) |
| Scraping parallel? | YES (`Promise.allSettled` across 8 retailers) |
| Live browser preview? | YES (`onStreamingUrl` → iframe URL in SSE) |
| Input sanitized? | YES (XSS scrub + length check in `validateQuery`) |
| Adding a new retailer? | YES — two lines in `sites.ts` |
| Bot-protected sites? | YES (stealth profile + proxy for Amazon, Swappa, Walmart) |

## Tech Stack

- **Framework:** Next.js 15 (App Router), TypeScript
- **Frontend:** Vanilla JS (`public/index.html`) — no React component tree
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **Deployment:** Vercel
