---
name: use-tinyfish
description: Use TinyFish web agent to extract/scrape websites, extract data, and automate browser actions using natural language. Use when you need to extract/scrape data from websites, handle bot-protected sites, or automate web tasks.
---

# TinyFish — Web Extraction & Automation via CLI

You have access to the TinyFish CLI (`tinyfish`), a tool that runs browser automations from the terminal using natural language goals.

## Pre-flight Check (REQUIRED)

Before making any TinyFish call, always run BOTH checks:

**1. CLI installed?**
```bash
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"
```

If not installed, stop and tell the user:
> Install the TinyFish CLI: `npm install -g @tiny-fish/cli`

**2. Authenticated?**
```bash
tinyfish auth status
```

If not authenticated, stop and tell the user:

> You need a TinyFish API key. Get one at: https://agent.tinyfish.ai/api-keys
>
> Then authenticate:
>
> **Option 1 — CLI login (interactive):**
> ```
> tinyfish auth login
> ```
>
> **Option 2 — Environment variable (CI/CD):**
> ```
> export TINYFISH_API_KEY="your-key-here"
> ```
>
> **Option 3 — Claude Code settings:** Add to `~/.claude/settings.local.json`:
> ```json
> {
>   "env": {
>     "TINYFISH_API_KEY": "your-key-here"
>   }
> }
> ```

Do NOT proceed until both checks pass.

---

## Core Command

```bash
tinyfish agent run --url <url> "<goal>"
```

### Flags

| Flag | Purpose |
|------|---------|
| `--url <url>` | Target website URL |
| `--sync` | Wait for full result (no streaming) |
| `--async` | Submit and return immediately |
| `--pretty` | Human-readable formatted output |

Default behavior streams SSE step-by-step progress as JSON to stdout.

---

## Best Practices

- **Specify JSON format in the goal**: Always describe the exact structure you want returned.
- **Parallel calls**: When extracting from multiple independent sites, make separate parallel CLI calls instead of combining into one goal.
- **Match the user's language**: Respond in whatever language the user is writing in.

---

## Usage Patterns

### Basic Extract / Scrape

Extract data from a page. Specify the JSON structure you want:

```bash
tinyfish agent run --url "https://example.com" \
  "Extract product info as JSON: {\"name\": str, \"price\": str, \"in_stock\": bool}"
```

### Multiple Items

Extract lists of data with explicit structure:

```bash
tinyfish agent run --url "https://example.com/products" \
  "Extract all products as JSON array: [{\"name\": str, \"price\": str, \"url\": str}]"
```

### Multi-Step Automation

For tasks that require interaction (clicking, filling forms, navigating):

```bash
tinyfish agent run --url "https://example.com/search" \
  "Search for 'wireless headphones', apply filter for price under $50, extract the top 5 results as JSON: [{\"name\": str, \"price\": str, \"rating\": str}]"
```

### Sync Mode (Wait for Full Result)

When you need the complete result before proceeding:

```bash
tinyfish agent run --sync --url "https://example.com" \
  "Extract the main heading and page description as JSON: {\"heading\": str, \"description\": str}"
```

### Pretty Output

For human-readable output when presenting directly to the user:

```bash
tinyfish agent run --pretty --url "https://example.com" \
  "Extract all navigation links as JSON: [{\"text\": str, \"href\": str}]"
```

---

## Parallel Extraction

When extracting from multiple independent sources, make separate parallel CLI calls. Do NOT combine into one goal.

**Good — Parallel calls (run these simultaneously):**

```bash
tinyfish agent run --url "https://pizzahut.com" \
  "Extract pizza prices as JSON: [{\"name\": str, \"price\": str}]"

tinyfish agent run --url "https://dominos.com" \
  "Extract pizza prices as JSON: [{\"name\": str, \"price\": str}]"
```

**Bad — Single combined call:**

```bash
# Don't do this — less reliable and slower
tinyfish agent run --url "https://pizzahut.com" \
  "Extract prices from Pizza Hut and also go to Dominos..."
```

Each independent extraction task should be its own CLI call. This is faster (parallel execution) and more reliable.

---

## Output

The CLI streams `data: {...}` SSE lines by default. The final result is the event where `type == "COMPLETE"` and `status == "COMPLETED"` — the extracted data is in the `resultJson` field. Read the raw output directly; no script-side parsing is needed.

---

## Managing Runs

```bash
# List recent runs
tinyfish agent run list

# Get a specific run by ID
tinyfish agent run get <run_id>

# Cancel a running automation
tinyfish agent run cancel <run_id>
```
