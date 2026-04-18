# Concept Discovery System

**Live:** [https://concept-discovery-system.vercel.app](https://concept-discovery-system.vercel.app)

Concept Discovery System helps you validate a project idea by finding similar work on **GitHub**, **Dev.to**, and **Stack Overflow**. It combines **TinyFish** (Search, Fetch, and Agent streaming) with **OpenRouter** for query generation, page summarization, and final scoring.

## Demo

https://github.com/user-attachments/assets/ba91b1fa-71eb-40a1-9973-e8a46d3c3021

## How it works (current architecture)

### 1. Query generation

- With **`VITE_OPENROUTER_API_KEY`**: an LLM proposes three targeted queries (GitHub, Dev.to, Stack Overflow).
- Without it: deterministic keyword-based queries (`src/lib/query-generator.ts`).

### 2. URL discovery

- **GitHub**: [GitHub Search API](https://docs.github.com/en/rest/search) (repos).
- **Dev.to**: [TinyFish Search API](https://docs.tinyfish.ai/search-api) via `site:dev.to …` for direct article URLs (`src/lib/search-engines.ts` → dev proxy `/api/tinyfish/search`).
- **Stack Overflow**: [Stack Exchange API](https://api.stackexchange.com/) (`/search/advanced`).

Results are merged and capped at **10** URLs (`executeSearches`).

### 3. Extraction (hybrid: 2 agents + batch Fetch + LLM)

The browser cannot call TinyFish APIs directly without CORS issues. In **development**, `vite.config.ts` registers same-origin routes that run **`@tiny-fish/sdk` on the Node side**:

| Route | SDK usage |
| --- | --- |
| `POST /api/tinyfish/stream` | `client.agent.stream({ url, goal })` — SSE relayed to the browser |
| `POST /api/tinyfish/fetch` | `client.fetch.getContents({ urls, … })` — up to 10 URLs per request |
| `POST /api/tinyfish/search` | `client.search.query({ query, … })` |

The UI client (`src/lib/tinyfish-client.ts`) only calls these **`/api/tinyfish/*`** paths.

**Extraction strategy** (`src/hooks/useConceptDiscovery.ts`):

- Up to **two** non–Stack Overflow URLs use **live Agent streaming** (progress + optional live preview URL).
- Remaining GitHub/Dev.to URLs: one **batched Fetch**, then **OpenRouter** turns each page text into structured `ConceptData` (`extractConceptFromText` in `src/lib/openrouter-client.ts`).
- **Stack Overflow**: with OpenRouter, analysis uses API/snippet text only (no browser). Without OpenRouter, it falls back to the streaming Agent with the reasoning prompt from `buildAgentGoal`.

If **`VITE_OPENROUTER_API_KEY`** is missing, Fetch + SO text extraction are skipped and **streaming Agents** are used for those items instead (slower, closer to the legacy “all agent” behavior).

### 4. Analysis

After agents complete, **OpenRouter** scores the idea (competition, validation, maintainability) when configured (`generateAnalysis`).

## Prerequisites

- **Node.js** 18+
- **TinyFish API key** — [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)

## Setup

1. Install dependencies:

```bash
cd concept-discovery-system
npm install
```

2. Copy `.env.example` to `.env` and set keys:

| Variable | Role |
| --- | --- |
| `VITE_TINYFISH_API_KEY` | **Required.** TinyFish Search / Fetch / Agent (via dev proxy). |
| `VITE_OPENROUTER_API_KEY` | **Recommended.** Smarter queries, Fetch+LLM extraction, Stack Overflow text analysis, final scoring. |
| `VITE_GITHUB_TOKEN` | Optional. Higher GitHub API rate limits. |
| `VITE_STACKEXCHANGE_KEY` | Optional. Higher Stack Exchange API limits. |

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173)

> **Production note:** The `/api/tinyfish/*` routes are implemented as **Vite dev middleware**. For a static or edge deployment you will need equivalent server routes (or a small backend) that call the same SDK methods.

## Architecture (high level)

```
User (browser)
  → React app
  → OpenRouter (queries + analysis + optional extraction)
  → GitHub API / Stack Exchange API
  → POST /api/tinyfish/search  → TinyFish Search (Dev.to URLs)
  → POST /api/tinyfish/stream → TinyFish Agent stream (2 previews)
  → POST /api/tinyfish/fetch  → TinyFish Fetch batch (remaining pages)
```

## Tech stack

- **UI**: React 19, TypeScript, Vite 7, Tailwind CSS v4, Framer Motion
- **State**: `useReducer` + Context (`src/context/DiscoveryContext.tsx`)
- **TinyFish**: `@tiny-fish/sdk` (Search, Fetch, Agent) behind dev proxy
- **LLM**: OpenRouter (Gemini 2.0 Flash) for queries, extraction JSON, and analysis

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Vite dev server with TinyFish proxy routes |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview production build locally |
| `npm run lint` | ESLint |
