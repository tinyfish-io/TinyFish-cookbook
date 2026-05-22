# Code Reference Finder
**Live Demo:** _add URL after deploy_

**Find real-world usage examples for unfamiliar code — Gemini analyzes your code, TinyFish Search finds relevant GitHub repos and Stack Overflow questions, then parallel browser agents extract code snippets and relevance scores in real time.**

Paste any code snippet. The app identifies the libraries, APIs, and patterns used, generates targeted search queries, finds the most relevant GitHub repos and Stack Overflow threads via the TinyFish Search API, then fires one browser agent per result in parallel to extract actual code examples and explain how each relates to your snippet.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  CodeInput → PipelineProgress → AgentCard grid             │
│  ReferenceGrid → ReferenceCard (results stream in)         │
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/analyze { code }
                           │ (SSE — events stream as pipeline runs)
┌──────────────────────────▼──────────────────────────────────┐
│                   /api/analyze/route.ts                     │
│                                                             │
│  Stage 1 — Gemini analyzes code                               │
│    analyzeCode()  → language, libraries, APIs, patterns     │
│    generateSearchQueries() → 5 GitHub + 5 SO queries        │
│                   → analysis_complete SSE event             │
│                                                             │
│  Stage 2 — TinyFish Search API                              │
│    client.search.query({ query: "... site:github.com" })    │
│    client.search.query({ query: "... site:stackoverflow.com"})
│    5+5 parallel searches → deduplicated results             │
│                   → search_complete SSE event               │
│                                                             │
│  Stage 3 — TinyFish Agents (Promise.allSettled, parallel)   │
│    client.agent.stream({ url, goal })                       │
│    GitHub agent  → reads README, extracts code snippets     │
│    SO agent      → reasons over question data, scores relevance│
│                                                             │
│    EventType.STREAMING_URL → live iframe per agent          │
│    EventType.PROGRESS      → step updates                   │
│    EventType.COMPLETE + RunStatus.COMPLETED                 │
│      // COMPLETED only means the browser ran without crashing│
│      // — always validate result content, not just the status│
│      → ReferenceData → agent_complete SSE event             │
└─────────────────────────────────────────────────────────────┘

No database. No cache. No GitHub API token. No StackExchange key.
Pure in-memory — results fetched live every search.
```

### Gemini usage

```
gemini-client.ts:
  analyzeCode()          → identify language, libraries, APIs, patterns
  generateSearchQueries() → generate 5 GitHub + 5 SO search queries
```

### TinyFish Search usage

```
// Two parallel batches — one per platform
const [ghSearches, soSearches] = await Promise.all([
  Promise.all(ghQueries.map(q => client.search.query({
    query: `${q.query} site:github.com`
  }))),
  Promise.all(soQueries.map(q => client.search.query({
    query: `${q.query} site:stackoverflow.com`
  }))),
]);
// Results deduplicated and capped at 5 per platform
```

## Pipeline Stages

1. **Code Analysis** — Gemini identifies language, external libraries, APIs/hooks, and usage patterns
2. **Query Generation** — Gemini generates 5 GitHub + 5 Stack Overflow search queries tailored to the code
3. **Search** — TinyFish Search finds real GitHub repos and SO questions for each query (replaces GitHub API + StackExchange API)
4. **Agent Extraction** — one TinyFish browser agent per result fires in parallel:
   - **GitHub agents** — navigate to repo, read README, extract code snippets and relevance score
   - **Stack Overflow agents** — reason over question data, score relevance, extract any code in the excerpt
5. Results stream back to the UI as each agent finishes

## Setup

### Prerequisites

- Node.js 22.x
- TinyFish API key
- Gemini API key

### Environment Variables

```bash
cp .env.example .env.local
```

Then fill in:

```env
# TinyFish Web Agent API key (server-side only)
# Get yours at: https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=

# Gemini API key — used for code analysis and search query generation
# Get yours at: https://aistudio.google.com/apikey
GEMINI_API_KEY=
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
code-reference-finder/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Main UI
│   │   ├── globals.css
│   │   └── api/
│   │       └── analyze/route.ts        # POST — SSE pipeline endpoint
│   ├── components/
│   │   ├── CodeInput.tsx               # Code paste area
│   │   ├── Dashboard.tsx               # App shell
│   │   ├── Header.tsx
│   │   ├── PipelineProgress.tsx        # Stage progress indicator
│   │   ├── AgentCard.tsx               # Per-agent status + live iframe
│   │   ├── LiveBrowserPreview.tsx      # Expanded agent browser view
│   │   ├── ReferenceGrid.tsx           # Results grid
│   │   ├── ReferenceCard.tsx           # Individual reference result
│   │   └── AnalysisSummary.tsx         # Code analysis summary
│   ├── context/
│   │   └── AppContext.tsx              # React context + reducer
│   ├── hooks/
│   │   └── useCodeAnalysis.ts          # SSE client + dispatch
│   └── lib/
│       ├── gemini-client.ts              # Gemini — code analysis + query gen
│       ├── search.ts                   # TinyFish Search — GitHub + SO
│       ├── orchestrator.ts             # Pipeline coordinator
│       ├── goal-builder.ts             # Agent goal prompts
│       ├── constants.ts
│       └── types.ts
├── extension/                          # Chrome extension (side panel)
│   ├── manifest.json
│   ├── background.js
│   ├── sidepanel.html
│   └── sidepanel.js
├── .env.example
├── .gitignore
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Raw SSE fetch? | NO (TinyFish SDK throughout) |
| GitHub API token needed? | NO (TinyFish Search replaces GitHub API) |
| StackExchange API key needed? | NO (TinyFish Search replaces SO API) |
| OpenRouter? | NO (Gemini SDK directly) |
| Search parallel? | YES (all queries run concurrently via Promise.all) |
| Agent execution parallel? | YES (Promise.allSettled across all results) |
| Live browser preview? | YES (EventType.STREAMING_URL → iframe per agent) |
| Result validation? | YES (COMPLETED ≠ goal achieved — content validated) |

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 3
- **Animations:** Framer Motion
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **Search:** TinyFish Search API (`client.search.query`)
- **LLM:** Gemini (`gemini-2.0-flash`)
- **Icons:** Lucide React
- **Deployment:** Vercel
