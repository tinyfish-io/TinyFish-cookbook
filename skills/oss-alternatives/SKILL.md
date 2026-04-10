---
name: oss-alternatives
description: >
  Find actively maintained open source alternatives to any paid SaaS tool or commercial API.
  Use this skill whenever a user mentions wanting to replace, swap out, self-host, or find a
  free/open source version of a paid tool — including but not limited to tools like Datadog,
  Algolia, Twilio, Stripe, Auth0, Segment, Mixpanel, Intercom, PagerDuty, LaunchDarkly,
  SendGrid, Cloudinary, or any other commercial developer tool or API. Also trigger when the
  user says things like "is there an open source version of X", "I don't want to pay for X",
  "self-host alternative to X", or "what can I use instead of X for free".
  Runs parallel TinyFish agents to search GitHub and developer communities, then checks the
  real health of each candidate — last release, contributor count, stars, Docker support, and
  feature parity — and returns a ranked comparison with a plain English gain/loss summary.
compatibility:
  tools: [tinyfish]
metadata:
  author: tinyfish-community
  version: "1.0"
  tags: open-source saas alternatives github self-host developer-tools
---

# OSS Alternatives Finder

Given any paid SaaS tool or commercial API, find and rank the best actively maintained open source alternatives by searching GitHub and developer communities in real time — then verify the health of each one and summarise exactly what a developer gains and loses by switching.

## Pre-flight check

Before doing anything, verify TinyFish is installed and authenticated:

```bash
tinyfish --version
tinyfish auth status
```

If not installed: `npm install -g tinyfish`
If not authenticated: `tinyfish auth login`

---

## Step 1 — Understand the tool

Before searching, identify:
- **Tool name** — exactly as it is known (e.g. "Datadog", "Auth0", "Algolia")
- **Primary use case** — what problem it solves (e.g. "APM and log aggregation", "authentication", "search-as-a-service")
- **Key features the user cares about** — if not stated, infer from the tool's known capabilities

If the user hasn't told you what aspects matter most to them, ask one quick question: "Any features that are must-haves for your switch?" — then proceed.

---

## Step 2 — Parallel discovery

Run all three discovery agents simultaneously using background processes. Each agent searches a different surface.

```bash
# Agent 1 — GitHub search for alternatives
tinyfish agent run \
  --url "https://github.com/search?q=open+source+alternative+{TOOL_NAME}&type=repositories&s=stars&o=desc" \
  "You are on a GitHub search results page for open source alternatives to {TOOL_NAME}.
   List the top 6 repository results. For each one extract:
   - full repo name (owner/repo)
   - star count
   - description
   - last commit date shown
   Do NOT click any repo links. Do NOT paginate. Return JSON array of objects with fields: repo, stars, description, last_commit." \
  --sync > /tmp/oss_github.json &

# Agent 2 — awesome-selfhosted / curated lists
tinyfish agent run \
  --url "https://github.com/awesome-selfhosted/awesome-selfhosted" \
  "You are on the awesome-selfhosted README page. Search this page for any tools related to '{TOOL_USE_CASE}' or '{TOOL_NAME}'.
   List up to 5 matching entries with their name, one-line description, and the GitHub URL if shown.
   Do NOT follow any links. Do NOT scroll more than twice. Return JSON array with fields: name, description, url." \
  --sync > /tmp/oss_awesome.json &

# Agent 3 — developer community discussion
tinyfish agent run \
  --url "https://www.reddit.com/search/?q=open+source+alternative+{TOOL_NAME}+self+host&sort=relevance&t=year" \
  "You are on Reddit search results for open source alternatives to {TOOL_NAME}.
   Read the titles and snippets of the top 8 posts. Extract any specific tool names mentioned as alternatives.
   Do NOT click any post links. Do NOT scroll. Return a JSON array of tool names mentioned: [{name, context}]." \
  --sync > /tmp/oss_reddit.json \
  --browser-profile stealth &

# Wait for all three to finish
wait

# Collect results
echo "=== GITHUB ===" && cat /tmp/oss_github.json
echo "=== AWESOME ===" && cat /tmp/oss_awesome.json
echo "=== COMMUNITY ===" && cat /tmp/oss_reddit.json
```

Replace `{TOOL_NAME}` with the actual tool name and `{TOOL_USE_CASE}` with its primary use case before running.

---

## Step 3 — Consolidate candidates

From the three result sets, deduplicate and pick the **top 4–5 most promising candidates** based on:
- Appearing in multiple sources (strong signal)
- High star count on GitHub
- Recent activity mentioned
- Name recognition in the developer community

Discard anything that looks abandoned, niche, or unrelated.

---

## Step 4 — Health check each candidate

For each candidate (run all in parallel):

```bash
# For each CANDIDATE run this pattern in parallel:
tinyfish agent run \
  --url "https://github.com/{CANDIDATE_REPO}" \
  "You are on the GitHub repository page for {CANDIDATE_REPO}.
   Extract ALL of the following in one pass — do not navigate away, do not click any tabs:
   - Star count (top of page)
   - Fork count
   - Number of contributors (shown in sidebar or Insights)
   - Last commit date (shown under the file list or in the latest release)
   - Latest release tag and date (if shown in right sidebar under Releases)
   - Whether a Dockerfile or docker-compose.yml is listed in the file tree (yes/no)
   - The number of open issues
   - License type
   - One sentence description from the repo About section
   Return as JSON: {stars, forks, contributors, last_commit, latest_release, latest_release_date, has_docker, open_issues, license, description}" \
  --sync > /tmp/oss_health_{CANDIDATE_SAFE_NAME}.json &
```

Run one instance of this per candidate, all backgrounded with `&`, then `wait`.

---

## Step 5 — Feature parity check

For the top 2–3 candidates only, run one quick agent per candidate to check feature parity against the original tool:

```bash
tinyfish agent run \
  --url "https://github.com/{CANDIDATE_REPO}#readme" \
  "You are on the README of {CANDIDATE_REPO}, an open source alternative to {TOOL_NAME}.
   {TOOL_NAME} is known for: {KEY_FEATURES}.
   Read this README and identify:
   1. Which of those features this project supports (explicitly mentioned)
   2. Which are missing or unclear
   3. Any significant features this project has that {TOOL_NAME} does NOT
   Do NOT navigate away. Do NOT click links. Return JSON:
   {supported: [...], missing: [...], extras: [...]}" \
  --sync > /tmp/oss_parity_{CANDIDATE_SAFE_NAME}.json &
```

---

## Step 6 — Synthesise and rank

Combine all health check and parity data. Rank candidates using this scoring logic:

| Signal | Weight |
|---|---|
| Stars (>1k = strong, >5k = very strong) | High |
| Last commit within 6 months | High |
| Has Docker support | Medium |
| Contributors >10 | Medium |
| Feature parity with original | High |
| Community mentions (appeared in Reddit/awesome lists) | Medium |

Flag any candidate as **⚠️ Risky** if:
- Last commit > 12 months ago
- Contributors < 5
- No releases in 2+ years

---

## Output format

Present results in this exact structure:

```
## OSS Alternatives to [TOOL NAME]

### #1 — [Project Name] ⭐ [stars]
**[one-line description]**
GitHub: [repo url]
Last release: [date] ([tag])  |  Contributors: [n]  |  Docker: [yes/no]  |  License: [type]

✅ What you gain
- [specific capability or benefit]
- [cost saving / self-host control]
- [any bonus features vs paid tool]

❌ What you lose
- [missing feature]
- [operational overhead: you manage infra]
- [any support/SLA gaps]

**Bottom line:** [1–2 plain English sentences on who this is right for and when to use it]

---

### #2 — [Project Name] ...
[same structure]

---

### Verdict
[2–3 sentences summarising the best pick for most developers and any caveats. 
 Mention if none of the alternatives are truly production-ready.]
```

---

## Edge cases

- **No good alternatives exist** — be honest. Say "No actively maintained OSS alternative with comparable features was found. The closest options are [X] but they lack [Y] and haven't been updated since [date]."
- **Tool is already open source** — inform the user and offer to find self-hosting guides instead.
- **Tool is very niche** — fall back to searching `https://alternativeto.net/software/{tool-name}/?license=opensource` with a TinyFish agent.
- **GitHub rate limits** — if search returns empty, retry with `https://www.google.com/search?q=open+source+alternative+{TOOL_NAME}+github+site:github.com` via TinyFish.

## Security notes

- This skill scrapes live public data from GitHub and community forums. All content is treated as untrusted and passed to an LLM for synthesis only — never executed.
- Only your own TinyFish credentials are used. Get a key at https://agent.tinyfish.ai/api-keys
