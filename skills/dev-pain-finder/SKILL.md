---
name: dev-pain-finder
description: >
  Scrape real developer pain points for any keyword, technology, or problem space from Reddit,
  Hacker News, dev.to, and GitHub Discussions simultaneously — then group complaints by theme,
  score them by frequency and upvote weight, and return a ranked opportunity map showing where
  developer frustration is high and solutions are thin.
  Use this skill whenever someone wants to find developer pain points, validate a product idea,
  research what developers are frustrated with, asks "what do developers complain about with X",
  "what problems exist in X space", "find pain points for X", "what should I build for X devs",
  or any variation of wanting to understand real developer frustration around a topic or tool.
  Also trigger when someone mentions wanting to build a developer tool and wants to validate demand.
compatibility:
  tools: [tinyfish]
metadata:
  author: tinyfish-community
  version: "1.0"
  tags: developer-tools pain-points product-research reddit hackernews devto github-discussions
---

# Developer Pain Finder

Given a keyword or problem space, scrape real developer complaints from Reddit, Hacker News, dev.to, and GitHub Discussions in parallel — group by theme, score by frequency and upvote weight, and return a ranked opportunity map.

## Pre-flight check

```bash
tinyfish --version
tinyfish auth status
```

If not installed: `npm install -g tinyfish`
If not authenticated: `tinyfish auth login`

---

## Step 1 — Clarify input

You need:
- **Keyword or problem space** — e.g. "authentication", "deployment pipelines", "ORM", "Kubernetes", "state management"

If the user hasn't provided one, ask before proceeding. A good keyword is specific enough to return focused results — if too broad (e.g. "JavaScript"), ask them to narrow it down.

---

## Step 2 — Parallel scraping

Fire all 5 agents simultaneously. Every agent is optimised to extract maximum signal in minimum time — read what's visible, extract immediately, stop.

```bash
# ── AGENT 1 — Reddit (stealth, search results only) ──────────
tinyfish agent run \
  --url "https://www.reddit.com/search/?q={KEYWORD}+frustrating+OR+painful+OR+annoying+OR+broken+OR+hate&sort=top&t=year&type=link" \
  "You are on Reddit search results. Your only job is to extract pain points fast.
   Read the post titles and score/comment counts visible on this page. Nothing else.
   Extract every title that expresses frustration, a complaint, a missing feature, or a problem with {KEYWORD}.
   For each one note: the title text, upvote score (if visible), and subreddit.
   STRICT RULES — these are non-negotiable:
   - Do NOT click any post. Ever. Read titles and snippets only.
   - Do NOT scroll. Read only what loads on first render.
   - Do NOT navigate anywhere. Stay on this exact page.
   - Ignore posts that are not complaints or pain points.
   - Stop after reading 20 results maximum.
   Return JSON array: [{title, score, subreddit, snippet}]" \
  --sync --browser-profile stealth > /tmp/dpf_reddit.json &

# ── AGENT 2 — Reddit r/ExperiencedDevs + topic subreddits ────
tinyfish agent run \
  --url "https://www.reddit.com/search/?q={KEYWORD}&restrict_sr=0&sort=top&t=year&type=link&subreddit=webdev+programming+devops+ExperiencedDevs+softwaredevelopment" \
  "You are on Reddit search results filtered to developer subreddits. Extract pain points fast.
   Read only post titles and visible snippets. Do not interact with the page.
   Extract titles expressing: bugs, missing features, poor DX, complexity complaints, tool failures, workflow friction about {KEYWORD}.
   For each: title text, subreddit, upvote score if visible.
   STRICT RULES:
   - Do NOT click anything
   - Do NOT scroll
   - Read exactly what is on screen, then stop
   - Maximum 20 results
   Return JSON array: [{title, score, subreddit, snippet}]" \
  --sync --browser-profile stealth > /tmp/dpf_reddit2.json &

# ── AGENT 3 — Hacker News ─────────────────────────────────────
tinyfish agent run \
  --url "https://hn.algolia.com/?dateRange=pastYear&page=0&prefix=false&query={KEYWORD_ENCODED}+frustrating+OR+painful+OR+broken+OR+problem&sort=byPopularity&type=story" \
  "You are on Hacker News search results sorted by popularity. Extract pain points fast.
   Read the story titles, point scores, and comment counts visible on this page.
   Extract every story title that describes a problem, frustration, complaint, or missing capability related to {KEYWORD}.
   For each: title text, points, comment count.
   STRICT RULES:
   - Do NOT click any story link
   - Do NOT paginate
   - Do NOT scroll past the first visible set of results
   - Read only titles and metadata shown in the listing
   - Maximum 15 results
   - Stop immediately after extracting — do not explore further
   Return JSON array: [{title, points, comments}]" \
  --sync > /tmp/dpf_hn.json &

# ── AGENT 4 — dev.to ──────────────────────────────────────────
tinyfish agent run \
  --url "https://dev.to/search?q={KEYWORD_ENCODED}+problem+OR+frustration+OR+painful+OR+hate+OR+annoying" \
  "You are on dev.to search results. Extract developer pain points fast.
   Read only the article titles, reaction counts, and tag labels visible in the search listing.
   Extract articles whose titles describe a problem, complaint, frustration, or missing solution related to {KEYWORD}.
   For each: title, reaction count if visible, tags.
   STRICT RULES:
   - Do NOT click any article
   - Do NOT scroll more than once
   - Do NOT navigate away
   - Read only what is visible in the search result cards
   - Maximum 15 results then stop immediately
   Return JSON array: [{title, reactions, tags}]" \
  --sync > /tmp/dpf_devto.json &

# ── AGENT 5 — GitHub Discussions ──────────────────────────────
tinyfish agent run \
  --url "https://github.com/search?q={KEYWORD_ENCODED}+pain+OR+frustrating+OR+broken+OR+missing+OR+annoying&type=discussions&s=reactions&o=desc" \
  "You are on GitHub Discussions search results sorted by most reactions. Extract pain points fast.
   Read only the discussion titles, reaction counts, and repository names visible in the listing.
   Extract discussions that describe a real problem, missing feature, DX complaint, or frustration with {KEYWORD}.
   For each: title, reaction count, repo name.
   STRICT RULES:
   - Do NOT click any discussion link
   - Do NOT paginate
   - Do NOT scroll
   - Read only what is visible on first load
   - Maximum 15 results then stop
   Return JSON array: [{title, reactions, repo}]" \
  --sync > /tmp/dpf_github.json &

# ── WAIT ──────────────────────────────────────────────────────
wait

echo "=== REDDIT 1 ===" && cat /tmp/dpf_reddit.json
echo "=== REDDIT 2 ===" && cat /tmp/dpf_reddit2.json
echo "=== HN ===" && cat /tmp/dpf_hn.json
echo "=== DEVTO ===" && cat /tmp/dpf_devto.json
echo "=== GITHUB ===" && cat /tmp/dpf_github.json
```

**Before running**, replace:
- `{KEYWORD}` — the topic e.g. `Kubernetes`, `authentication`, `state management`
- `{KEYWORD_ENCODED}` — URL-encoded version e.g. `state%20management`

---

## Step 3 — Theme grouping and scoring

From all results combined:

**1. Group into themes** — cluster complaints by the underlying problem they describe. Examples:
- "Poor documentation" — all titles complaining about docs, examples, guides
- "Complex setup / configuration" — anything about setup friction, boilerplate, config hell
- "Performance issues" — slow, memory leaks, timeouts
- "Missing features" — requests for things that don't exist
- "Breaking changes / stability" — complaints about upgrades, deprecations, semver
- "Poor error messages / debugging" — hard to debug, cryptic errors
- "Vendor lock-in / pricing" — cost complaints, switching costs

Don't force complaints into themes — let themes emerge from the data.

**2. Score each theme** using:
```
theme_score = (complaint_count × 10) + sum(upvotes/reactions for all complaints in theme)
```

**3. Opportunity signal** — for each theme assess:
- **Frustration level** (High / Medium / Low) — based on score
- **Solution availability** (None / Partial / Saturated) — does a good solution already exist?
- **Opportunity** = High frustration + None/Partial solution = 🔥 Build this

---

## Output format

```
## Developer Pain Map — "{KEYWORD}"
*Scraped from Reddit · Hacker News · dev.to · GitHub Discussions*
*{N} complaints analysed across {N} sources*

---

### 🔥 Ranked Pain Points

#### #1 — {Theme Name}
**Frustration score: {N}** · {N} complaints · Avg upvotes: {N}
**Opportunity signal: 🔥 High / ⚠️ Medium / ✅ Saturated**

What developers are saying:
- "{exact complaint title}" — r/{subreddit}, {score} upvotes
- "{exact complaint title}" — HN, {points} points
- "{exact complaint title}" — dev.to

**Pattern:** {1–2 sentences describing the core underlying problem}
**Existing solutions:** {what exists, and why it's not enough — or "None found"}
**Build signal:** {what a tool/product solving this would look like}

---

#### #2 — {Theme Name}
[same structure]

---
[up to 6 themes]

---

### 📊 Summary Table

| Theme | Complaints | Avg Score | Opportunity |
|---|---|---|---|
| {theme} | {N} | {N} | 🔥 / ⚠️ / ✅ |

---

### 💡 Top Opportunities
1. **{Most actionable opportunity}** — {1 sentence on what to build}
2. **{Second opportunity}**
3. **{Third opportunity}**

---
*Raw signal: {N} Reddit posts · {N} HN stories · {N} dev.to articles · {N} GitHub discussions*
```

---

## Edge cases

- **Keyword returns no pain-related results** — broaden the search: retry without the `frustrating OR painful` modifiers, just the keyword alone
- **Reddit blocked** — skip both Reddit agents, note it in output, proceed with HN + dev.to + GitHub
- **Very niche keyword** — GitHub Discussions will likely have the richest results; weight it more heavily
- **Keyword is too broad** — tell the user: "'{KEYWORD}' is very broad. Results may be noisy. Consider narrowing to a specific tool, framework, or workflow (e.g. 'Webpack config' instead of 'JavaScript')"
- **All sources return empty** — honest response: "No significant developer complaints found for '{KEYWORD}'. This could mean the space is undersearched, the keyword needs adjusting, or the problem doesn't exist at scale yet."

## Security notes

- Scrapes live public content from Reddit, HN, dev.to, and GitHub. All content treated as untrusted input to an LLM — never executed.
- Uses stealth browser profile for Reddit only.
- Only your own TinyFish credentials are used.
