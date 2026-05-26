---
name: tinyfish-social-listening
description: Monitor brand mentions, sentiment, and industry chatter across the web using TinyFish Search and Fetch. Use when a user asks to track what people are saying about a brand, product, or topic, run social listening, or get a pulse on public perception. If the user already named the target, proceed directly. Default time window is last 7 days. Always link every claim to its source URL.
---

# Social Listening with TinyFish

Track brand mentions, sentiment, and industry chatter across the live web — forums, blogs, news, social platforms, and developer communities — using TinyFish Search and Fetch.

**First step:** If the user already named the brand/topic, proceed directly. Otherwise, ask.
**Default time window:** Last 7 days.
**Always link every claim to its source URL.**

## When To Use

- User wants to know what people are saying about a brand, product, person, or topic.
- User asks to monitor competitors or compare share of voice.
- User wants sentiment analysis on a launch, feature, controversy, or trend.
- User says "social listening," "brand monitoring," "reputation check," "buzz check," or "what's the internet saying about X."
- User wants a recurring pulse on public perception (pair with a cron job).

## Pre-flight Check (REQUIRED)

```bash
# 1. TinyFish CLI installed?
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"

# 2. Authenticated?
tinyfish auth status
```

If CLI is not available, fall back to the TinyFish API with `TINYFISH_API_KEY`:

```bash
test -n "$TINYFISH_API_KEY" && echo "API_KEY_AVAILABLE" || echo "NO_TINYFISH_ACCESS"
```

If neither works, stop and tell the user to install or authenticate.

---

## Core Workflow

### Step 1 — Identify the target

If the user already named the brand/topic, skip asking and proceed. Otherwise, ask what brand, product, or topic they want to research. Then set:

- **Target entity:** Whatever the user specifies.
- **Time focus:** Last 7 days. All search queries MUST include date constraints.
- **Channels:** Reddit, Hacker News, Twitter/X, LinkedIn, blogs, news, GitHub, forums, YouTube.
- **Sentiment lens:** General pulse.

**⚠️ CRITICAL: STRICT 7-DAY ENFORCEMENT ⚠️**
Search engines regularly return results older than 7 days regardless of date constraints in queries. You MUST:
1. Check the `published_date` field on every fetched result
2. Check date indicators in Reddit posts (e.g., "7d ago", "2mo ago") and other platforms
3. **DISCARD any result older than 7 days from today** — do NOT include it in the report, do NOT quote it, do NOT use it for sentiment classification
4. If most results are older than 7 days, say so honestly: "Limited discussion found in the last 7 days"
5. NEVER silently widen the window — if the 7-day window is thin, report that it's thin
6. In the final report, every source MUST have its date stated. Any source without a verifiable date within the last 7 days gets excluded.

### Step 1.5 — Resolve X/Twitter handle (MANDATORY before any searches)

**⛔ Do NOT guess the X handle. Do NOT skip this step.**

Run a single search to find the brand's verified X handle:

```bash
tinyfish search query "{brand} site:x.com"
```

Look at the profile URLs that come back (e.g., `x.com/Tiny_Fish`, `x.com/sudheenair`). Extract the **primary brand handle** — this is the one you'll use in all X queries below. Also note any key people handles (CEO, founders) for additional queries.

**Store the result:** `VERIFIED_HANDLE={handle}` — use this variable mentally for all X queries. If no profile URL comes back, note that X coverage will be limited.

### Step 2 — Run multi-angle searches

Run **parallel searches** across different angles. For most platforms, include date strings (e.g., `{current month year}`) to help narrow results. **⛔ EXCEPTION: X/Twitter queries MUST NOT include date strings** — tweets don't contain "2026" or "May 2026" in their text, so adding date strings causes the search engine to filter out real tweets before they reach you. Use snowflake decoding to date-gate X results AFTER they come back. This is the #1 cause of missing X coverage — the agent adds year/month to every query, search engines match on page text, and tweets silently disappear from results.

#### 2a — X/Twitter searches (MANDATORY — all 3 patterns REQUIRED)

**⛔ This is a separate mandatory block, not optional. All 3 query patterns below MUST run. The agent has historically skipped these and missed 80%+ of X activity as a result.**

Generic `site:x.com "{brand}"` queries return mostly **profile page URLs** (undateable, useless). The following 3 patterns are specifically designed to return individual tweet URLs with `/status/` IDs that can be snowflake-decoded:

```bash
# PATTERN 1: Brand's own tweets (returns /status/ URLs)
# ⛔ NO date strings — tweets don't contain "2026" in text. Snowflake-decode dates after.
tinyfish search query "x.com/{VERIFIED_HANDLE}/status"
tinyfish search query "site:x.com/{VERIFIED_HANDLE}/status"

# PATTERN 2: Anyone tagging the brand (returns /status/ URLs from other users)
tinyfish search query "\"@{VERIFIED_HANDLE}\" site:x.com"
tinyfish search query "@{VERIFIED_HANDLE} site:x.com"

# PATTERN 3: Organic mentions by name without tagging (people discussing the brand in tweet text)
tinyfish search query "site:x.com \"{brand}\""
tinyfish search query "site:x.com \"{brand}.ai\""

# PATTERN 4: Product-specific keywords (mine earlier snippets for these)
tinyfish search query "site:x.com {brand} {product_keyword}"
```

**Verification gate:** After running all 3 patterns, count how many unique `/status/` URLs you got. If fewer than 5, run additional queries using product-specific keywords found in the brand's recent announcements or from earlier search snippets (e.g., product names, feature launches, event names). Profile-page snippets from generic searches often contain recent tweet text — mine those for keywords to construct targeted follow-up queries.

Also run queries for any key people handles identified in Step 1.5:
```bash
# ⛔ NO date strings for X — same rule applies to people handles
tinyfish search query "x.com/{person_handle}/status {brand}"
tinyfish search query "site:x.com/{person_handle}/status"
```

#### 2b — All other platform searches

```bash
# Direct brand mentions (last 7 days)
tinyfish search query "{brand} {YYYY-MM-DD range, e.g. 'May 2026'}"

# Reddit / forum discussions
tinyfish search query "site:reddit.com {brand} {current month year}"

# Hacker News discussions
tinyfish search query "site:news.ycombinator.com {brand} {current month year}"

# News coverage
tinyfish search query "{brand} news {current month year}"

# Developer community
tinyfish search query "{brand} developer API feedback {current month year}"

# Negative sentiment
tinyfish search query "{brand} problems issues complaints {current month year}"

# Positive sentiment
tinyfish search query "{brand} love amazing best {current month year}"

# LinkedIn
tinyfish search query "site:linkedin.com {brand} {current month year}"

# YouTube
tinyfish search query "site:youtube.com {brand} {current month year}"
```

Replace `{brand}` with the user's target and use the current month/year for date context.

Adapt queries to the domain:
- **B2B SaaS**: add "pricing", "migration", "enterprise", "support experience"
- **Consumer**: add "worth it", "alternatives", "honest review"
- **Open source**: add "site:github.com", "contributing", "maintainer"
- **Personal brand**: add "talk", "keynote", "interview", "thread"

Run at least 4 search queries. Run up to 10 for comprehensive briefs.

**⚡ EFFICIENCY: Run ALL searches + date gating + date verification in ONE `execute_code` block.** Use `from hermes_tools import terminal` to call TinyFish search from Python, then immediately dedup, date-gate, and verify YouTube dates (via curl) in the same block. Do NOT spread searches across multiple tool calls — the user sees each call as latency. One block, one wait. **Use `scripts/social_listening_sweep.py` as the template** — it handles all search queries, dedup, relevance filtering, X snowflake decoding, LinkedIn prefix heuristic, YouTube curl date-check, and Reddit snippet dates in a single block. Copy it, edit the CONFIG section, and run.

### Step 3 — DATE GATE ON SEARCH RESULTS (mandatory BEFORE any fetching)

**⛔ HARD STOP. Do NOT fetch ANY URLs until this gate is passed.**

**THIS IS THE MOST IMPORTANT STEP IN THE ENTIRE SKILL. The agent has failed this gate 9 out of 11 times. The failure mode is ALWAYS the same: the agent sees rich older content in search snippets, feels a thin report is "wrong," and rationalizes widening the window. A thin report IS the correct output. You MUST resist this.**

**COMMON FAILURE: fetching "to check the date."** The agent often fetches URLs before applying the date gate, rationalizing that it needs to verify dates via the `published_date` field. This is WRONG. The gate runs on SNIPPET data — dates visible in snippet text, URL paths, titles, and LinkedIn activity IDs. If the snippet doesn't show a date within the last 7 days, the URL is OUT. Do NOT fetch it "to be sure." Fetching is expensive (timeouts, rate limits) and defeats the purpose of the gate.

**LinkedIn activity ID date trick:** LinkedIn post URLs contain an activity ID (e.g., `activity-7460146798280507392`). **Do NOT use the Twitter snowflake formula** (`(id >> 22) + 1288834974657`) — it produces garbage dates (2066+) for LinkedIn IDs. Instead, use the **prefix heuristic**: the first 5 digits of the activity ID correlate roughly with calendar dates. Calibration points (as of mid-2026): `74572` ≈ May 4, `74601` ≈ May 13. Extrapolate at ~3.2 units/day. If the prefix is clearly weeks below today's expected value, it's OUT without fetching.

**⚠️ LinkedIn snippet "Xd ago" trap:** LinkedIn search snippets often include a sidebar of OTHER posts by the same author (e.g., "TinyFish 4d · We Shipped an MCP Server"). The "4d" label belongs to a *different post*, NOT the one in the URL. Always date-gate by the activity ID in the URL, never by relative-time labels in the snippet — they are almost always from adjacent feed items.

For every search result from Step 2:
1. **Check the snippet for a date.** Look for dates in the snippet text, URL path, or title.
2. **Classify as IN or OUT.** A source is IN only if its date falls within the last 7 days from today's date. No date visible = OUT. Ambiguous date = OUT. **Exception for X tweets and YouTube:** these have reliable programmatic date extraction (snowflake IDs for tweets, `publishDate` in YouTube HTML) — use those techniques in the same `execute_code` block rather than discarding as "no date."
3. **Drop every OUT source NOW.** Do not fetch it. Do not save it for "context." It does not exist.
4. **Count what's left.** If 0 sources remain, SKIP Steps 4-5 entirely. The report is: "No verifiable discussion found in the last 7 days." Full stop. Do not pad the report with older material.
5. **State ONE line** before proceeding: "📅 7-day filter: N of M sources passed." Do NOT show the full table.

**NO EXCEPTIONS. NO RATIONALIZING. NO "expanded slightly to capture X." NO "context from older sources." NO "fetching to verify the date." If it's older than 7 days, it's DEAD. A 2-line report saying "nothing found this week" is infinitely better than a 50-line report full of stale data.**

### Step 4 — Fetch ONLY the sources that passed the date gate

Fetch 5–15 URLs from the IN list only. Prioritize:
1. Active discussion threads (Reddit, HN, forums) — these have real opinions
2. Recent news articles — for factual context
3. Review/comparison posts — for structured sentiment
4. LinkedIn posts — try fetching, fall back to snippets if auth wall
5. **Skip X/Twitter URLs** — use search snippets directly (X blocks non-JS fetches)

```bash
tinyfish fetch content get --format markdown \
  "https://reddit.com/r/..." \
  "https://news.ycombinator.com/item?id=..." \
  "https://techcrunch.com/..."
```

**Second date verification during fetch:** Check the `published_date` field in every fetch response. If it's older than 7 days, DISCARD the result immediately even if it passed the snippet gate — snippets can have misleading dates. For Reddit, also check the relative date in the post content (e.g., "7d ago", "2mo ago").

### Step 5 — Synthesize the listening report

Structure the output as a **Social Listening Report**:

```markdown
# Social Listening Report: {Brand/Topic}
**Period:** {date range} · **Sources:** {count} across {channel types}

## Sentiment
{One-paragraph executive summary: positive/negative/mixed ratio, trending direction, key theme}

## Key Discussions
1. **[{Thread/article title}](url)** — {platform}, {date} — {summary + sentiment + standout quote if any}
2. ...

Embed praise, criticism, and notable quotes INSIDE each discussion entry rather than repeating them in separate sections. Each discussion should cover what was said (positive and negative) in one place.

## Emerging Themes
- {Pattern spotted across multiple sources}

## Competitor Mentions (if relevant)
- {Competitor}: {how they were mentioned} — [source](url)

## Gaps & Caveats
- {Platforms not covered, auth walls, thin data}
```

**Report style rules:**
- Do NOT create separate "What People Love" / "What People Criticize" / "Notable Quotes" sections — fold those into Key Discussions to avoid repeating the same sources and quotes across multiple sections.
- Each source should appear ONCE in the report. If a Reddit thread contains both praise and criticism, cover both under that thread's Key Discussion entry.
- Adapt depth to the user's request — a quick "buzz check" gets a shorter summary, a comprehensive audit gets the full template.

---

## Recurring Monitoring

If the user wants ongoing tracking, suggest a cron job:

```
Run this social listening report for {brand} every {Monday morning / daily / weekly}.
Compare against previous results and highlight what changed.
```

For recurring runs, focus the report on **deltas**:
- New mentions since last check
- Sentiment shifts
- New discussion threads
- Emerging complaints or praise patterns

---

## Sentiment Classification Rules

Classify each source into sentiment buckets using these signals:

- **Positive**: praise words, recommendations, "switched to X and love it", high ratings, "best in class"
- **Negative**: complaints, "disappointed", "switched away", bug reports, "overpriced", "broken"
- **Neutral**: factual mentions, news coverage without opinion, documentation references
- **Mixed**: threads with both praise and complaints, "great product but..."

Count sources per bucket to give an overall sentiment ratio (e.g., "60% positive, 25% negative, 15% neutral").

Do NOT use ML sentiment analysis — classify manually from the actual text. It's more accurate for this use case.

---

## Gotchas

- **X/Twitter: snippets ONLY — no fetching, no browser** — X requires JavaScript rendering and blocks non-JS requests. `tinyfish fetch` will return empty "enable JavaScript" pages. Instead, use the **search result snippets** from `tinyfish search query "site:x.com {brand}"` as your X data source. Snippets contain the tweet text, author, and enough context for sentiment classification. Do NOT waste time trying to fetch X URLs — it will always fail. **⛔ Do NOT fall back to browser tools (browser_navigate, browser_vision, etc.) for X either.** The skill workflow is `tinyfish search` → snippets → report. If search snippets are thin, run MORE search query patterns with different keywords — do not switch tools. The browser requires login, is slow, and is not part of this workflow. State in the report that X coverage is snippet-based.
- **X/Twitter date gating via tweet ID decoding** — Tweet URLs contain a status ID (e.g., `x.com/user/status/2057955663125623243`). You can decode the exact date using the Twitter snowflake formula: `datetime.utcfromtimestamp(((int(tweet_id) >> 22) + 1288834974657) / 1000)`. This is the ONLY reliable way to date-gate X results — snippets rarely contain dates. Extract the status ID with regex `r'x\.com/\w+/status/(\d+)'`, decode, and drop anything outside the 7-day window. Profile page URLs (no `/status/`) are undateable — discard them.
- **X/Twitter search requires MULTIPLE query patterns** — A single `site:x.com "brand"` query returns mostly profile pages (`x.com/username`) and search pages, NOT individual tweets. The 3 mandatory patterns in Step 2a are specifically designed to return `/status/` URLs. If you skip Step 2a or use generic `site:x.com` queries instead, you WILL miss 80%+ of X activity. This has happened repeatedly. The handle MUST be resolved first in Step 1.5 — do NOT guess it.
- **LinkedIn posts are partially fetchable**
- **Search engines ignore date constraints** — This is the #1 pitfall. Queries like "brand today" or "brand 2026-05-25" will still return results from months or years ago. You MUST verify dates independently via `published_date` in fetch results, or date indicators in the content itself (e.g., "7d ago" on Reddit). Never trust search recency — always verify.
- **Brand name collisions in QUERIES, not filters** — common words as brand names (e.g., "Apple", "Mercury") will return irrelevant results. Add product-specific terms to **search queries** to disambiguate: `"Mercury bank" NOT "mercury planet"`. Note: "TinyFish" itself is collision-prone — Reddit searches return watercolor paintings, aquarium fish, and fishing games. Add `AI OR agent OR web OR scraping` or use `tinyfish.ai` in quotes **in the query itself**. However, once results come back, the **relevance filter must only check two things**: (1) does the result mention the brand name? (2) is it within the 7-day window? Do NOT apply a secondary quality/signal-word gate (e.g., requiring "AI", "agent", "API" in the snippet). That over-filters and drops legitimate mentions — someone tweeting about TinyFish without using the word "agent" is still a valid mention. Disambiguation belongs in search queries, not in post-search filtering.
- **YouTube fetch returns empty content** — `tinyfish fetch` on YouTube URLs returns only boilerplate (About/Press/Copyright). For date verification, use `curl -s "URL" | grep -o '"publishDate":"[^"]*"'` which reliably extracts the ISO date from YouTube's embedded JSON-LD. For video descriptions, use `curl -s "URL" | grep -o '"shortDescription":"[^"]*"'` and unescape `\\n`. For channel name, use `grep -o '"ownerChannelName":"[^"]*"'`. **macOS note:** Do NOT use `grep -P` (PCRE) — macOS grep doesn't support it. Use `grep -o` with basic or extended (`-E`) regex only.
- **`tinyfish fetch` + piped parsing timeouts** — LinkedIn fetches via `tinyfish fetch ... | python3 -c "..."` in `terminal()` frequently time out (>30s). The reliable pattern is to use `execute_code` with `from hermes_tools import terminal` — this gives you a Python environment where you can call terminal and parse the JSON result without pipe overhead. Alternatively, fetch WITHOUT `--format markdown` to reduce latency.
- **Reddit date verification is unreliable** — Multiple approaches fail: `tinyfish fetch` times out (>30s), `curl` to `old.reddit.com` returns no `datetime=` tags (likely bot-blocked), and Reddit's `.json` API returns empty responses. The only working heuristic is relative dates in search snippets ("7d ago", "2mo ago", "3 hours ago") — but these are often absent. If a Reddit thread has no dateable signal in the snippet, it's OUT. Do NOT waste time trying to fetch Reddit just to verify the date.
- **Reddit rate limits** — TinyFish handles the fetching, but very long threads may be truncated. Fetch the top 2–3 threads rather than trying to get all of them.
- **Recency bias** — search results skew toward recent and popular content. Explicitly note if you're missing older context.
- **Platform gaps** — TinyFish Search covers the indexed web. Private Slack groups, Discord servers, and locked social posts won't appear. Note this limitation in the report.
- **Sarcasm and context** — read full context before classifying sentiment. A quote like "great, another outage" is negative.
- **Owned vs. earned media** — filter out the brand's own blog posts, press releases, and marketing pages unless the user explicitly wants to audit owned media presence.
- **Don't hallucinate sentiment** — if search results are thin, say so. "Limited public discussion found" is better than fabricating a narrative.

## Important Rules

- **Use `tinyfish search`, NOT `tinyfish agent`** — search is fast and cheap. Agent is for interactive browser automation and is overkill for listening sweeps.
- **Fetch real pages** — always fetch and read sources before classifying sentiment. Don't rely solely on snippets.
- **ALWAYS link to sources** — every single claim, quote, data point, or sentiment observation in the report MUST include a clickable URL to the specific source. No exceptions. If you can't link it, don't include it. Use inline markdown links: `[source](url)`. For quotes, link the platform and thread. For discussions, link the exact thread URL. For news, link the article. The reader should be able to click through and verify every statement in the report.
- **Show the ratio** — always include a sentiment breakdown (positive/negative/neutral count or percentage).
- **Be honest about gaps** — note which channels you couldn't cover and what might be missing.

## References

- https://docs.tinyfish.ai/search-api
- https://docs.tinyfish.ai/fetch-api
- https://docs.tinyfish.ai/for-coding-agents
