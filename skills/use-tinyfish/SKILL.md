---
name: use-tinyfish
description: Use TinyFish web agent to extract/scrape websites, extract data, and automate browser actions using natural language. Use when you need to extract/scrape data from websites, handle bot-protected sites, or automate web tasks.
---

# TinyFish CLI

You have access to the TinyFish CLI (`tinyfish`) — a suite of web tools you can call from the terminal.

If not installed: `npm install -g @tiny-fish/cli`
If not authenticated: `tinyfish auth login` or set `TINYFISH_API_KEY` env var. Keys at https://agent.tinyfish.ai/api-keys

---

## Picking the Right Tool

TinyFish has four tools. Start with the lightest one that can do the job and escalate only when needed.

```
search  →  fetch  →  agent  →  browser
lightest                        heaviest
```

| Tool | When to use | Speed | Cost |
|------|-------------|-------|------|
| **search** | You need to find URLs or get a quick answer about a topic | Fastest | Lowest |
| **fetch** | You have URLs and need their clean content (articles, docs, product pages) | Fast | Low |
| **agent** | You need to interact with a page — click, fill forms, navigate, extract structured data from dynamic sites | Slower | Higher |
| **browser** | Agent isn't enough — you need raw programmatic browser control via CDP | Slowest | Highest |

### Common Patterns

**Research: search → fetch**
Search for a topic, then fetch the best results to read their full content.

```bash
# 1. Find URLs
tinyfish search query "best React state management libraries 2026"

# 2. Read the top results
tinyfish fetch content get --format markdown "https://result1.com" "https://result2.com"
```

**Deep extraction: search → agent**
Search to find the right site, then use agent to interact with it and extract structured data.

```bash
# 1. Find the site
tinyfish search query "Nike running shoes official store"

# 2. Automate extraction on it
tinyfish agent run --url "https://nike.com/running" \
  "Extract all running shoes as JSON: [{\"name\": str, \"price\": str, \"colors\": [str]}]"
```

**Escalation: fetch → agent**
Try fetch first. If the page is dynamic/JS-heavy and fetch returns empty or incomplete content, escalate to agent.

**Full control: agent → browser**
If agent can't handle a complex multi-step workflow, spin up a raw browser session and automate it yourself via CDP.

---

## Commands

### `tinyfish search query`

Web search. Returns ranked results with titles, URLs, and snippets.

```bash
tinyfish search query "<query>" [--location <hint>] [--language <hint>] [--pretty]
```

- Returns 10 results by default
- Use `--location` and `--language` for geo-targeted results
- Default output is JSON; `--pretty` for human-readable

```bash
tinyfish search query "best pho in Ho Chi Minh City" --location "Vietnam" --language "en"
```

---

### `tinyfish fetch content get`

Fetch clean, extracted content from one or more URLs. Strips ads, nav, boilerplate — returns just the content.

```bash
tinyfish fetch content get <urls...> [--format markdown|html|json] [--links] [--image-links] [--pretty]
```

- Accepts **multiple URLs** in a single call — they are fetched in parallel server-side
- `--format markdown` (default) — clean readable text
- `--format json` — structured document tree
- `--links` — include all extracted links from the page
- `--image-links` — include extracted image URLs
- Response includes: `url`, `final_url`, `title`, `language`, `author`, `published_date`, `text`, `latency_ms`

```bash
# Fetch one page as markdown
tinyfish fetch content get --format markdown "https://example.com/article"

# Fetch multiple pages with links
tinyfish fetch content get --links "https://site-a.com" "https://site-b.com" "https://site-c.com"
```

---

### `tinyfish agent run`

Run a browser automation using a natural language goal. The agent opens a real browser, navigates, clicks, fills forms, and extracts data.

```bash
tinyfish agent run --url <url> "<goal>" [--sync] [--async] [--pretty]
```

| Flag | Purpose |
|------|---------|
| `--url <url>` | Target URL (bare hostnames get `https://` auto-prepended) |
| `--sync` | Wait for full result without streaming steps |
| `--async` | Submit and return immediately |
| `--pretty` | Human-readable output |

**Output:** Default streams `data: {...}` SSE lines. The final result is the event where `type == "COMPLETE"` and `status == "COMPLETED"` — the extracted data is in the `resultJson` field. Read the raw output directly; no script-side parsing is needed.

**Always specify the JSON structure you want in the goal:**

```bash
tinyfish agent run --url "https://example.com/products" \
  "Extract all products as JSON array: [{\"name\": str, \"price\": str, \"url\": str}]"

tinyfish agent run --url "https://example.com/search" \
  "Search for 'wireless headphones', filter under $50, extract top 5 as JSON: [{\"name\": str, \"price\": str, \"rating\": str}]"
```

**Parallel extraction — when hitting multiple independent sites, make separate calls. Do NOT combine into one goal.**

Good — parallel calls (run simultaneously):
```bash
tinyfish agent run --url "https://pizzahut.com" \
  "Extract pizza prices as JSON: [{\"name\": str, \"price\": str}]"

tinyfish agent run --url "https://dominos.com" \
  "Extract pizza prices as JSON: [{\"name\": str, \"price\": str}]"
```

Bad — single combined call:
```bash
# Don't do this — less reliable and slower
tinyfish agent run --url "https://pizzahut.com" \
  "Extract prices from Pizza Hut and also go to Dominos..."
```

**Managing runs:**

```bash
tinyfish agent run list [--status PENDING|RUNNING|COMPLETED|FAILED|CANCELLED] [--limit N]
tinyfish agent run get <run_id>
tinyfish agent run cancel <run_id>
```

**Batch operations** — submit many runs from a CSV file (`url,goal` columns):

```bash
tinyfish agent batch run --input runs.csv
tinyfish agent batch list
tinyfish agent batch get <batch_id>
tinyfish agent batch cancel <batch_id>
```

---

### `tinyfish browser session create`

Spin up a remote browser instance. Returns a CDP WebSocket URL for programmatic control.

```bash
tinyfish browser session create [--url <url>] [--pretty]
```

- `--url` optionally navigates to a page after creation
- Returns `session_id`, `cdp_url` (WebSocket), and `base_url`
- Use the `cdp_url` with Playwright, Puppeteer, or any CDP client

```bash
tinyfish browser session create --url "https://example.com"
# Returns: { session_id, cdp_url: "wss://...", base_url: "https://..." }
```

---

## General Notes

- **Match the user's language**: Respond in whatever language the user writes in.
- All commands support `--pretty` for human-readable output. Default is JSON.
- Use `--debug` on the root command or set `TINYFISH_DEBUG=1` to log HTTP requests to stderr.
