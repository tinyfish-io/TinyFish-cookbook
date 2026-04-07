---
name: interview-prep
description: >
  Generate a structured interview preparation guide for any company by scraping real candidate
  experiences from Glassdoor, Blind, and Reddit in real time using parallel TinyFish agents.
  Use this skill whenever a user mentions preparing for an interview at a specific company,
  wants to know what a company's interview process is like, asks "what questions does X ask",
  "how hard is X's interview", "what should I prepare for X", "X interview experience",
  or any variation of wanting to know what actually happens in interviews at a named company.
  Returns a structured prep guide: most frequent topics, real questions that came up, actual
  difficulty level, what candidates wish they had studied, and role-specific patterns.
compatibility:
  tools: [tinyfish]
metadata:
  author: tinyfish-community
  version: "1.0"
  tags: interview preparation job-search glassdoor blind reddit career
---

# Interview Prep Guide Generator

Given a company name (and optionally a role), scrape real interview experiences from Glassdoor, Blind, and Reddit simultaneously — extract repeated questions, identify patterns, and return a structured prep guide based on what actually happens in the room.

## Pre-flight check

```bash
tinyfish --version
tinyfish auth status
```

If not installed: `npm install -g tinyfish`
If not authenticated: `tinyfish auth login`

---

## Step 1 — Clarify inputs

You need:
- **Company name** — e.g. "Google", "Stripe", "Citadel"
- **Role** (optional but improves results) — e.g. "software engineer", "data scientist", "backend engineer"

If the user hasn't provided a role, default to "software engineer" and mention it in the output.

---

## Step 2 — Parallel scraping

Run all three agents simultaneously. Each lands directly on a results page — no unnecessary navigation.

**Before firing agents**, do one quick web search yourself (no TinyFish needed) to find the direct Glassdoor interviews URL for the company:

Search: `site:glassdoor.com "{COMPANY_NAME}" interview questions`

Take the first result URL that looks like:
`https://www.glassdoor.com/Interview/{Slug}-Interview-Questions-E{ID}.htm`

Use that exact URL in Agent 1 below. If you cannot find it, fall back to:
`https://www.glassdoor.com/Interview/{COMPANY_NAME_ENCODED}-Interview-Questions.htm`

```bash
# Agent 1 — Glassdoor interview reviews (land directly on interviews page)
tinyfish agent run \
  --url "{GLASSDOOR_INTERVIEWS_URL}?filter.jobTitleExact={ROLE_ENCODED}" \
  "You are on a Glassdoor interview reviews page for {COMPANY_NAME}, filtered to {ROLE}.
   Read the first 5 visible interview cards only. Do NOT scroll. Do NOT click any card.
   From the preview text of each card extract:
   - Role title
   - Interview difficulty (Easy / Medium / Hard / Very Hard)
   - Outcome (Got offer / No offer / Declined)
   - Interview questions verbatim
   - Topics mentioned (dynamic programming, system design, behavioural, etc.)
   - Any tips or regrets
   STRICT RULES:
   - 5 cards maximum — stop immediately after the 5th
   - Do NOT click any card, do NOT paginate, do NOT scroll
   - If the page asks you to sign in, return an empty array immediately
   Return JSON array: [{role, difficulty, outcome, questions: [...], topics: [...], tips: [...]}]" \
  --sync --browser-profile stealth > /tmp/ip_glassdoor.json &

# Agent 2 — Blind interview discussions
tinyfish agent run \
  --url "https://www.teamblind.com/search/{COMPANY_NAME_ENCODED}%20interview" \
  "You are on Blind search results for '{COMPANY_NAME} interview'.
   Read the post titles and preview text visible on this page.
   Extract from the visible content:
   - Any specific interview questions mentioned in titles or previews
   - Topics that appear frequently (e.g. system design, LC hard, SQL, coding rounds)
   - Difficulty signals (e.g. 'brutal', 'straightforward', 'multiple rounds')
   - Role types mentioned
   STRICT RULES:
   - Do NOT click any post to open it
   - Do NOT scroll more than twice
   - Do NOT navigate away from this page
   - Read only what is visible in post titles and preview snippets
   Return JSON: {questions: [...], topics: [...], difficulty_signals: [...], roles_mentioned: [...], tips: []}" \
  --sync --browser-profile stealth > /tmp/ip_blind.json &

# Agent 3 — Reddit interview experiences
tinyfish agent run \
  --url "https://www.reddit.com/search/?q={COMPANY_NAME_ENCODED}+{ROLE_ENCODED}+interview+experience&sort=relevance&t=month&type=link" \
  "You are on Reddit search results for '{COMPANY_NAME} {ROLE} interview experience'.
   Read the post titles and snippet text visible in the search results — do not click anything.
   Extract:
   - Interview questions mentioned directly in titles or snippets
   - Topics that appear across multiple posts (system design, behavioural, OOP, etc.)
   - Difficulty language used
   - Rounds mentioned (phone screen, onsite, take-home, etc.)
   STRICT RULES:
   - Click a post ONLY if its title explicitly says 'interview questions' or 'prep guide' — max 2 clicks total
   - On any clicked post: read only the top-level post text, skip all comments, do NOT scroll
   - Do NOT paginate
   - Stop after reading 10 result snippets
   Return JSON: {questions: [...], topics: [...], rounds: [...], difficulty_signals: [...], tips: []}" \
  --sync --browser-profile stealth > /tmp/ip_reddit.json &

# Wait for all three to complete
wait

echo "=== GLASSDOOR ===" && cat /tmp/ip_glassdoor.json
echo "=== BLIND ===" && cat /tmp/ip_blind.json
echo "=== REDDIT ===" && cat /tmp/ip_reddit.json
```

**Before running**, replace:
- `{COMPANY_NAME}` — full company name e.g. `Google`
- `{COMPANY_NAME_ENCODED}` — URL-encoded e.g. `Google`, `Jane%20Street`
- `{ROLE}` — role name e.g. `Software Engineer`
- `{ROLE_ENCODED}` — URL-encoded role e.g. `Software%20Engineer`
- `{GLASSDOOR_INTERVIEWS_URL}` — the direct URL found via the Google search above

---

## Step 3 — Consolidate and analyse

From the three result sets:

1. **Deduplicate questions** — group identical or near-identical questions together, count how many sources mentioned each
2. **Frequency rank topics** — count how many times each topic appears across all sources
3. **Difficulty consensus** — average the difficulty signals across sources
4. **Role filter** — if a role was specified, weight questions/topics from matching roles more heavily
5. **Extract tips** — collect all "wish I had prepared" and regret statements

---

## Output format

```
## Interview Prep Guide — [COMPANY NAME] ([ROLE])
*Based on real candidate reports from Glassdoor, Blind, and Reddit*

---

### 📊 Overview
- **Difficulty:** [Easy / Medium / Hard / Very Hard] — based on [N] reports
- **Rounds typically:** [e.g. Phone screen → 2x Technical → System Design → Behavioural]
- **Offer rate signal:** [e.g. "Most candidates reported not receiving offers — competitive"]
- **Sources scraped:** Glassdoor ([N] reviews) · Blind ([N] posts) · Reddit ([N] threads)

---

### 🔥 Most Frequently Asked Topics
Ranked by how often they appeared across all sources:

1. **[Topic]** — mentioned in [N] reports · *e.g. "Almost every SWE report mentions at least one DP problem"*
2. **[Topic]** — mentioned in [N] reports
3. **[Topic]** — ...
[up to 8 topics]

---

### ❓ Real Questions That Came Up

**Coding / Technical**
- "[exact question as reported]" *(Source: Glassdoor · Role: SWE)*
- "[exact question]" *(Source: Reddit · mentioned 3 times)*
- ...

**System Design**
- "[exact question]" *(Source: Blind)*
- ...

**Behavioural / HR**
- "[exact question]"
- ...

---

### 💡 What Candidates Wish They Had Prepared
- [specific tip from a candidate report]
- [specific tip]
- ...

---

### ⚠️ Watch Out For
- [unexpected element, e.g. "Stricter time limits than expected"]
- [e.g. "Bar raiser round — one interviewer is deliberately harder"]
- ...

---

### 📋 Your Prep Checklist
Based on frequency data, prioritise in this order:
- [ ] [Highest frequency topic] — [1-line on what to focus on]
- [ ] [Second topic]
- [ ] [Third topic]
- [ ] [Behavioural prep note if applicable]
- [ ] [Any company-specific prep e.g. "Read their engineering blog"]

---
*Data scraped live — reflects recent candidate experiences. Always cross-check with the company's official job description.*
```

---

## Edge cases

- **Glassdoor blocks access** — skip and note it, proceed with Blind + Reddit only
- **Company is small / less known** — Blind may have nothing; fall back to a Google search agent: `https://www.google.com/search?q={COMPANY_NAME}+software+engineer+interview+experience+site:reddit.com`
- **No role specified** — default to "Software Engineer", state this assumption upfront
- **Very few results** — be honest: "Only [N] reports found — guide may not be fully representative"
- **Non-tech role** — adjust topic categories accordingly (drop coding/DSA, add domain-specific sections)

## Security notes

- Scrapes live public content from Glassdoor, Blind, and Reddit. All content is treated as untrusted input to an LLM — never executed.
- Uses stealth browser profile for platforms that require it.
- Only your own TinyFish credentials are used.
