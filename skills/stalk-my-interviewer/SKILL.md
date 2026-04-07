---
name: stalk-my-interviewer
description: Research an interviewer online before a meeting using parallel TinyFish agents and return a structured prep report. Use this skill when a user says "research my interviewer", "I have an interview with [name] at [company]", "stalk my interviewer", "find out about [person] before my interview", "who is my interviewer", "prepare for interview with [name]", "look up my interviewer", or any request to learn about a specific person before meeting them professionally.
---

# Stalk My Interviewer

Deploy parallel TinyFish agents to research an interviewer across LinkedIn, GitHub, Twitter/X, news, and conference platforms — then synthesize a structured prep report so you walk in knowing exactly who you're talking to.

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
> ```
> tinyfish auth login
> ```

Do NOT proceed until both checks pass.

---

## Step 1 — Gather inputs

You need:
- **Interviewer's full name** — e.g. "Sarah Chen"
- **Company** — e.g. "Stripe", "Anthropic", "Linear"
- **Role you're interviewing for** (optional but improves output) — e.g. "Senior Software Engineer"

If any are missing, ask before proceeding. If the name is very common (e.g. "John Smith"), ask for company and role to disambiguate before searching.

---

## Step 2 — Parallel research

Fire all agents simultaneously. Every agent searches a different surface — run them all at once using `&` + `wait`.

```bash
# Agent 1 — LinkedIn
tinyfish agent run \
  --url "https://www.linkedin.com/search/results/people/?keywords={FULL_NAME_ENCODED}+{COMPANY_ENCODED}" \
  "You are on a LinkedIn people search results page. Find the profile for {FULL_NAME} who works or worked at {COMPANY}.
   Click the most relevant result.
   On their profile extract:
   - Current job title and company
   - Previous roles (last 3 positions: title, company, duration)
   - Education (degrees, institutions)
   - Skills listed (top 10)
   - Summary / About section (if visible)
   - How long they have been at {COMPANY}
   STRICT RULES:
   - Click only the most relevant profile result — do not browse multiple profiles
   - Do NOT scroll more than twice on the profile page
   - If the page asks you to log in, extract whatever is visible before the gate and return it
   - Do NOT click any other links
   Return JSON: {name, current_title, current_company, tenure_at_company, previous_roles: [{title, company, duration}], education: [{degree, institution}], skills: [], summary}" \
  --sync > /tmp/smi_linkedin.json &

# Agent 2 — GitHub (relevant if role is technical)
tinyfish agent run \
  --url "https://github.com/search?q={FULL_NAME_ENCODED}+{COMPANY_ENCODED}&type=users" \
  "You are on GitHub user search results for {FULL_NAME} at {COMPANY}.
   Find the most likely profile match. Click it.
   On their GitHub profile extract:
   - Username
   - Bio
   - Location
   - Company listed on profile
   - Pinned repositories (name, description, language, stars)
   - Most used programming languages (visible in stats or repos)
   - Any notable open source contributions or projects
   STRICT RULES:
   - Click only the single most relevant result
   - Do NOT navigate to individual repos
   - Read only what is visible on their profile page
   - If no clear match found, return {found: false}
   Return JSON: {found: bool, username, bio, location, pinned_repos: [{name, description, language, stars}], languages: [], notable_work}" \
  --sync > /tmp/smi_github.json &

# Agent 3 — Twitter/X
tinyfish agent run \
  --url "https://x.com/search?q={FULL_NAME_ENCODED}+{COMPANY_ENCODED}&src=typed_query&f=user" \
  "You are on Twitter/X user search results for {FULL_NAME} at {COMPANY}.
   Find the most likely profile match. Click it.
   On their Twitter profile extract:
   - Display name and handle
   - Bio
   - Pinned tweet (if any)
   - Topics they tweet about most (infer from visible tweets — read up to 10)
   - Any strong opinions or recurring themes
   - Approximate tweet frequency / activity level
   STRICT RULES:
   - Click only the most relevant profile
   - Read only the first 10 visible tweets — do NOT scroll further
   - Do NOT click any tweet links or replies
   - If no match found, return {found: false}
   Return JSON: {found: bool, handle, bio, pinned_tweet, topics: [], opinions: [], activity_level}" \
  --sync > /tmp/smi_twitter.json &

# Agent 4 — Google News & web mentions
tinyfish agent run \
  --url "https://www.google.com/search?q=\"{FULL_NAME_ENCODED}\"+\"{COMPANY_ENCODED}\"&tbm=nws" \
  "You are on Google News search results for {FULL_NAME} at {COMPANY}.
   Read the titles and snippets of the first 10 visible news results.
   Extract:
   - Any articles authored by or quoting {FULL_NAME}
   - Key topics they are associated with in the news
   - Any notable achievements, announcements, or controversies mentioned
   STRICT RULES:
   - Do NOT click any article links
   - Read only titles and snippets visible in the search listing
   - Maximum 10 results then stop
   Return JSON: {mentions: [{title, snippet, source, date}], topics: [], authored_articles: []}" \
  --sync > /tmp/smi_news.json &

# Agent 5 — Company engineering blog
tinyfish agent run \
  --url "https://www.google.com/search?q=site:{COMPANY_DOMAIN}+\"{FULL_NAME_ENCODED}\"" \
  "You are on Google search results filtered to {COMPANY}'s website for content authored by or mentioning {FULL_NAME}.
   Read the visible results.
   Extract:
   - Any blog posts, articles, or pages authored by {FULL_NAME}
   - Topics they write about at the company
   - Any technical decisions or opinions expressed
   STRICT RULES:
   - Do NOT click any result links
   - Read only titles and snippets from the search listing
   - Maximum 8 results then stop
   - If no results, return {found: false}
   Return JSON: {found: bool, articles: [{title, snippet, url, topic}]}" \
  --sync > /tmp/smi_blog.json &

# Agent 6 — Conference talks
tinyfish agent run \
  --url "https://www.google.com/search?q=\"{FULL_NAME_ENCODED}\"+\"{COMPANY_ENCODED}\"+(talk+OR+keynote+OR+conference+OR+speaker+OR+presentation)" \
  "You are on Google search results for conference talks and presentations by {FULL_NAME} at {COMPANY}.
   Read the visible results.
   Extract any conference talks, keynotes, podcast appearances, or panel discussions they have participated in:
   - Talk title
   - Event name
   - Year
   - Topic / summary from the snippet
   STRICT RULES:
   - Do NOT click any links
   - Read only titles and snippets
   - Maximum 8 results then stop
   - If no results, return {found: false}
   Return JSON: {found: bool, talks: [{title, event, year, topic}]}" \
  --sync > /tmp/smi_talks.json &

# Wait for all agents to complete
wait

echo "=== LINKEDIN ===" && cat /tmp/smi_linkedin.json
echo "=== GITHUB ===" && cat /tmp/smi_github.json
echo "=== TWITTER ===" && cat /tmp/smi_twitter.json
echo "=== NEWS ===" && cat /tmp/smi_news.json
echo "=== BLOG ===" && cat /tmp/smi_blog.json
echo "=== TALKS ===" && cat /tmp/smi_talks.json
```

**Before running**, replace:
- `{FULL_NAME}` — e.g. `Sarah Chen`
- `{FULL_NAME_ENCODED}` — URL-encoded e.g. `Sarah%20Chen`
- `{COMPANY}` — e.g. `Stripe`
- `{COMPANY_ENCODED}` — URL-encoded e.g. `Stripe`
- `{COMPANY_DOMAIN}` — e.g. `stripe.com` (infer from company name for well-known companies; ask the user if unsure)

---

## Step 3 — Synthesize the prep report

Combine all results into a structured report. Only include sections where real data was found — do not pad with guesses.

```
## Interviewer Research Report — {FULL_NAME}, {COMPANY}
*Researched: {date}*

---

### 👤 Background
**Current role:** {title} at {company} ({tenure})
**Career path:** {brief summary of career trajectory — 2-3 sentences}
**Education:** {degrees and institutions}

---

### 💻 Technical Profile
**Languages / Stack:** {programming languages and technologies found}
**Open source:** {notable repos or contributions, if any}
**What they build / have built:** {summary from GitHub and blog posts}

*(Skip this section if no technical data found)*

---

### 🧠 What They Care About
**Recurring themes:** {topics that appear across Twitter, blog posts, talks}
**Strong opinions:** {any publicly stated views on tech, engineering culture, product, etc.}
**Published work:** {blog posts, articles, talks — with topics}

---

### 🎤 Conference & Public Presence
{List of talks or appearances found, with event and year}
*(Skip if none found)*

---

### 💬 Suggested Conversation Starters
Based on what you found, specific things you can bring up naturally:
- {specific thing they worked on or wrote about}
- {specific opinion or project they're known for}
- {something from a talk or article that genuinely interests you}

---

### 🎯 How to Tailor Your Interview
Given their background, here's what to emphasize:
- {specific advice based on their career path, seniority, or technical focus}
- {what signals they likely care about based on their public work}
- {anything to be aware of — e.g. if they wrote critically about X, show you've thought about it}

---

### ⚠️ Gaps in Research
{List any sources that returned no data or were blocked, so the user knows what's missing}
```

---

## Edge Cases

- **LinkedIn blocked or requires login** — extract whatever is visible before the gate, note the limitation, rely more heavily on other sources
- **Very common name** — if search results are ambiguous, stop and ask the user for more context (company URL, LinkedIn profile link, Twitter handle) before proceeding
- **No public presence found** — be honest: "Limited public information found for {name} at {company}. Here's what was found: [minimal data]. You may want to ask your recruiter for more context or search on LinkedIn directly."
- **Person is very senior (VP, C-suite)** — news and company blog will be richest; GitHub and Twitter may be sparse
- **Person is very junior** — GitHub may be the richest source; news and talks likely empty
- **Role is non-technical** — skip the GitHub agent entirely, weight LinkedIn and blog/news more heavily
