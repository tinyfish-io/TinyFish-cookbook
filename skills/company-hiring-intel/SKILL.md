---
name: company-hiring-intelligence
description: Reverse-engineer what a company is building by scraping their job postings, careers page, LinkedIn Jobs, and engineering blog using TinyFish web agents. Use whenever a user wants to understand a company's strategic direction from hiring signals, do competitive intelligence, figure out a tech stack from job descriptions, or evaluate whether a company is worth joining. Trigger on "what is [company] building", "what is [company] hiring for", "competitive intelligence", "[company] jobs", "should I join [company]", "hiring signals", "what teams are growing", "reverse engineer roadmap", or any request to understand a company's direction from public hiring activity. Always use this skill for company intelligence rather than guessing from memory. Also trigger when someone names a company and asks about strategy, tech stack, or org structure.
---

# Company Hiring Intelligence — Reverse-Engineer What a Company Is Building From Their Job Postings

You have access to the TinyFish CLI (`tinyfish`), a tool that runs browser automations from the terminal using natural language goals. This skill uses it to scrape a company's careers page, LinkedIn Jobs, and engineering blog in parallel, then synthesizes the raw hiring data into a strategic intelligence report.

A company quietly posting eight ML infra roles and two vector database engineers is telling you something. This skill reads those signals.

---

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
> **Option 2 — bash/zsh (Mac/Linux):**
> ```bash
> export TINYFISH_API_KEY="your-key-here"
> ```
>
> **Option 3 — PowerShell (current session only):**
> ```powershell
> $env:TINYFISH_API_KEY="your-key-here"
> ```
>
> **Option 4 — PowerShell (persist across sessions):**
> ```powershell
> [System.Environment]::SetEnvironmentVariable("TINYFISH_API_KEY", "your-key-here", "User")
> ```
> Then close and reopen PowerShell.
>
> **Option 5 — Claude Code settings:** Add to `~/.claude/settings.local.json`:
> ```json
> {
>   "env": {
>     "TINYFISH_API_KEY": "your-key-here"
>   }
> }
> ```

Do NOT proceed until both checks pass.

---

## What This Skill Does

Given a company name (e.g. *"Notion"* or *"Mistral AI"*), this skill:

1. Scrapes the **company careers page** for all open roles — titles, teams, locations, and posting dates
2. Scrapes **LinkedIn Jobs** for the same company to cross-reference postings and surface duplicates or long-unfilled roles
3. Scrapes the company's **engineering blog** (if one exists) for recent technical posts that signal architectural direction

It then synthesizes all three into a structured intelligence report: which bets the company is making, which problems they haven't solved yet (chronic open roles), and which technologies are becoming load-bearing.

---

## Core Command

```bash
tinyfish agent run --sync --url <url> "<goal>"
```

### Key Flags

| Flag | Purpose |
|------|---------|
| `--url <url>` | Target URL to navigate to |
| `--sync` | Block until result is complete (required here — you need all data before synthesizing) |
| `--pretty` | Human-readable output for debugging |

---

## Step-by-Step Workflow

### Step 0 — Resolve the URLs

Before running agents, determine the three target URLs for the company:

| Source | How to find it |
|--------|---------------|
| Careers page | Usually `<company>.com/careers` or `<company>.com/jobs`. If unclear, search `"<company name>" careers site:company.com` first. |
| LinkedIn Jobs | Always: `https://www.linkedin.com/jobs/search/?keywords=<company+name>&f_C=<company_id>` — or simpler: `https://www.linkedin.com/company/<company-slug>/jobs/` |
| Engineering blog | Common patterns: `eng.<company>.com`, `<company>.com/blog/engineering`, `<company>.tech`, or search `"<company name>" engineering blog` |

If you cannot confidently resolve a URL, run a quick web search before proceeding. Do not guess.

---

### Step 1 — Scrape the Careers Page

```bash
tinyfish agent run --sync \
  --url "<company_careers_url>" \
  "Extract all visible job postings as JSON. For each role include: {\"title\": str, \"team\": str, \"location\": str, \"posted_date\": str, \"url\": str}. If pagination exists, navigate through all pages and collect every role before returning."
```

**Example for Notion:**
```bash
tinyfish agent run --sync \
  --url "https://www.notion.so/careers" \
  "Extract all visible job postings as JSON. For each role include: {\"title\": str, \"team\": str, \"location\": str, \"posted_date\": str, \"url\": str}. Navigate through all pages and collect every role."
```

---

### Step 2 — Scrape LinkedIn Jobs

```bash
tinyfish agent run --sync \
  --url "https://www.linkedin.com/company/<company-slug>/jobs/" \
  "Extract the top 25 job postings as JSON: [{\"title\": str, \"location\": str, \"posted_date\": str, \"seniority_level\": str, \"employment_type\": str, \"url\": str}]. If you encounter a login prompt, scroll past it or dismiss it and continue scraping the visible listings."
```

**Why LinkedIn matters:** LinkedIn shows `posted_date` more reliably and surfaces roles that have been reposted — a role listed as "Posted 3 weeks ago" that you saw listed on the careers page as "Posted 6 months ago" is a chronic open role, which signals either a hard-to-fill skill set or a team under construction.

---

### Step 3 — Scrape the Engineering Blog

```bash
tinyfish agent run --sync \
  --url "<engineering_blog_url>" \
  "Extract the 10 most recent blog posts as JSON: [{\"title\": str, \"author\": str, \"published_date\": str, \"url\": str, \"summary\": str (one sentence describing the technical topic)}]. Focus only on engineering or technical posts; skip product announcements or company news."
```

If no engineering blog exists, skip this step and note it in the report.

---

## Parallel Execution

All three sources are independent — run them simultaneously. Do NOT wait for one to finish before starting the next.

**bash/zsh — Parallel execution:**
```bash
# Fire all three simultaneously
tinyfish agent run --sync \
  --url "<careers_url>" \
  "Extract all job postings as JSON: [{\"title\": str, \"team\": str, \"location\": str, \"posted_date\": str, \"url\": str}]" \
  > /tmp/careers_results.json &

tinyfish agent run --sync \
  --url "https://www.linkedin.com/company/<slug>/jobs/" \
  "Extract top 25 job postings as JSON: [{\"title\": str, \"location\": str, \"posted_date\": str, \"seniority_level\": str, \"url\": str}]" \
  > /tmp/linkedin_results.json &

tinyfish agent run --sync \
  --url "<eng_blog_url>" \
  "Extract the 10 most recent engineering posts as JSON: [{\"title\": str, \"published_date\": str, \"url\": str, \"summary\": str}]" \
  > /tmp/blog_results.json &

wait  # Block until all three finish

cat /tmp/careers_results.json /tmp/linkedin_results.json /tmp/blog_results.json
```

**PowerShell — Parallel execution:**
```powershell
$careersJob = Start-Job {
    tinyfish agent run --sync `
      --url "<careers_url>" `
      "Extract all job postings as JSON: [{`"title`": str, `"team`": str, `"location`": str, `"posted_date`": str, `"url`": str}]"
}

$linkedinJob = Start-Job {
    tinyfish agent run --sync `
      --url "https://www.linkedin.com/company/<slug>/jobs/" `
      "Extract top 25 job postings as JSON: [{`"title`": str, `"location`": str, `"posted_date`": str, `"seniority_level`": str, `"url`": str}]"
}

$blogJob = Start-Job {
    tinyfish agent run --sync `
      --url "<eng_blog_url>" `
      "Extract 10 most recent engineering posts as JSON: [{`"title`": str, `"published_date`": str, `"url`": str, `"summary`": str}]"
}

Wait-Job $careersJob, $linkedinJob, $blogJob | Out-Null

$careersResults  = Receive-Job $careersJob
$linkedinResults = Receive-Job $linkedinJob
$blogResults     = Receive-Job $blogJob

Remove-Job $careersJob, $linkedinJob, $blogJob
```

---

## Step 4 — Extract Hiring Patterns Before Synthesizing

Before writing the report, run these four analyses against the raw JSON data. These are the signal extraction steps — the report is only as good as what you pull out here.

### 4a — Team Velocity (which teams are growing fastest?)
Group all roles by `team` field. Count roles per team. Rank by count descending. Teams with 4+ open roles are in active build-out.

### 4b — Technology Frequency (what tech keeps appearing in titles and descriptions?)
Scan all role titles for technology keywords: language names, frameworks, infrastructure tools, data systems, ML/AI terms. Count occurrences. Any technology appearing in 3+ role titles is becoming load-bearing.

Common signals to watch for:

| Signal | What it likely means |
|--------|---------------------|
| 3+ "ML Platform" or "ML Infra" roles | Building internal model training/serving infrastructure |
| 2+ "Vector DB" or "Embeddings" engineers | RAG pipeline or semantic search product in progress |
| Cluster of "Data Mesh" / "Data Platform" roles | Migrating off a monolith data warehouse |
| Multiple "Staff/Principal" IC roles | Re-architecture underway; needs senior individual contributors |
| Heavy "Security Engineer" posting | Compliance push (SOC2, FedRAMP) or post-breach response |
| Repeated "Growth Engineer" roles | Performance marketing or activation loop under construction |

### 4c — Chronic Open Roles (what can't they hire for?)
Cross-reference careers page `posted_date` with LinkedIn `posted_date` for the same role. Roles posted 60+ days ago that appear on both sources without a "filled" status are chronic opens. List them explicitly — they represent either a rare skill set or an organizational problem.

### 4d — Engineering Blog Themes (what are their engineers thinking about?)
Group blog posts by technical theme. Themes appearing in 2+ recent posts indicate active investment. Compare to job postings — if the blog is full of posts about distributed systems and the jobs board has five "Distributed Systems Engineer" openings, that's a confirmed strategic bet.

---

## Step 5 — Synthesize the Intelligence Report

Use the outputs of Steps 1–4 to produce this report. Only use data from TinyFish results. Do not speculate beyond what the signals support.

```
## Hiring Intelligence Report: <Company Name>
Report generated: <date>
Sources: Careers page · LinkedIn Jobs · Engineering blog

---

### The 30-Second Read
<2–3 sentences. What is this company clearly building right now, based purely on where they are hiring?>

---

### Team Velocity — Where They Are Growing
| Team | Open Roles | Signal |
|------|-----------|--------|
| <team> | <count> | <what this growth suggests> |
| ... | | |

---

### Technology Bets — What Keeps Showing Up in Job Descriptions
- **<Technology>** — appears in <N> role titles. Teams: <list>. Interpretation: <what this suggests>
- ...

---

### Chronic Open Roles — What They Can't Hire For
- **<Role Title>** — posted <X> days ago, still open. Possible reason: <rare skill set / team restructuring / high bar>
- ...
(If no chronic roles found, note that hiring velocity appears healthy.)

---

### Engineering Blog Signals
- **<Theme>** — <N> recent posts. Most recent: "<title>" (<date>). Cross-reference: <matching job postings if any>
- ...
(If no engineering blog found, note its absence — some companies go dark on purpose before a launch.)

---

### Strategic Interpretation
<3–5 sentences. What is the company's likely 12-month technical roadmap based on these signals? Be specific: name the product bets, the infrastructure they're building, the problems they haven't solved yet.>

---

### Red Flags (if any)
- <anything anomalous: mass hiring freeze signals, executive role churn, repeated re-posts of the same role, entire teams missing from job board>

---

### For the Founder
<2–3 sentences of competitive intelligence framing: what this company is about to be able to do that they can't do today, and what window that creates or closes.>

### For the Engineer Evaluating a Job Offer
<2–3 sentences: is this company in early build-out, scaling a working system, or in maintenance mode? What does that mean for the work you'd actually be doing?>
```

---

## Handling Blocked or Login-Walled Pages

Some sources will resist scraping. Use these fallbacks:

| Source | Common block | Fallback |
|--------|-------------|----------|
| LinkedIn | Login wall | In the TinyFish goal, add: *"If a login prompt appears, dismiss it or scroll past it. Scrape whatever is visible without logging in."* LinkedIn shows ~10–15 roles to unauthenticated users — enough for signal. |
| Careers page | JavaScript-heavy SPA that loads slowly | Add to goal: *"Wait for the full page to load before extracting. If roles load lazily on scroll, scroll to the bottom of the page first."* |
| Engineering blog | Paywall or subscription gate | Skip and note in the report. |

If a source returns zero results after retry, note it explicitly in the report rather than omitting the section. Absence of data is itself a signal.

---

## Keyword Variants for Ambiguous Company Names

If the company name is common or shared (e.g. "Linear", "Notion", "Scale"), disambiguate in the LinkedIn search URL using the company slug, not just the name.

| Company | LinkedIn slug |
|---------|--------------|
| Notion | `notion` |
| Linear | `linear-app` |
| Scale AI | `scaleai` |
| Mistral AI | `mistral-ai` |

Find the correct slug by visiting `linkedin.com/company/<slug>` and checking the company page resolves correctly before running the agent.

---

## Managing Runs

```bash
# List recent runs
tinyfish agent run list

# Retrieve a completed run by ID
tinyfish agent run get <run_id>

# Cancel a hung run
tinyfish agent run cancel <run_id>
```

---

## Output Format

The CLI streams `data: {...}` SSE lines. The final usable result is the event where `type == "COMPLETE"` and `status == "COMPLETED"` — extracted data lives in `resultJson`. Read raw output directly; no additional parsing is needed unless you are piping results between steps.
