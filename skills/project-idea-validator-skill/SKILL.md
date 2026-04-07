---
name: project-idea-validator
description: Researches any project idea against live data from GitHub and Dev.to to surface what already exists, how mature the space is, and where the real opportunity lives. Use when a developer describes something they want to build and wants to know if it's been done before. Triggers on phrases like "validate my idea", "has this been built", "is this already a thing", "what exists for X", "should I build this", "is this idea original", "check if my project exists", "what are the alternatives to what I want to build", "is the market saturated for X", or any request to research the competitive landscape before starting a project.
---

# Project Idea Validator — Discover What Already Exists Before You Build

You have access to the TinyFish CLI (`tinyfish`), a tool that runs browser automations from the terminal using natural language goals. This skill uses it to search GitHub and Dev.to in parallel, then synthesizes results into a gap analysis report.

## Pre-flight Check (REQUIRED)

Before making any TinyFish call, always run BOTH checks:

**1. CLI installed?**

PowerShell:
```powershell
Get-Command tinyfish; tinyfish --version
```
bash/zsh:
```bash
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"
```

If not installed, stop and tell the user:
> Install the TinyFish CLI: `npm install -g @tiny-fish/cli`

**2. Authenticated?**

```powershell
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
> **Option 2 — PowerShell (current session only):**
> ```powershell
> $env:TINYFISH_API_KEY="sk-tinyfish-k7KpC3TypJEAwK4j1yN0Ww7yB8h7VPLg"
> ```
>
> **Option 3 — PowerShell (persist across sessions):**
> ```powershell
> [System.Environment]::SetEnvironmentVariable("TINYFISH_API_KEY", "sk-tinyfish-k7KpC3TypJEAwK4j1yN0Ww7yB8h7VPLg", "User")
> ```
> Then close and reopen PowerShell for it to take effect.
>
> **Option 4 — bash/zsh (Mac/Linux):**
> ```bash
> export TINYFISH_API_KEY="sk-tinyfish-k7KpC3TypJEAwK4j1yN0Ww7yB8h7VPLg"
> ```
>
> **Option 5 — Claude Code settings:** Add to `~/.claude/settings.local.json`:
> ```json
> {
>   "env": {
>     "TINYFISH_API_KEY": "sk-tinyfish-k7KpC3TypJEAwK4j1yN0Ww7yB8h7VPLg"
>   }
> }
> ```

Do NOT proceed until both checks pass.

---

## What This Skill Does

Given a project idea (e.g. *"a CLI tool that converts Figma designs to Tailwind components"*), this skill:

1. Searches **GitHub** for existing repos with similar purpose, tech stack, or keywords
2. Searches **Dev.to** for articles, tutorials, or project showcases covering the same problem

It then synthesizes findings into a structured gap analysis: what exists, how mature it is, and where the opportunity still lives.

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

---

## Step-by-Step Workflow

### Step 1 — Search GitHub

Search for existing repositories matching the idea. Run with `--sync` since you need the full list before synthesizing.

```bash
tinyfish agent run --sync --url "https://github.com/search?q=<keywords>&type=repositories&s=stars&o=desc" \
  "Extract the top 10 search results as JSON: [{\"name\": str, \"owner\": str, \"description\": str, \"stars\": str, \"url\": str, \"last_updated\": str}]"
```

**Example for a Figma-to-Tailwind CLI idea:**
```bash
tinyfish agent run --sync \
  --url "https://github.com/search?q=figma+tailwind+cli&type=repositories&s=stars&o=desc" \
  "Extract the top 10 repositories as JSON: [{\"name\": str, \"owner\": str, \"description\": str, \"stars\": str, \"url\": str, \"last_updated\": str}]"
```

---

### Step 2 — Search Dev.to

Search for articles and project posts covering the same problem space. Run in parallel with Step 1 results processing.

```bash
tinyfish agent run --sync --url "https://dev.to/search?q=<keywords>" \
  "Extract the top 10 articles as JSON: [{\"title\": str, \"author\": str, \"tags\": [str], \"published_at\": str, \"url\": str, \"reactions\": str}]"
```

**Example:**
```bash
tinyfish agent run --sync \
  --url "https://dev.to/search?q=figma+tailwind+component+generator" \
  "Extract the top 10 articles as JSON: [{\"title\": str, \"author\": str, \"tags\": [str], \"published_at\": str, \"url\": str, \"reactions\": str}]"
```

---

## Parallel Execution

Steps 1 and 2 are independent — run them at the same time. Do NOT wait for GitHub before starting Dev.to.

**Good — Parallel calls:**
```bash
# Fire both simultaneously
tinyfish agent run --sync --url "https://github.com/search?q=<keywords>&type=repositories&s=stars&o=desc" \
  "Extract top 10 repositories as JSON: [{\"name\": str, \"owner\": str, \"description\": str, \"stars\": str, \"url\": str, \"last_updated\": str}]" &

tinyfish agent run --sync --url "https://dev.to/search?q=<keywords>" \
  "Extract top 10 articles as JSON: [{\"title\": str, \"author\": str, \"url\": str, \"reactions\": str}]" &

wait
```

**Bad — Sequential calls:**
```bash
# Don't do this — wastes time and gives the same results
tinyfish agent run --url "https://github.com/..." "...also search Dev.to..."
```

Each source is its own call. Always.

---

## Step 3 — Synthesize Into a Gap Analysis

Once both sources return results, synthesize findings into this structure:

```
## Project Idea Validation: <idea title>

### What Already Exists
- <project/article> — <what it does, stars/reactions, last active>
- ...

### Maturity Assessment
- GitHub: <active / abandoned / fragmented>
- Dev.to coverage: <heavy / moderate / sparse>

### Gaps & Opportunities
- <specific gap #1>
- <specific gap #2>
- ...

### Verdict
<1–2 sentences: is the space crowded, open, or ripe for a better take?>
```

Use the raw JSON from both sources as input. Do not hallucinate repo names, star counts, or article titles — only use what TinyFish returned.

---

## Keyword Strategy

The quality of results depends heavily on your search terms. Before running, derive 2–3 keyword variants from the idea:

| Idea | Primary keywords | Variant keywords |
|------|-----------------|-----------------|
| Figma-to-Tailwind CLI | `figma tailwind cli` | `figma css export`, `design token tailwind` |
| AI code review bot | `ai code review github` | `llm pull request`, `automated code feedback` |
| Markdown-to-Notion sync | `markdown notion sync` | `notion import cli`, `notion api markdown` |

Run separate parallel calls for each variant if the first pass returns sparse results.

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

---

## Output

The CLI streams `data: {...}` SSE lines by default. The final result is the event where `type == "COMPLETE"` and `status == "COMPLETED"` — the extracted data is in the `resultJson` field. Read the raw output directly; no script-side parsing is needed.
