# Customer Discovery

**Live:** [https://customer-discovery-app-ten.vercel.app](https://customer-discovery-app-ten.vercel.app)

Customer Discovery is an AI-powered market research tool that identifies customer segments by analyzing companies similar to a given seed company. It uses the TinyFish SDK to dispatch up to 10 parallel web agents — one per similar company — that each navigate the target website, extract case studies, testimonials, pricing, features, and customer types, then synthesizes all findings into actionable customer segment profiles.

## Demo

https://github.com/user-attachments/assets/3a7fd32d-8d8d-4233-9cce-ce3ddeeb360d

## TinyFish SDK Usage

The app uses the TinyFish TypeScript SDK (`@tiny-fish/sdk`) to stream live events from parallel browser agents. Each agent navigates a company's website, inspects key pages (customers, pricing, about), and returns structured JSON findings:

```typescript
import { TinyFish } from "@tiny-fish/sdk";

const client = new TinyFish({ apiKey });

const agentStream = await client.agent.stream({
  url: company.url,
  goal: `You are a customer discovery agent analyzing ${company.name} (${company.url}).

IMPORTANT: Stay ONLY on this company's website. Do NOT visit external websites.

STEP 1 — Navigate to the homepage and get an overview of what the company does.

STEP 2 — Quickly check these pages if they exist (skip if not found):
- /customers or /case-studies
- /pricing
- /about

STEP 3 — Extract this structured data:
- Company overview (1-2 sentences)
- Customer types they serve (e.g., startups, enterprises, agencies, SMBs)
- Case studies: customer name, industry, brief summary (up to 5)
- Testimonials: quote, author, company, role (up to 5)
- Pricing tiers: plan names and who each is for
- Key features: main product capabilities (up to 8)
- Integrations: tools/platforms they connect with

STEP 4 — Return findings as JSON:
{
  "overview": "What the company does",
  "customerTypes": ["type1", "type2"],
  "caseStudies": [{"customer": "name", "industry": "industry", "summary": "summary"}],
  "testimonials": [{"quote": "quote", "author": "name", "company": "company", "role": "role"}],
  "pricingTiers": ["Free - for individuals", "Pro $X/mo - for teams"],
  "keyFeatures": ["feature1", "feature2"],
  "integrations": ["integration1", "integration2"]
}

FINAL RULE: Return ONLY the JSON object above. No planning text, no step reports, no reasoning traces.`,
});

for await (const event of agentStream) {
  // STREAMING_URL → live browser preview (iframe)
  // PROGRESS     → agent step updates
  // COMPLETE     → structured company findings JSON
}
```

All 10 agents run concurrently via a single batch SSE connection, bypassing browser connection limits. Events are streamed in real time — each agent card shows a live browser preview while browsing.

## How to Run

### Prerequisites

- Node.js 18+
- A TinyFish API key ([get one here](https://agent.tinyfish.ai))
- An OpenRouter API key ([get one here](https://openrouter.ai/keys))

### Setup

1. Install dependencies:

```bash
cd customer-discovery-app
npm install
```

2. Create a `.env` file with your API keys:

```
OPENROUTER_API_KEY=your_openrouter_api_key_here
TINYFISH_API_KEY=your_tinyfish_api_key_here
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      User (Browser)                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (Tailwind + shadcn/ui + Framer)      │  │
│  │                                                        │  │
│  │  1. Enter seed company name + URL                      │  │
│  │  2. AI finds 10 similar companies (via OpenRouter)     │  │
│  │  3. 10 TinyFish agents launch in parallel              │  │
│  │  4. Watch live browser previews as agents research     │  │
│  │  5. View synthesized customer segments + insights      │  │
│  └───────────┬────────────────────────────┬───────────────┘  │
└──────────────┼────────────────────────────┼──────────────────┘
               │                            │
   POST /api/analyze-company     POST /api/tinyfish-agents-batch
               │                            │
               ▼                            ▼
┌──────────────────────┐    ┌──────────────────────────────────┐
│   OpenRouter API     │    │  TinyFish SDK (agent.tinyfish.ai) │
│                      │    │                                    │
│  Gemini Flash model  │    │  client.agent.stream() x 10       │
│  finds 10 similar    │    │  Each agent navigates one company  │
│  companies + profile │    │                                    │
└──────────────────────┘    │  SSE Stream Events:                │
                            │   • STREAMING_URL → live preview   │
   POST /api/synthesize     │   • PROGRESS → step updates        │
          │                 │   • COMPLETE → structured JSON      │
          ▼                 └─────┬────┬────┬────┬───────────────┘
┌──────────────────────┐          │    │    │    │
│   OpenRouter API     │          ▼    ▼    ▼    ▼
│                      │      ┌──────┐┌──────┐┌──────┐  ... (10 companies)
│  Combines all agent  │      │ Co.A ││ Co.B ││ Co.C │
│  findings into       │      │ site ││ site ││ site │
│  customer segments   │      └──────┘└──────┘└──────┘
└──────────────────────┘
```
