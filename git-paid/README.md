# GitPaid — OSS Bounty & Grant Finder

> Find paid open-source work across bounty platforms, GitHub repos, and grant foundations — powered by a 3-tier TinyFish agent system.

---
**Live Link**: https://git-paid.onrender.com/

## What is GitPaid?

GitPaid aggregates paid open-source opportunities into a single real-time feed. Instead of manually checking Algora, IssueHunt, GitHub issues, and foundation websites separately, GitPaid runs all of them concurrently using TinyFish web agents and streams results live into the UI.

---

## Architecture

GitPaid runs three tiers of agents simultaneously:

```
User selects: stack=Rust, keywords=async, min=$100

┌─────────────────────────────────────────────────────────────┐
│ TIER 1 — Bounty Aggregator Platforms                        │
│  Algora · IssueHunt · Gitcoin · Bountysource               │
│  Scrape platforms that already curate bounties              │
└─────────────────────────────────────────────────────────────┘
                     concurrently ▼
┌─────────────────────────────────────────────────────────────┐
│ TIER 2 — Awesome List → Repo Fan-Out                        │
│  Stage 1: scrape awesome-rust → discover top 25 repos      │
│  Stage 2: 20 parallel agents check bounty-labelled issues  │
└─────────────────────────────────────────────────────────────┘
                     concurrently ▼
┌─────────────────────────────────────────────────────────────┐
│ TIER 3 — Grant Programs (always runs)                       │
│  NLNet · Sovereign Tech Fund · Mozilla MOSS                 │
│  LFX Mentorship · Google Summer of Code · Outreachy        │
└─────────────────────────────────────────────────────────────┘
                           │
                           ▼
              FastAPI SSE stream → Real-time UI
```

### Why 3 tiers?

| Tier | Method | Signal Quality | Speed |
|------|--------|---------------|-------|
| T1 · Aggregators | Scrape platforms that already index bounties | Highest — curated | Fast |
| T2 · Repo Discovery | Awesome list → GitHub issues fan-out | High — top repos only | Medium |
| T3 · Grants | Fixed list of foundation open-call pages | Perfect — finite known list | Fast |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+ · FastAPI · Uvicorn |
| Agent API | TinyFish Python SDK (`pip install tinyfish`) |
| Streaming | Server-Sent Events (SSE) |
| Frontend | Vanilla HTML · CSS · JavaScript |
| Config | python-dotenv |

---

## Supported Stacks

Rust · Go · Python · TypeScript · JavaScript · C++ · Java · Zig · Elixir · Swift · Ruby · Haskell

---

## Quick Start

### 1. Install dependencies

```bash
pip install -r requirements.txt
```

### 2. Set up your API key

Get your TinyFish API key at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys)

```bash
cp .env.example .env
# Edit .env and add your key
```

```env
TINYFISH_API_KEY=your_key_here
```

### 3. Run

```bash
python main.py
```

Open **http://localhost:8000**

---

## Project Structure

```
gitpaid/
├── main.py           # FastAPI server — serves frontend + /api/search SSE route
├── agents.py         # 3-tier TinyFish agent orchestration
├── models.py         # Pydantic models for requests and SSE events
├── requirements.txt
├── .env.example      # Copy to .env and add your API key
├── .gitignore
├── README.md
└── static/
    └── index.html    # Dark-themed frontend (single file, no build step)
```

---

## How It Works

### Real-time Streaming

Results appear in the UI as each agent completes — there is no waiting for all sources to finish. The frontend opens an SSE stream to `/api/search` and processes events as they arrive.

### SSE Event Types

| Event | Payload | When |
|-------|---------|------|
| `sources` | Array of all agent source metadata | Once at start |
| `agent_started` | `source_id` | T1/T3 agent begins |
| `agent_complete` | `source_id`, `count`, `opportunities[]` | T1/T3 agent finishes |
| `agent_error` | `source_id`, `error` | T1/T3 agent fails |
| `tier2_status` | `phase`, `total`, `lang` | T2 phase changes |
| `tier2_repo_done` | `repo`, `count`, `scanned`, `total`, `opportunities[]` | Each T2 repo checked |
| `done` | — | All agents finished |

### Relevance Filtering

Results are filtered at two levels:
1. **Prompt level** — TinyFish is instructed to only return results relevant to the selected stack
2. **Post-parse level** — A keyword filter drops any result that mentions an unrelated language/stack

---

## Grant Programs

| Program | Organisation | Max Funding | Focus |
|---------|-------------|-------------|-------|
| NLNet / NGI Zero | NLNet Foundation | €50,000 | Privacy, security, open internet |
| Sovereign Tech Fund | German Government | €250,000 | Digital infrastructure |
| Mozilla MOSS | Mozilla Foundation | ~$10,000 | Web, security, privacy |
| LFX Mentorship | Linux Foundation | ~$6,600 | Any open source |
| Google Summer of Code | Google | ~$6,000 | Any open source |
| Outreachy | Software Freedom Conservancy | $7,000 | Underrepresented contributors |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `TINYFISH_API_KEY` | ✅ Yes | Your TinyFish API key |

---

## Diagnostic Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /health` | Check server status and API key configuration |
| `GET /api/test-agent` | Fire a single TinyFish agent to verify connectivity |

---

## Extension Ideas

- Add **Pot.app** and **Open Collective** as Tier 1 sources
- Cache awesome-list repo URLs for 24h (skip T2 discovery on repeat searches)
- Add bounty label aliases: `$$$`, `💰`, `paid`, `reward`
- **Slack/Discord webhook** — post new matches to a channel automatically
- **Resume parser** — paste your CV and auto-extract your stack
- **MCP integration** — expose as a TinyFish MCP tool for Claude/Cursor inline search

---

## License

MIT — see [LICENSE](LICENSE)

---
