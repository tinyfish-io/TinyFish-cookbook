---
name: oss-bounty-finder
description: Find paid open-source work, OSS bounties, open source grants, or ways to get paid contributing to open source. Use when someone asks any of the following — "find me paid open source work", "show me OSS bounties for Rust", "how do I get paid for open source", "find GitHub bounties", "are there any open source grants I can apply to", "I want to earn money contributing to open source", "find bounties for Python developers", "show me open source funding opportunities", "what repos are paying for contributions", "find me issues with bounties", "show me open source stipends", "I want to contribute to open source and get paid", "find developer grants", "show me NLNet grants", "GSoC alternatives", "paid open source issues". Accepts a stack (Rust, Python, Go, TypeScript, etc.) and optional keywords. Runs a 3-tier parallel TinyFish agent system; Tier 1 scrapes Algora and IssueHunt, Tier 2 fans out across awesome-list repos checking for bounty-labelled issues, Tier 3 scrapes NLNet, Sovereign Tech Fund, Mozilla MOSS, LFX Mentorship, GSoC, and Outreachy. Synthesizes all findings into a structured paid opportunities report.
---

# OSS Bounty & Grant Finder — Find Paid Open Source Work

You have access to the TinyFish CLI (`tinyfish`), a tool that runs browser automations from the terminal using natural language goals. This skill uses it to search bounty platforms, GitHub repos, and grant foundation pages in parallel, then synthesizes results into a structured paid opportunities report.

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
> $env:TINYFISH_API_KEY="your_api_key_here"
> ```
>
> **Option 3 — PowerShell (persist across sessions):**
> ```powershell
> [System.Environment]::SetEnvironmentVariable("TINYFISH_API_KEY", "your_api_key_here", "User")
> ```
> Then close and reopen PowerShell for it to take effect.
>
> **Option 4 — bash/zsh (Mac/Linux):**
> ```bash
> export TINYFISH_API_KEY="your_api_key_here"
> ```
>
> **Option 5 — Claude Code settings:** Add to `~/.claude/settings.local.json`:
> ```json
> {
>   "env": {
>     "TINYFISH_API_KEY": "your_api_key_here"
>   }
> }
> ```

Do NOT proceed until both checks pass.

---

## What This Skill Does

Given a developer's stack and optional keywords (e.g. *"Rust, async"*), this skill:

1. **Tier 1** — Scrapes **Algora** and **IssueHunt**, bounty platforms that already curate paid OSS issues
2. **Tier 2** — Scrapes the **awesome-`<stack>`** GitHub list to discover top repos, then fans out to check each repo's bounty-labelled issues
3. **Tier 3** — Scrapes **NLNet, Sovereign Tech Fund, Mozilla MOSS, LFX Mentorship, GSoC, and Outreachy** for open grant calls

All three tiers run in parallel. Results are synthesized into a structured opportunities report.

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

## Inputs

Ask the user for:

| Input | Required | Example |
|-------|----------|---------|
| `stack` | ✅ Yes | `Rust`, `Python`, `Go`, `TypeScript` |
| `keywords` | Optional | `async`, `cli`, `web3` |
| `min_amount` | Optional | `100` (minimum bounty $ to include) |

---

## Step-by-Step Workflow

### Tier 1 — Bounty Aggregator Platforms

Scrape Algora and IssueHunt in parallel. These platforms already curate and index bounties — one agent per platform.

**Algora:**
```bash
tinyfish agent run --sync \
  --url "https://algora.io/bounties?lang=<stack>" \
  "This is Algora.io, a paid OSS bounty platform filtered for <stack>. Extract all visible open bounty listings. Only include bounties relevant to <stack> — skip any for unrelated languages. Return as JSON array: [{\"title\": str, \"repo\": str, \"url\": str, \"bountyAmount\": number, \"currency\": str, \"skills\": [str]}]"
```

**IssueHunt:**
```bash
tinyfish agent run --sync \
  --url "https://issuehunt.io/repos?language=<stack>" \
  "This is IssueHunt, a paid OSS bounty platform filtered for <stack>. Extract all open bounty listings. Only include bounties relevant to <stack>. Return as JSON array: [{\"title\": str, \"repo\": str, \"url\": str, \"bountyAmount\": number, \"currency\": str, \"skills\": [str]}]"
```

**Example for Rust:**
```bash
tinyfish agent run --sync \
  --url "https://algora.io/bounties?lang=rust" \
  "This is Algora.io filtered for Rust. Extract all open Rust bounties. Skip any for Scala, Java, Python or other non-Rust stacks. Return as JSON array: [{\"title\": str, \"repo\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"USD\", \"skills\": [str]}]"
```

---

### Tier 2 — Awesome List → Repo Fan-Out

This is a two-stage process. Run Stage 2 agents in parallel once Stage 1 completes.

**Awesome list URLs by stack:**

| Stack | Awesome List URL |
|-------|-----------------|
| Rust | `https://github.com/rust-unofficial/awesome-rust` |
| Go | `https://github.com/avelino/awesome-go` |
| Python | `https://github.com/vinta/awesome-python` |
| TypeScript | `https://github.com/dzharii/awesome-typescript` |
| JavaScript | `https://github.com/sorrycc/awesome-javascript` |
| C++ | `https://github.com/fffaraz/awesome-cpp` |
| Java | `https://github.com/akullpp/awesome-java` |
| Swift | `https://github.com/matteocrippa/awesome-swift` |
| Elixir | `https://github.com/h4cc/awesome-elixir` |
| Zig | `https://github.com/catdevnull/awesome-zig` |

**Stage 2a — Discover repos from awesome list:**
```bash
tinyfish agent run --sync \
  --url "https://github.com/<awesome-list-url>" \
  "This is a GitHub awesome list. Extract GitHub repo URLs from the README. Return JSON: {\"repos\": [\"https://github.com/owner/repo\"]}. Rules: only owner/repo paths, skip wikis/gists/topics, skip the list repo itself, first 25 unique repos only."
```

**Stage 2b — Check each repo for bounty issues (run all in parallel):**
```bash
tinyfish agent run --sync \
  --url "https://github.com/<owner>/<repo>/issues?q=is%3Aopen+label%3Abounty+OR+bounty+in%3Atitle+OR+reward+in%3Atitle" \
  "This is a GitHub issues page. Extract all visible issues mentioning bounty, reward, or paid work. Return as JSON array: [{\"title\": str, \"repo\": str, \"url\": str, \"bountyAmount\": number or null, \"currency\": str or null, \"labels\": [str], \"skills\": [str], \"difficulty\": str}]. Return [] if no issues visible."
```

---

### Tier 3 — Grant Programs

Scrape all six grant foundations in parallel. These are language-agnostic — always run regardless of stack.

```bash
# NLNet / NGI Zero
tinyfish agent run --sync \
  --url "https://nlnet.nl/thema/" \
  "This is the NLNet grants page. Extract all currently open grant programs. Return as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"EUR\", \"deadline\": str, \"description\": str, \"labels\": [\"grant\", \"nlnet\"]}]"

# Sovereign Tech Fund
tinyfish agent run --sync \
  --url "https://www.sovereigntechfund.de/programs" \
  "This is the Sovereign Tech Fund grants page. Extract all open programs. Return as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"EUR\", \"deadline\": str, \"description\": str, \"labels\": [\"grant\", \"stf\"]}]"

# Mozilla MOSS
tinyfish agent run --sync \
  --url "https://www.mozilla.org/en-US/moss/" \
  "This is Mozilla MOSS grants page. Extract all open grant tracks. Return as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"USD\", \"deadline\": str, \"description\": str, \"labels\": [\"grant\", \"mozilla\"]}]"

# LFX Mentorship
tinyfish agent run --sync \
  --url "https://lfx.linuxfoundation.org/tools/mentorship/" \
  "This is the LFX Mentorship page. Extract all open mentorship programs. Return as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"USD\", \"deadline\": str, \"description\": str, \"labels\": [\"grant\", \"lfx\"]}]"

# Google Summer of Code
tinyfish agent run --sync \
  --url "https://summerofcode.withgoogle.com/" \
  "This is Google Summer of Code. Extract program details and open application info. Return as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"USD\", \"deadline\": str, \"description\": str, \"labels\": [\"grant\", \"gsoc\"]}]"

# Outreachy
tinyfish agent run --sync \
  --url "https://www.outreachy.org/apply/" \
  "This is Outreachy internships page. Extract open internship rounds and deadlines. Return as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"USD\", \"deadline\": str, \"description\": str, \"labels\": [\"grant\", \"outreachy\"]}]"
```

---

## Parallel Execution

All three tiers run simultaneously. Within Tier 2, Stage 2b repo checks also run in parallel.

**PowerShell — All tiers in parallel:**
```powershell
# Tier 1 — Aggregators
$algoraJob = Start-Job {
    tinyfish agent run --sync `
      --url "https://algora.io/bounties?lang=<stack>" `
      "Extract all open <stack> bounties. Skip unrelated stacks. Return JSON array: [{`"title`": str, `"repo`": str, `"url`": str, `"bountyAmount`": number, `"currency`": str, `"skills`": [str]}]"
}

$issuehuntJob = Start-Job {
    tinyfish agent run --sync `
      --url "https://issuehunt.io/repos?language=<stack>" `
      "Extract all open <stack> bounty listings. Return JSON array: [{`"title`": str, `"repo`": str, `"url`": str, `"bountyAmount`": number, `"currency`": str, `"skills`": [str]}]"
}

# Tier 2 — Awesome list discovery (Stage 2a first, then fan out)
$awesomeJob = Start-Job {
    tinyfish agent run --sync `
      --url "https://github.com/<awesome-list-url>" `
      "Extract GitHub repo URLs from README. Return JSON: {`"repos`": [`"https://github.com/owner/repo`"]}. First 25 unique repos only."
}

# Tier 3 — Grants (all in parallel)
$nlnetJob     = Start-Job { tinyfish agent run --sync --url "https://nlnet.nl/thema/" "Extract open grant programs as JSON array: [{`"title`": str, `"url`": str, `"bountyAmount`": number, `"currency`": `"EUR`", `"deadline`": str, `"description`": str}]" }
$stfJob       = Start-Job { tinyfish agent run --sync --url "https://www.sovereigntechfund.de/programs" "Extract open programs as JSON array: [{`"title`": str, `"url`": str, `"bountyAmount`": number, `"currency`": `"EUR`", `"deadline`": str, `"description`": str}]" }
$mossJob      = Start-Job { tinyfish agent run --sync --url "https://www.mozilla.org/en-US/moss/" "Extract open grant tracks as JSON array: [{`"title`": str, `"url`": str, `"bountyAmount`": number, `"currency`": `"USD`", `"deadline`": str, `"description`": str}]" }
$lfxJob       = Start-Job { tinyfish agent run --sync --url "https://lfx.linuxfoundation.org/tools/mentorship/" "Extract open programs as JSON array: [{`"title`": str, `"url`": str, `"bountyAmount`": number, `"currency`": `"USD`", `"deadline`": str, `"description`": str}]" }
$gsocJob      = Start-Job { tinyfish agent run --sync --url "https://summerofcode.withgoogle.com/" "Extract program info as JSON array: [{`"title`": str, `"url`": str, `"bountyAmount`": number, `"currency`": `"USD`", `"deadline`": str, `"description`": str}]" }
$outreachyJob = Start-Job { tinyfish agent run --sync --url "https://www.outreachy.org/apply/" "Extract open rounds as JSON array: [{`"title`": str, `"url`": str, `"bountyAmount`": number, `"currency`": `"USD`", `"deadline`": str, `"description`": str}]" }

# Wait for Tier 1 + Tier 3 + Tier 2 Stage 2a
Wait-Job $algoraJob, $issuehuntJob, $awesomeJob, $nlnetJob, $stfJob, $mossJob, $lfxJob, $gsocJob, $outreachyJob | Out-Null

# Collect Tier 2 Stage 2a result and extract repo URLs
$awesomeResult = Receive-Job $awesomeJob
# Parse repo URLs from $awesomeResult, then fan out Stage 2b in parallel
# (launch one Start-Job per repo URL, Wait-Job all, Receive-Job all)

# Collect all results
$t1Results = @(Receive-Job $algoraJob) + @(Receive-Job $issuehuntJob)
$t3Results = @(Receive-Job $nlnetJob) + @(Receive-Job $stfJob) + @(Receive-Job $mossJob) + @(Receive-Job $lfxJob) + @(Receive-Job $gsocJob) + @(Receive-Job $outreachyJob)

# Clean up
Remove-Job $algoraJob, $issuehuntJob, $awesomeJob, $nlnetJob, $stfJob, $mossJob, $lfxJob, $gsocJob, $outreachyJob
```

**bash/zsh — All tiers in parallel:**
```bash
# Tier 1 + Tier 3 simultaneously
tinyfish agent run --sync --url "https://algora.io/bounties?lang=<stack>" \
  "Extract all open <stack> bounties. Return JSON array: [{\"title\": str, \"repo\": str, \"url\": str, \"bountyAmount\": number, \"currency\": str, \"skills\": [str]}]" > /tmp/algora.json &

tinyfish agent run --sync --url "https://issuehunt.io/repos?language=<stack>" \
  "Extract all open <stack> bounty listings. Return JSON array: [{\"title\": str, \"repo\": str, \"url\": str, \"bountyAmount\": number, \"currency\": str, \"skills\": [str]}]" > /tmp/issuehunt.json &

tinyfish agent run --sync --url "https://github.com/<awesome-list-url>" \
  "Extract GitHub repo URLs. Return JSON: {\"repos\": [\"https://github.com/owner/repo\"]}. First 25 unique repos." > /tmp/awesome.json &

tinyfish agent run --sync --url "https://nlnet.nl/thema/" \
  "Extract open grants as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"EUR\", \"deadline\": str, \"description\": str}]" > /tmp/nlnet.json &

tinyfish agent run --sync --url "https://www.sovereigntechfund.de/programs" \
  "Extract open programs as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"EUR\", \"deadline\": str, \"description\": str}]" > /tmp/stf.json &

tinyfish agent run --sync --url "https://www.mozilla.org/en-US/moss/" \
  "Extract open grants as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"USD\", \"deadline\": str, \"description\": str}]" > /tmp/moss.json &

tinyfish agent run --sync --url "https://lfx.linuxfoundation.org/tools/mentorship/" \
  "Extract open programs as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"USD\", \"deadline\": str, \"description\": str}]" > /tmp/lfx.json &

tinyfish agent run --sync --url "https://summerofcode.withgoogle.com/" \
  "Extract program info as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"USD\", \"deadline\": str, \"description\": str}]" > /tmp/gsoc.json &

tinyfish agent run --sync --url "https://www.outreachy.org/apply/" \
  "Extract open rounds as JSON array: [{\"title\": str, \"url\": str, \"bountyAmount\": number, \"currency\": \"USD\", \"deadline\": str, \"description\": str}]" > /tmp/outreachy.json &

wait

# Parse awesome.json for repo URLs, then fan out Tier 2b
# Launch one background job per repo URL, wait for all
```

**Bad — Sequential calls (avoid):**
```bash
# Don't do this — running tiers one after another wastes minutes
tinyfish agent run --url "https://algora.io/..." "..." 
# wait...
tinyfish agent run --url "https://nlnet.nl/..." "..."
# wait...
```

Each source is its own call. Always fire all tiers simultaneously.

---

## Step 4 — Synthesize Into Opportunities Report

Once all tiers return results, synthesize into this structure:

```
## OSS Paid Opportunities: <stack> <keywords>

### Tier 1 — Bounty Platforms
| Title | Repo | Amount | Source | URL |
|-------|------|--------|--------|-----|
| <title> | <owner/repo> | $<amount> | Algora | <url> |
| ...

### Tier 2 — Repo Discovery
Repos scanned: <n> | Repos with bounties: <n>

| Title | Repo | Amount | Labels | URL |
|-------|------|--------|--------|-----|
| <title> | <owner/repo> | $<amount> or TBD | <labels> | <url> |
| ...

### Tier 3 — Grants & Programs
| Program | Max Funding | Deadline | Description |
|---------|------------|----------|-------------|
| <title> | €/$ <amount> | <deadline> | <description> |
| ...

### Summary
- Total opportunities found: <n>
- Highest bounty: $<amount> — <title> (<url>)
- Nearest deadline: <program> — <date>
- Best fit for <stack>: <recommendation>
```

Only use data returned by TinyFish. Do not hallucinate amounts, deadlines, or repo names.

---

## Relevance Filtering

After collecting results, drop any opportunity where the title, repo, or skills clearly indicate an unrelated stack:

| Searching for | Drop results mentioning |
|--------------|------------------------|
| Python | Scala, ZIO, Rust, Swift, Kotlin |
| Rust | Python, Scala, Java, Ruby, Golang |
| Go | Python, Scala, Java, Swift, ZIO |
| TypeScript | Python, Scala, Java, Rust, Swift |
| JavaScript | Python, Scala, Java, Rust, Swift |

Tier 3 grants are **always kept** — they are language-agnostic.

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

---

## Grant Programs Reference

| Program | Organisation | Max Funding | Focus |
|---------|-------------|-------------|-------|
| NLNet / NGI Zero | NLNet Foundation | €50,000 | Privacy, security, open internet |
| Sovereign Tech Fund | German Government | €250,000 | Digital infrastructure |
| Mozilla MOSS | Mozilla Foundation | ~$10,000 | Web, security, privacy |
| LFX Mentorship | Linux Foundation | ~$6,600 | Any open source |
| Google Summer of Code | Google | ~$6,000 | Any open source |
| Outreachy | Software Freedom Conservancy | $7,000 | Underrepresented contributors |
