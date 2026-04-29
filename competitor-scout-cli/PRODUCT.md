# Product Description

## Product name

**Competitor Scout** — a CLI plus optional **Next.js** web UI for competitive research.

## The why

Teams waste time manually checking competitor sites for feature changes and market signals. Competitor Scout lets you define competitors once, then ask natural-language questions as your project evolves. The tool plans research with **OpenAI**, gathers evidence with **Tinyfish** (Search, Fetch, and Web Agent), and returns structured findings and a comparison report so product decisions can move faster with less manual overhead.

---

## PRD

### 1. Product architecture overview

- **Overview:**  
  The system has a **CLI** and/or **web UI**, a **planning** layer (OpenAI), and an **execution** layer (Tinyfish). The planner turns a user question into per-competitor context (goals / URLs). The executor prefers **Search → Fetch → LLM sufficiency check** for speed; if evidence is insufficient or Search/Fetch fails, it **falls back** to the **Tinyfish Web Agent** (async queue + poll). A summarizer turns results into per-competitor findings and a comparison report.

- **APIs called:**
  - **OpenAI Chat Completions**: planning goals, assessing Search+Fetch evidence, summarizing each competitor (when using Agent), and generating the comparison report.
  - **Tinyfish SDK** (`@tiny-fish/sdk`):
    - **Search API** — find on-domain URLs for the question ([Search API](https://docs.tinyfish.ai/search-api)).
    - **Fetch API** — extract clean page content (markdown) for LLM use ([Fetch API](https://docs.tinyfish.ai/fetch-api)).
    - **Agent API** — async queue (`agent.queue`) + `runs.get` / `runs.cancel` for browsing goals when Search+Fetch is not enough ([Agent API](https://docs.tinyfish.ai/agent-api/index.md)).

- **Relationship between APIs:**
  - OpenAI creates the per-competitor goal list (URL + goal text).
  - For each competitor, Tinyfish Search runs a scoped query; Fetch pulls up to several pages in one batch; OpenAI decides if that evidence is **sufficient** and returns structured JSON + sources, or signals fallback.
  - If fallback: Tinyfish Agent runs the goal on the competitor URL; OpenAI summarizes the agent result.
  - OpenAI synthesizes a final comparison report from all per-competitor summaries.

- **Call counts (web UI, approximate, for N competitors):**
  - OpenAI: **1** plan + **N** sufficiency/summary passes + **1** report → **≥ N + 2** (more if you count only the assessment step as separate from summary for Search+Fetch path).
  - Tinyfish:
    - **N** Search calls (one per competitor, concurrent with throttling implied by Search limits).
    - **≤ N** Fetch calls (batched URLs per request).
    - **≤ N** Agent runs (only when Search+Fetch is insufficient or errors).

- **Orchestration (web app `/api/research`):**
  1. User submits a research question and competitor list.
  2. OpenAI generates a goal per competitor (URL + goal).
  3. Per competitor: Search (`site:<host> <question>`) → Fetch top on-domain URLs → OpenAI assesses sufficiency and structured extraction.
  4. If insufficient: Agent async run + poll to completion.
  5. OpenAI summarizes (Agent path) or uses assessment markdown (Search+Fetch path).
  6. OpenAI generates the comparison report.

---

### 2. Code snippet (TypeScript, Tinyfish SDK)

```typescript
import { TinyFish } from "@tiny-fish/sdk";

const client = new TinyFish();

// Search (scoped query — see route implementation for full URL filtering)
const search = await client.search.query({
  query: "site:example.com pricing plans",
  location: "US",
});

// Fetch up to 10 URLs in one request, markdown for LLMs
const pages = await client.fetch.getContents({
  urls: ["https://example.com/pricing"],
  format: "markdown",
});

// Agent fallback: async queue, then poll with client.runs.get(runId)
const queued = await client.agent.queue({
  url: "https://example.com",
  goal: "Find pricing... Return JSON with sources.",
});
if (queued.run_id) {
  const run = await client.runs.get(queued.run_id);
}
```

---

### 3. Goal (prompt) sent to Tinyfish Agent (fallback path)

**Prompt label:** TinyFish goal (natural language).

**Example:**

```
Visit https://www.notion.com. Find where Notion describes its product features or pricing. Identify the key features mentioned and summarize them with direct references to the page sections you found.

When you find evidence, list the exact source URLs (including child pages you visited) in a "sources" list.
```

---

### 4. Sample output (SSE from `/api/research`)

The UI consumes **Server-Sent Events** with JSON payloads: planning, goals, search/fetch progress, polling, per-competitor results, summaries, and a final markdown report.

```text
data: {"type":"planning","message":"Analyzing your question..."}

data: {"type":"goals","message":"Created 3 research goals","data":[...]}

data: {"type":"submitting","competitor":"Acme","message":"Searching Acme for relevant pages..."}
```

---

## CLI vs web UI

- **Web UI** uses the hybrid Search→Fetch→LLM→Agent fallback pipeline above.
- **CLI** (`cli/scout.mjs`) uses **Tinyfish Agent only** (SDK `agent.queue` + poll) for a simpler, scriptable flow without Search/Fetch in-process.
