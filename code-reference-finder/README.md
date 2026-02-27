# Code Reference Finder

**Live:** [https://code-reference-finder.vercel.app](https://code-reference-finder.vercel.app)

Code Reference Finder helps you understand unfamiliar code by finding real-world usage examples from GitHub repositories and Stack Overflow. Paste a code snippet (or right-click selected code on GitHub), and it uses AI to analyze the libraries and APIs used, then dispatches web agents to search GitHub and Stack Overflow, extract relevant examples, and display them side-by-side with relevance scores.

## Demo

https://github.com/user-attachments/assets/73feb7c2-60dd-492b-b440-165d0170a4aa


## TinyFish API Usage

The app dispatches 10 parallel TinyFish web agents — 5 for GitHub repos and 5 for Stack Overflow posts. Each agent receives a goal prompt tailored to its platform.

**GitHub agents** navigate the repository and read the README to extract relevant code examples:

```typescript
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.TINYFISH_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://github.com/owner/repo",
    goal: `You are analyzing a GitHub repository to determine how it relates to specific libraries and APIs.

           TARGET LIBRARIES: @tanstack/react-query, axios
           TARGET APIs/SYMBOLS: useQuery, axios.get

           INSTRUCTIONS:
           1. Go to the repository page and read ONLY the README.
           2. Extract: what the project does, any code examples shown, and how it relates to the target libraries/APIs.
           3. Score relevance 0-100.

           Return a JSON object with: title, sourceUrl, platform, relevanceScore, alignmentExplanation, codeSnippets...`,
  }),
});
```

**Stack Overflow agents** reason over the post metadata (title, tags, score, excerpt) without navigating:

```typescript
const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.TINYFISH_API_KEY,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://example.com",
    goal: `You are a reasoning agent analyzing a Stack Overflow post.

           STACK OVERFLOW POST DATA:
           - Title: How to pass parameters to useQuery with Axios
           - Score: 38 | Answered: true | Tags: reactjs, axios, react-query

           TARGET LIBRARIES: @tanstack/react-query, axios

           Score relevance 0-100 based on: Do the tags match? Does the title discuss the target APIs?
           Would this post help someone understand how to use these libraries?

           Return a JSON object with: title, sourceUrl, platform, relevanceScore, alignmentExplanation, questionTitle, votes, tags...`,
  }),
});
```

Both agent types stream SSE events including a `STREAMING_URL` (live view of the agent working) and a final `COMPLETE` event with the extracted reference data JSON.

## How to Run

### Prerequisites

- Node.js 18+
- API keys for: [OpenRouter](https://openrouter.ai/keys), [TinyFish](https://mino.ai/api-keys), [GitHub](https://github.com/settings/tokens), and [Stack Exchange](https://stackapps.com/apps/oauth/register)

### Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env.local` file with your API keys (see `.env.example`):

```
OPENROUTER_API_KEY=your_openrouter_api_key
TINYFISH_API_KEY=your_tinyfish_api_key
GITHUB_TOKEN=your_github_personal_access_token
STACKEXCHANGE_KEY=your_stackexchange_api_key
```

3. Start the dev server:

```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

### Chrome Extension (optional)

To use the side panel and right-click context menu on GitHub:

1. Go to `chrome://extensions` and enable Developer mode
2. Click "Load unpacked" and select the `extension/` folder
3. Copy any unknown code and paste it in the input area to start using it.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│                        User (Browser)                            │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Next.js Frontend (React + Tailwind + Framer Motion)       │  │
│  │                                                            │  │
│  │  1. Paste code snippet or right-click on GitHub            │  │
│  │  2. View analysis (language, libraries, APIs, patterns)    │  │
│  │  3. Watch agents search & extract in real-time             │  │
│  │  4. Browse results sorted by relevance score               │  │
│  └───────────────────────┬────────────────────────────────────┘  │
└──────────────────────────┼───────────────────────────────────────┘
                           │  POST /api/analyze (SSE stream)
                           ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Next.js API Route (SSE)                        │
│                                                                   │
│  Stage 1 — Code Analysis (OpenRouter / Gemini Flash)             │
│    • Identifies language, libraries, APIs, patterns               │
│    • Generates 10 search queries (5 GitHub + 5 Stack Overflow)   │
│                                                                   │
│  Stage 2 — Search Execution                                      │
│    • GitHub Search API (5 queries, rate-limited)                 │
│    • Stack Exchange API (5 queries, parallel)                    │
│    • Deduplicates and picks top 5 from each platform             │
│                                                                   │
│  Stage 3 — Agent Extraction (10 parallel TinyFish agents)        │
│    • GitHub agents: navigate repo, read README, extract examples │
│    • SO agents: reason over post metadata, score relevance       │
│                                                                   │
│  Stage 4 — Pipeline Complete                                     │
└────────┬──────────────┬──────────────┬──────────────┬────────────┘
         │              │              │              │
         ▼              ▼              ▼              ▼
   ┌──────────┐  ┌──────────┐  ┌───────────┐  ┌───────────┐
   │ OpenRouter│  │  GitHub  │  │ Stack     │  │ TinyFish  │
   │  (LLM)   │  │  API     │  │ Exchange  │  │  (Agents) │
   └──────────┘  └──────────┘  └───────────┘  └───────────┘
```
