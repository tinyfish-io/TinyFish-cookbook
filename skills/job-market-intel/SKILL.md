---
name: job-market-intel
description: Get a live job market snapshot for any role and tech stack by deploying parallel TinyFish agents across LinkedIn, Indeed, and Glassdoor. Use when a developer wants real salary data, in-demand skills, top hiring companies, and remote ratios from actual job postings published this week — not survey averages or historical data. Triggers on phrases like "what is the market paying for", "salary range for", "is my salary competitive", "what should I ask for", "what skills do I need for", "who is hiring for", "how in-demand is", "before I negotiate", "job market for", "what does a [role] make", or any request to research compensation or demand for a specific role and tech stack before a job search or negotiation.
---

# Job Market Intel — Live Salary & Demand Data Before You Negotiate

You have access to the TinyFish CLI (`tinyfish`), a tool that runs browser automations from the terminal using natural language goals. This skill deploys agents across LinkedIn, Indeed, and Glassdoor in parallel, navigates login walls and search forms, and synthesizes live job listings into a single market snapshot.

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
> **Option 2 — PowerShell (current session only):**
> ```powershell
> $env:TINYFISH_API_KEY="your-api-key-here"
> ```
>
> **Option 3 — PowerShell (persist across sessions):**
> ```powershell
> [System.Environment]::SetEnvironmentVariable("TINYFISH_API_KEY", "your-api-key-here", "User")
> ```
> Then close and reopen PowerShell for it to take effect.
>
> **Option 4 — bash/zsh (Mac/Linux):**
> ```bash
> export TINYFISH_API_KEY="your-api-key-here"
> ```
>
> **Option 5 — Claude Code settings:** Add to `~/.claude/settings.local.json`:
> ```json
> {
>   "env": {
>     "TINYFISH_API_KEY": "your-api-key-here"
>   }
> }
> ```

Do NOT proceed until both checks pass.

---

## What This Skill Does

Given a job title and tech stack (e.g. *"Senior Backend Engineer, Go + Kubernetes"*), this skill:

1. Searches **LinkedIn Jobs** for matching postings, extracting salary ranges, seniority levels, and company names
2. Searches **Indeed** for the same role, pulling compensation data and required skills from job descriptions
3. Searches **Glassdoor** for salary data, company ratings, and remote/hybrid/onsite ratios

It then synthesizes all three sources into a structured market snapshot: what the role actually pays, which skills show up most, who is hiring, and whether remote is realistic.

---

## Core Command

```bash
tinyfish agent run --url <url> "<goal>"
```

### Flags

| Flag | Purpose |
|------|---------|
| `--url <url>` | Target website URL |
| `--sync` | Wait for full result before returning |
| `--async` | Submit and return immediately |
| `--pretty` | Human-readable formatted output |

---

## Step-by-Step Workflow

### Inputs Required

Before running, collect from the user:
- **Job title** — e.g. `Senior Backend Engineer`, `ML Engineer`, `Staff iOS Developer`
- **Tech stack** — e.g. `Go Kubernetes`, `Python PyTorch`, `Swift SwiftUI`
- **Location** (optional) — e.g. `San Francisco`, `Remote`, `London`

Derive URL-encoded search strings from these inputs for each platform.

---

### Step 1 — Search LinkedIn Jobs

```bash
tinyfish agent run --sync \
  --url "https://www.linkedin.com/jobs/search/?keywords=<title+stack>&location=<location>&f_TPR=r604800" \
  "Extract the top 10 job listings as JSON: [{\"title\": str, \"company\": str, \"location\": str, \"salary_range\": str, \"posted_date\": str, \"remote_type\": str, \"url\": str}]. If salary is not shown, set salary_range to null. The f_TPR=r604800 filter means postings from the last 7 days — note the recency in each result."
```

**Example for Senior Backend Engineer, Go + Kubernetes:**
```bash
tinyfish agent run --sync \
  --url "https://www.linkedin.com/jobs/search/?keywords=Senior+Backend+Engineer+Go+Kubernetes&location=Remote&f_TPR=r604800" \
  "Extract the top 10 job listings as JSON: [{\"title\": str, \"company\": str, \"location\": str, \"salary_range\": str, \"posted_date\": str, \"remote_type\": str, \"url\": str}]. Set salary_range to null if not listed."
```

---

### Step 2 — Search Indeed

```bash
tinyfish agent run --sync \
  --url "https://www.indeed.com/jobs?q=<title+stack>&l=<location>&fromage=7&sort=date" \
  "Extract the top 10 job listings as JSON: [{\"title\": str, \"company\": str, \"location\": str, \"salary_range\": str, \"required_skills\": [str], \"posted_date\": str, \"remote_type\": str, \"url\": str}]. Pull required_skills from the snippet or description preview shown in results. Set salary_range to null if not listed."
```

**Example:**
```bash
tinyfish agent run --sync \
  --url "https://www.indeed.com/jobs?q=Senior+Backend+Engineer+Go+Kubernetes&l=Remote&fromage=7&sort=date" \
  "Extract the top 10 job listings as JSON: [{\"title\": str, \"company\": str, \"location\": str, \"salary_range\": str, \"required_skills\": [str], \"posted_date\": str, \"remote_type\": str, \"url\": str}]. Pull required_skills from visible description snippets."
```

---

### Step 3 — Search Glassdoor

```bash
tinyfish agent run --sync \
  --url "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=<title+stack>&locT=N&locId=1&jobType=all&fromAge=7" \
  "Extract the top 10 job listings as JSON: [{\"title\": str, \"company\": str, \"company_rating\": str, \"salary_range\": str, \"location\": str, \"remote_type\": str, \"posted_date\": str, \"url\": str}]. Include company_rating (out of 5) if shown. Set salary_range to null if not listed."
```

**Example:**
```bash
tinyfish agent run --sync \
  --url "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=Senior+Backend+Engineer+Go+Kubernetes&locT=N&locId=1&jobType=all&fromAge=7" \
  "Extract the top 10 job listings as JSON: [{\"title\": str, \"company\": str, \"company_rating\": str, \"salary_range\": str, \"location\": str, \"remote_type\": str, \"posted_date\": str, \"url\": str}]."
```

---

## Parallel Execution

All three steps are independent — run them simultaneously. Do NOT wait for LinkedIn before starting Indeed or Glassdoor.

**bash/zsh — Parallel calls (Mac/Linux):**
```bash
tinyfish agent run --sync \
  --url "https://www.linkedin.com/jobs/search/?keywords=<title+stack>&location=<location>&f_TPR=r604800" \
  "Extract top 10 listings as JSON: [{\"title\": str, \"company\": str, \"location\": str, \"salary_range\": str, \"posted_date\": str, \"remote_type\": str, \"url\": str}]" \
  > /tmp/linkedin_results.json &

tinyfish agent run --sync \
  --url "https://www.indeed.com/jobs?q=<title+stack>&l=<location>&fromage=7&sort=date" \
  "Extract top 10 listings as JSON: [{\"title\": str, \"company\": str, \"location\": str, \"salary_range\": str, \"required_skills\": [str], \"posted_date\": str, \"remote_type\": str, \"url\": str}]" \
  > /tmp/indeed_results.json &

tinyfish agent run --sync \
  --url "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=<title+stack>&locT=N&locId=1&jobType=all&fromAge=7" \
  "Extract top 10 listings as JSON: [{\"title\": str, \"company\": str, \"company_rating\": str, \"salary_range\": str, \"location\": str, \"remote_type\": str, \"posted_date\": str, \"url\": str}]" \
  > /tmp/glassdoor_results.json &

wait
```

**PowerShell — Parallel calls using Start-Job / Wait-Job:**
```powershell
$linkedinJob = Start-Job {
    tinyfish agent run --sync `
      --url "https://www.linkedin.com/jobs/search/?keywords=<title+stack>&location=<location>&f_TPR=r604800" `
      "Extract top 10 listings as JSON: [{`"title`": str, `"company`": str, `"location`": str, `"salary_range`": str, `"posted_date`": str, `"remote_type`": str, `"url`": str}]"
}

$indeedJob = Start-Job {
    tinyfish agent run --sync `
      --url "https://www.indeed.com/jobs?q=<title+stack>&l=<location>&fromage=7&sort=date" `
      "Extract top 10 listings as JSON: [{`"title`": str, `"company`": str, `"location`": str, `"salary_range`": str, `"required_skills`": [str], `"posted_date`": str, `"remote_type`": str, `"url`": str}]"
}

$glassdoorJob = Start-Job {
    tinyfish agent run --sync `
      --url "https://www.glassdoor.com/Job/jobs.htm?sc.keyword=<title+stack>&locT=N&locId=1&jobType=all&fromAge=7" `
      "Extract top 10 listings as JSON: [{`"title`": str, `"company`": str, `"company_rating`": str, `"salary_range`": str, `"location`": str, `"remote_type`": str, `"posted_date`": str, `"url`": str}]"
}

Wait-Job $linkedinJob, $indeedJob, $glassdoorJob | Out-Null

$linkedinResults  = Receive-Job $linkedinJob
$indeedResults    = Receive-Job $indeedJob
$glassdoorResults = Receive-Job $glassdoorJob

Remove-Job $linkedinJob, $indeedJob, $glassdoorJob
```

**Bad — Sequential calls (avoid):**
```bash
# Don't do this — three times slower, same results
tinyfish agent run --url "https://linkedin.com/..." "...also check Indeed and Glassdoor..."
```

Each platform is its own call. Always run in parallel.

---

## Step 4 — Synthesize Into a Market Snapshot

Once all three sources return results, synthesize findings into this structure:

```
## Job Market Snapshot: <Role> — <Stack>
As of: <current date> | Sources: LinkedIn · Indeed · Glassdoor

### Salary Range
- Low end:   $<X>k   (entry/mid, from listings with explicit salary data)
- Midpoint:  $<X>k   (most common range across listings)
- High end:  $<X>k   (senior/staff/principal listings)
- Sample size: <N> listings with salary data out of <total> scraped

### Top Hiring Companies
| Company | Platform | Rating | Remote? |
|---------|----------|--------|---------|
| ...     | ...      | ...    | ...     |

### Most Required Skills
(ranked by frequency across all listings)
1. <skill> — seen in X/30 listings
2. <skill> — seen in X/30 listings
...

### Remote Ratio
- Remote:        XX%
- Hybrid:        XX%
- Onsite only:   XX%

### Demand Signal
- Total listings found this week: ~<N>
- Platform with most postings: <LinkedIn / Indeed / Glassdoor>
- Trend note: <any notable pattern — e.g. most postings are contract, or salary listed in <20% of roles>

### Raw Listings Sample
<3–5 representative listings with title, company, salary, and URL>

### Negotiation Takeaway
<2–3 sentences: what this data means in a negotiation context — floor, target, and stretch numbers based on the listings>
```

Only use data returned by TinyFish. Do not estimate or fill in salary figures not present in the results. If salary data is sparse (fewer than 5 listings show it), say so explicitly and note which platform surfaces it most.

---

## Keyword Strategy

Search quality depends on how you phrase the query. Derive 2–3 variants from the user's input:

| Role + Stack | Primary keywords | Variant keywords |
|---|---|---|
| Senior Backend, Go + K8s | `Senior Backend Engineer Go Kubernetes` | `Backend Engineer Golang cloud-native`, `Platform Engineer Go` |
| ML Engineer, PyTorch | `Machine Learning Engineer PyTorch` | `ML Engineer deep learning Python`, `AI Engineer LLM PyTorch` |
| Staff iOS, Swift | `Staff iOS Developer Swift SwiftUI` | `Senior iOS Engineer Swift`, `iOS Architect SwiftUI` |
| Frontend, React + TypeScript | `Senior Frontend Engineer React TypeScript` | `Frontend Developer React Next.js`, `UI Engineer TypeScript` |

If the first pass returns fewer than 10 total listings across all platforms, run a second parallel pass with a variant keyword set.

---

## Handling Login Walls

LinkedIn and Glassdoor may prompt for login. TinyFish handles this automatically when authenticated sessions are stored. If an agent returns a login page instead of results:

1. Run `tinyfish auth status` to verify your session
2. Re-authenticate with `tinyfish auth login` and select the affected platform
3. Re-run the failed step individually before re-joining the parallel flow

Indeed typically does not require login for search result extraction.

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

## Output Format

The CLI streams `data: {...}` SSE lines by default. The final result is the event where `type == "COMPLETE"` and `status == "COMPLETED"` — extracted data is in the `resultJson` field. Read output directly; no custom parsing script needed.
