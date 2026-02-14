# Product Description

## Product Name

Competitor Research CLI

## The Why

Teams waste time manually checking competitor sites for feature changes and market signals. This CLI lets you set a list of competitors once, then ask natural‑language questions as your project evolves. The tool dispatches Tinyfish (Mino) web agents to each competitor site, gathers evidence, and returns a structured report that can inform product decisions without the manual research overhead.

---

## PRD

### 1. Product Architecture Overview

- **Overview:**  
  The system has a CLI/GUI front end, a planning layer (OpenAI), and an execution layer (Tinyfish/Mino). The planner translates a user question into per‑competitor browsing goals. The executor runs those goals and returns raw results. A summarizer turns results into per‑competitor findings and a comparison report.

- **APIs called:**
  - **OpenAI Chat Completions**: planning goals, summarizing each competitor, and generating the comparison report.
  - **Tinyfish (Mino) Web Agent API**: executes browsing goals for each competitor URL.

- **Relationship between APIs:**
  - OpenAI creates the goal list.
  - Tinyfish runs those goals and returns raw results.
  - OpenAI summarizes each raw result and synthesizes a final report.

- **Call counts (for N competitors):**
  - OpenAI:
    - 1 call to create goals
    - N calls to summarize each competitor
    - 1 call to generate the comparison report  
    **Total: N + 2**
  - Tinyfish:
    - 1 run per competitor  
    **Total: N**

- **Orchestration:**
  1. User submits a research question.
  2. OpenAI generates a goal per competitor (URL + goal).
  3. Tinyfish runs each goal asynchronously.
  4. Results are polled until completed.
  5. OpenAI summarizes each result and produces a final report.

### 2. Code Snippet (TypeScript)

```typescript
type Goal = { competitor_name: string; competitor_url: string; goal: string };

async function openaiPlanGoals(question: string, competitors: { name: string; url: string }[]) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "Create web research goals per competitor." },
        { role: "user", content: `Question: ${question}\nCompetitors: ${JSON.stringify(competitors)}` },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const data = await res.json();
  return (JSON.parse(data.choices[0].message.content).goals || []) as Goal[];
}

async function submitMinoRun(url: string, goal: string) {
  const res = await fetch("https://agent.tinyfish.ai/v1/automation/run-async", {
    method: "POST",
    headers: {
      "X-API-Key": process.env.TINYFISH_API_KEY!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, goal }),
  });
  const data = await res.json();
  return data.run_id as string;
}
```

### 3. Goal (Prompt) Sent to Mino

**Prompt label:**
`Mino Goal`

**Exact goal example:**
```
Visit https://www.notion.com. Find where Notion describes its product features or pricing. Identify the key features mentioned and summarize them with direct references to the page sections you found.
```

### 4. Sample Output (Streaming JSON)

```
data: {"run_id":"run_2f8a...","status":"RUNNING","progress":"Navigating to /pricing"}

data: {"run_id":"run_2f8a...","status":"RUNNING","progress":"Extracting feature list"}

data: {"run_id":"run_2f8a...","status":"COMPLETED","result":{"features":["AI writing assistant","Collaborative docs","Database views"],"sources":["/pricing","/features"]}}
```
