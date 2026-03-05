# Concept Discovery System

**Live:** [https://concept-discovery-system.vercel.app](https://concept-discovery-system.vercel.app)

Concept Discovery System is a project idea validation tool that discovers similar existing projects across GitHub, Dev.to, and Stack Overflow. It uses the TinyFish API to dispatch 10 parallel web agents — browser agents that navigate real websites and reasoning agents that analyze Stack Exchange API data — then feeds the collected results into an AI analysis that scores your idea on competition, market validation, and maintainability.

## Demo

https://github.com/user-attachments/assets/ba91b1fa-71eb-40a1-9973-e8a46d3c3021


## TinyFish API Usage

The app calls the TinyFish SSE endpoint once per discovered URL, in parallel. Each browser agent navigates a real website (GitHub repo or Dev.to article), reads the page content, and returns structured JSON. Stack Overflow agents receive pre-fetched API data in their goal prompt and reason about it without browsing:

```typescript
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": import.meta.env.VITE_MINO_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://github.com/hoppscotch/hoppscotch",
    goal: `You are a concept discovery agent. The user is exploring: "API testing tool".

           STEP 1 — NAVIGATE TO THE REPOSITORY:
           Open the URL. Confirm you're on the repository homepage.

           STEP 2 — EXTRACT METADATA:
           Project name, README summary, tech stack, star count, last commit date,
           and key features.

           STEP 3 — ANALYZE ALIGNMENT:
           Write a single-line explanation of how this project relates to the user's idea.

           STEP 4 — RETURN RESULTS as JSON:
           { "projectName": "...", "summary": "...", "techStack": [...],
             "alignmentExplanation": "...", "stars": 1234, ... }`,
  }),
});
```

The response streams SSE events including a `streamingUrl` (live browser preview via iframe) and a final `COMPLETE` event with the extracted JSON data.

## How to Run

### Prerequisites

- Node.js 18+
- A TinyFish API key ([get one here](https://agent.tinyfish.ai))

### Setup

1. Install dependencies:

```bash
cd Concept-Discovery-System
npm install
```

2. Create a `.env` file with your API keys:

```
VITE_MINO_API_KEY=your_tinyfish_api_key_here
VITE_OPENROUTER_API_KEY=your_openrouter_key_here
VITE_GITHUB_TOKEN=your_github_token_here
VITE_STACKEXCHANGE_KEY=your_stackexchange_key_here
```

Only `VITE_MINO_API_KEY` is required. The others improve search quality and rate limits:
- **OpenRouter API Key** — Enables AI-powered search query generation (falls back to deterministic extraction without it)
- **GitHub Token** — Increases GitHub API rate limit from 60 to 5,000 requests/hour
- **Stack Exchange Key** — Increases Stack Exchange API rate limit from 300 to 10,000 requests/day

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:5173](http://localhost:5173)

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      User (Browser)                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │    React + Vite Frontend (Tailwind + Framer Motion)    │  │
│  │                                                        │  │
│  │  1. Describe a project idea                            │  │
│  │  2. AI generates targeted search queries (OpenRouter)  │  │
│  │  3. Watch live browser previews as agents research     │  │
│  │  4. View discovered project cards + detail panel       │  │
│  │  5. Read AI analysis with competition/validation scores│  │
│  └──────────┬────────────────────────────┬───────────────┘  │
└─────────────┼────────────────────────────┼───────────────────┘
              │                            │
   OpenRouter API                POST /v1/automation/run-sse
   (query generation             (x10 agents, parallel)
    + final analysis)                      │
              │                            ▼
              ▼              ┌─────────────────────────────────┐
   ┌──────────────────┐     │    TinyFish API (SSE Stream)    │
   │  google/gemini   │     │                                 │
   │  2.0-flash-001   │     │  Browser Agents (7):            │
   │                  │     │    4x GitHub repos              │
   │  • Smart queries │     │    3x Dev.to articles           │
   │  • Idea analysis │     │                                 │
   │  • Scoring       │     │  Reasoning Agents (3):          │
   └──────────────────┘     │    3x Stack Overflow posts      │
                            │    (Stack Exchange API data      │
                            │     passed in goal prompt)       │
                            │                                 │
                            │  SSE Events:                    │
                            │    • streamingUrl → live iframe  │
                            │    • STEP → progress updates     │
                            │    • COMPLETE → structured JSON  │
                            └──────┬──────────┬──────────┬────┘
                                   │          │          │
                                   ▼          ▼          ▼
                             ┌─────────┐ ┌────────┐ ┌────────────┐
                             │ GitHub  │ │ Dev.to │ │ Stack      │
                             │ Repos   │ │ Search │ │ Exchange   │
                             │ (4 URLs)│ │ (3 URLs│ │ API (3     │
                             │         │ │       )│ │ questions) │
                             └─────────┘ └────────┘ └────────────┘
```

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (custom dark cyberpunk theme)
- **Animation**: Framer Motion
- **State Management**: useReducer + Context API
- **Browser Agents**: TinyFish/Mino API (SSE streaming)
- **AI**: OpenRouter (Google Gemini 2.0 Flash) for query generation and idea analysis
- **APIs**: GitHub REST API, Stack Exchange API, Dev.to website search
