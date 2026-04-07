---
name: freelance-gig-finder
description: Find fresh freelance and contract opportunities across multiple platforms for any skill set. Use this skill when a user asks "find me freelance React jobs", "Upwork gigs for Python developers", "freelance work posted this week", "contract jobs for designers", "find me remote freelance opportunities for [skill]", "I'm looking for freelance work", "what freelance gigs are available for [skill]", or any request to find paid freelance or contract work online.
---

# Freelance Gig Finder

Search Upwork, Contra, We Work Remotely, Freelancer, and Toptal simultaneously for fresh freelance and contract opportunities matching your skill set — filtered to recent postings so you're not looking at stale listings.

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
- **Skill or role** — e.g. `React developer`, `Python`, `UI/UX designer`, `copywriter`, `DevOps`, `mobile developer`
- **Budget preference** (optional) — e.g. `hourly`, `fixed price`, `$50+/hr`
- **Recency** (optional) — default to listings posted in the last 7 days

If skill is not provided, ask before proceeding.

---

## Step 2 — Parallel search

Fire all agents simultaneously.

```bash
# Agent 1 — Upwork
tinyfish agent run \
  --url "https://www.upwork.com/nx/search/jobs/?sort=recency&q={SKILL_ENCODED}" \
  "You are on Upwork job search results for '{SKILL}', sorted by most recent.
   Extract the first 8 visible job listings.
   For each listing extract:
   - title
   - client description snippet (what they need)
   - budget (hourly rate range or fixed price if shown)
   - posted time (e.g. '2 hours ago', 'yesterday')
   - required skills listed
   - job type (hourly/fixed)
   - direct URL to the listing
   STRICT RULES:
   - Do NOT click any listing
   - Read only what is visible in the search result cards
   - Only include listings posted within the last 7 days
   - Maximum 8 listings then stop
   Return JSON array: [{title, description, budget, posted, skills: [], job_type, url}]" \
  --sync > /tmp/fg_upwork.json &

# Agent 2 — Contra
tinyfish agent run \
  --url "https://contra.com/opportunities?query={SKILL_ENCODED}&sort=recent" \
  "You are on Contra job listings for '{SKILL}', sorted by newest.
   Extract the first 8 visible job listings.
   For each listing extract:
   - title
   - client/company name
   - description snippet
   - budget or rate (if shown)
   - posted time
   - required skills
   - direct URL
   STRICT RULES:
   - Do NOT click any listing
   - Read only what is visible in the listing cards
   - Maximum 8 listings then stop
   - If no results found, return {found: false}
   Return JSON array: [{title, client, description, budget, posted, skills: [], url}]" \
  --sync > /tmp/fg_contra.json &

# Agent 3 — We Work Remotely
tinyfish agent run \
  --url "https://weworkremotely.com/remote-jobs/search?term={SKILL_ENCODED}" \
  "You are on We Work Remotely job search results for '{SKILL}'.
   Extract the first 8 visible job listings.
   For each listing extract:
   - title
   - company name
   - category (e.g. Front-End, Back-End, Design, etc.)
   - posted date
   - direct URL to the listing
   STRICT RULES:
   - Do NOT click any listing
   - Read only what is visible in the search results
   - Maximum 8 listings then stop
   - If no results, return {found: false}
   Return JSON array: [{title, company, category, posted, url}]" \
  --sync > /tmp/fg_wwr.json &

# Agent 4 — Freelancer.com
tinyfish agent run \
  --url "https://www.freelancer.com/jobs/?keyword={SKILL_ENCODED}" \
  "You are on Freelancer.com job listings for '{SKILL}'.
   Extract the first 8 visible job listings.
   For each listing extract:
   - title
   - budget range (fixed or hourly)
   - number of bids (if shown)
   - posted time
   - required skills listed
   - direct URL
   STRICT RULES:
   - Do NOT click any listing
   - Read only what is visible in the listing cards
   - Maximum 8 listings then stop
   Return JSON array: [{title, budget, bids, posted, skills: [], url}]" \
  --sync > /tmp/fg_freelancer.json &

# Agent 5 — LinkedIn (contract/freelance filter)
tinyfish agent run \
  --url "https://www.linkedin.com/jobs/search/?keywords={SKILL_ENCODED}&f_JT=C%2CF&f_WT=2&sortBy=DD" \
  "You are on LinkedIn job search results for '{SKILL}' filtered to Contract and Freelance jobs, remote, sorted by most recent.
   Extract the first 8 visible job listings.
   For each listing extract:
   - title
   - company name
   - location or remote status
   - posted time
   - salary or rate if shown
   - direct URL
   STRICT RULES:
   - Do NOT click any listing
   - Read only what is visible in the job cards
   - Maximum 8 listings then stop
   Return JSON array: [{title, company, location, posted, salary, url}]" \
  --sync > /tmp/fg_linkedin.json &

wait

echo "=== UPWORK ===" && cat /tmp/fg_upwork.json
echo "=== CONTRA ===" && cat /tmp/fg_contra.json
echo "=== WWR ===" && cat /tmp/fg_wwr.json
echo "=== FREELANCER ===" && cat /tmp/fg_freelancer.json
echo "=== LINKEDIN ===" && cat /tmp/fg_linkedin.json
```

**Before running**, replace:
- `{SKILL}` — e.g. `React developer`
- `{SKILL_ENCODED}` — URL-encoded e.g. `React%20developer`

---

## Step 3 — Filter and present

From all results, deduplicate any listings that appear on multiple platforms and filter to only show listings posted within the last 7 days. Sort by recency — newest first.

```
## Freelance Gigs — {SKILL}
*Scraped live from Upwork · Contra · We Work Remotely · Freelancer · LinkedIn*
*{N} listings found · Posted in the last 7 days · {date}*

---

### 🔥 Fresh Listings

#### {Title}
**Platform:** {platform} · **Posted:** {posted}
**Budget:** {budget or rate}
**Skills:** {skills}
{description snippet}
🔗 {url}

---

#### {Title}
[same structure]

---
[up to 15 listings total, sorted by most recent]

---

### 📊 Quick Summary

| Platform | Listings Found | Avg Budget |
|---|---|---|
| Upwork | {n} | {avg} |
| Contra | {n} | - |
| We Work Remotely | {n} | - |
| Freelancer | {n} | {avg} |
| LinkedIn | {n} | {avg} |

---

### 💡 Tips for These Listings
{1-2 sentences of context — e.g. "Upwork has the most volume but high competition. Contra listings tend to be higher quality clients at better rates. LinkedIn contract roles are typically longer engagements."}
```

---

## Edge Cases

- **Upwork requires login to view listings** — extract whatever is visible before the gate, note the limitation
- **No listings found for skill** — try alternative phrasings (e.g. "React" → "React.js", "frontend developer"; "Python" → "Python developer", "Django")
- **Very niche skill** — We Work Remotely and LinkedIn may have the richest results; Upwork/Freelancer tend to have more volume for common skills
- **User wants a specific budget range** — add budget filters to Upwork and Freelancer URLs before running
- **User is in a specific country** — note that Upwork and Freelancer are global but some listings are location-restricted; LinkedIn can be filtered by country
- **All platforms return few results** — suggest the user check back in a few days or broaden the skill (e.g. "React" instead of "React Native")
