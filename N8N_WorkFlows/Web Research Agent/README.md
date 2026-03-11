# Web Research Agent (n8n Workflow) — Setup & Run Guide

Chat with an AI agent that scrapes any website and gives you a summarized report, saved automatically to Notion.

Ask it things like:
- "What do people on Reddit think about Arc browser?"
- "Find pricing for Linear vs Jira vs Asana"
- "What are the top complaints about Notion on Reddit?"

The agent decides where to look, scrapes the page with TinyFish, analyzes the results, and saves a clean report to your Notion workspace.

---

## How it works

```
You (chat message)
  |
  v
Web Agent (LangChain AI Agent)
  |-- uses OpenRouter (Claude Haiku 4.5) for reasoning
  |-- uses TinyFish Web Agent tool for live web scraping
  |
  v
Create Notion Report (saves output as a new Notion page)
```

1. **You ask a question** in the n8n chat UI
2. **The AI agent decides** the best URL and extraction goal based on your question
   - For Reddit questions, it searches `old.reddit.com`
   - For anything else, it constructs the right URL (pricing pages, review sites, docs, etc.)
3. **TinyFish scrapes the page** in stealth mode and returns the raw content
4. **The agent analyzes** the scraped data and produces a concise summary
5. **A Notion page is created** with the full report, titled with your query and the date

---

## Prerequisites

### Accounts / API keys you need

| Service | What for | Get it at |
|---------|----------|-----------|
| **TinyFish** | Web scraping agent | [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |
| **OpenRouter** | LLM access (Claude Haiku 4.5) | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Notion** | Report storage | [notion.so/my-integrations](https://www.notion.so/my-integrations) |

### Software

- **n8n** (Desktop, Docker, or Cloud) — see [n8n docs](https://docs.n8n.io/) if you need help installing
- **n8n-nodes-tinyfish** community node (installed inside n8n)

---

## 1) Install & open n8n

### Option A — n8n Desktop (easiest)

1. Download and install n8n Desktop
2. Open it — n8n runs at `http://localhost:5678`

### Option B — Docker

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Then open `http://localhost:5678`.

---

## 2) Install the TinyFish community node

1. In n8n, go to **Settings > Community Nodes**
2. Click **Install**
3. Enter: `n8n-nodes-tinyfish`
4. Install and restart n8n if prompted

---

## 3) Import the workflow

1. In n8n, click **Workflows > Import from file**
2. Select `Web Research Agent via Tinyfish.json`
3. Click **Save**

You should see 4 nodes on the canvas:
- **When chat message received** (trigger)
- **Web Agent** (LangChain AI agent)
- **OpenRouter Chat Model** + **TinyFish Web Agent** (connected as sub-nodes)
- **Create Notion Report** (output)

---

## 4) Set up credentials

### 4.1 TinyFish

1. Go to **Credentials > New**
2. Search for **TinyFish Web Agent**
3. Paste your TinyFish API key
4. Save
5. Open the workflow and assign this credential to the **TinyFish Web Agent** node

### 4.2 OpenRouter

1. **Credentials > New**
2. Search for **OpenRouter**
3. Paste your OpenRouter API key
4. Save
5. Assign to the **OpenRouter Chat Model** node

> The workflow defaults to `anthropic/claude-haiku-4.5`. You can change the model in the node settings — OpenRouter supports hundreds of models.

### 4.3 Notion

1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations)
2. Click **New integration**
3. Give it a name (e.g., "n8n Web Research")
4. Copy the **Internal Integration Secret**
5. In Notion, open the parent page where you want reports saved
6. Click **...** > **Connections** > add your integration
7. In n8n: **Credentials > New > Notion API**
8. Paste the integration secret
9. Save and assign to the **Create Notion Report** node
10. Update the **Page ID** in the node to point to your own Notion page

---

## 5) Running the workflow

1. Open the workflow in n8n
2. Click **Execute workflow** (or toggle **Active** to keep it running)
3. The n8n chat panel opens — type your question:

```
What do people on Reddit think about Cursor IDE?
```

4. The agent will:
   - Decide to search Reddit for "Cursor IDE"
   - Call TinyFish to scrape the search results
   - Summarize the findings
   - Save a report to Notion

5. You'll see the response in the chat and a new page in your Notion workspace

---

## Example queries

| Query | What happens |
|-------|-------------|
| "What does Reddit think about Supabase vs Firebase?" | Scrapes Reddit search, summarizes community sentiment |
| "Find pricing for Vercel Pro vs Netlify Pro" | Visits pricing pages and compares plans |
| "What are common complaints about Slack on Reddit?" | Searches Reddit for Slack complaints, categorizes themes |
| "Summarize the top posts on Hacker News right now" | Scrapes Hacker News front page |

---

## Customization ideas

- **Change the LLM**: Swap `anthropic/claude-haiku-4.5` for any model on OpenRouter (GPT-4o, Llama, Mistral, etc.)
- **Change the output**: Replace the Notion node with Slack, Google Sheets, email, or any other n8n node
- **Add memory**: Attach an n8n memory node to the agent for multi-turn conversations
- **Adjust the system prompt**: Edit the Web Agent's system message to change behavior, output format, or target sites

---

## Troubleshooting

### "TinyFish returned no data"

- The site may be blocking scraping — try a different URL or query
- Check your TinyFish API key is valid and has remaining credits

### Notion page not created

- Make sure your integration is connected to the parent page in Notion
- Verify the Page ID in the **Create Notion Report** node matches your workspace

### OpenRouter errors

- Check your API key and account balance at [openrouter.ai](https://openrouter.ai)
- Some models may have rate limits — try a different model if one fails

---

## Quick checklist before first run

- [ ] Workflow imported
- [ ] TinyFish credential added and assigned
- [ ] OpenRouter credential added and assigned
- [ ] Notion integration created and connected to parent page
- [ ] Notion Page ID updated in the Create Notion Report node
- [ ] Test with a simple query like "What is TinyFish?"
