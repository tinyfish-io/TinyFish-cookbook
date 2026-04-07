---
name: tech-stack-detective
description: Reverse-engineer a company's tech stack from public signals — job listings, StackShare, GitHub, engineering blog, and their live website. Use this skill when a user asks "what tech does Stripe use", "what's Linear's stack", "what does Notion run on", "reverse engineer [company]'s tech stack", "what framework does [company] use", "how is [company] built", "what languages does [company] hire for", or any request to figure out what technology a company uses under the hood.
---

# Tech Stack Detective

Reverse-engineer any company's tech stack from public signals — job listings, StackShare, GitHub, engineering blog, and their live website — then return a layered map of what they actually run.

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
- **Company name** — e.g. `Stripe`, `Linear`, `Vercel`, `Notion`
- **Company domain** — e.g. `stripe.com` (infer from company name for well-known companies, ask if unsure)

Optional:
- **Area of interest** — e.g. "just the frontend", "their data pipeline", "what they use for auth" (if specified, focus the output on that layer)

---

## Step 2 — Parallel research

Fire all 5 agents simultaneously.

```bash
# Agent 1 — StackShare profile
tinyfish agent run \
  --url "https://stackshare.io/{COMPANY_SLUG}" \
  "You are on the StackShare profile for {COMPANY}.
   Extract their full tech stack as listed:
   - All tools and services listed under each category
   - Category names (e.g. Languages, Frameworks, Data Stores, DevOps, etc.)
   - Any tools listed as 'used by' this company
   STRICT RULES:
   - Do NOT click any tool links
   - Do NOT navigate away
   - Read only what is visible on this page
   - If the page returns 404 or no company found, return {found: false}
   Return JSON: {found: bool, stack: [{category, tools: []}]}" \
  --sync > /tmp/tsd_stackshare.json &

# Agent 2 — Job listings (tech signals from requirements)
tinyfish agent run \
  --url "https://www.linkedin.com/jobs/search/?keywords={COMPANY_ENCODED}+engineer" \
  "You are on LinkedIn job listings for {COMPANY}.
   Read the job titles and visible snippets for engineering roles.
   Extract all technologies, languages, frameworks, and tools mentioned in:
   - Job titles
   - Visible job description snippets
   Focus on: programming languages, frameworks, databases, cloud providers, tooling.
   STRICT RULES:
   - Do NOT click any job listing
   - Read only titles and visible preview text
   - Maximum 15 listings then stop
   - Deduplicate — list each technology once
   Return JSON: {technologies: [{name, category, mention_count}]}" \
  --sync > /tmp/tsd_linkedin.json &

# Agent 3 — GitHub organization
tinyfish agent run \
  --url "https://github.com/{COMPANY_SLUG}" \
  "You are on the GitHub organization page for {COMPANY}.
   Extract signals about their tech stack from public repositories:
   - Top 6 pinned or most-starred repositories
   - Primary programming languages used across repos (visible in language bars)
   - Any infrastructure or tooling repos (e.g. terraform, kubernetes configs, SDKs)
   - Any open source projects that reveal their internal stack
   STRICT RULES:
   - Do NOT click into any repository
   - Read only what is visible on the org page
   - If no org found, return {found: false}
   Return JSON: {found: bool, top_repos: [{name, description, language, stars}], languages: [], infra_signals: []}" \
  --sync > /tmp/tsd_github.json &

# Agent 4 — Engineering blog
tinyfish agent run \
  --url "https://www.google.com/search?q=site:{COMPANY_DOMAIN}+engineering+OR+blog+OR+tech" \
  "You are on Google search results for the engineering blog of {COMPANY} at {COMPANY_DOMAIN}.
   Find the engineering or tech blog URL, then read the visible post titles and snippets.
   Extract:
   - Technologies, tools, or architectural decisions mentioned in post titles and snippets
   - Any posts about infrastructure, scaling, or architecture decisions
   - Any open source tools they built or adopted
   STRICT RULES:
   - Do NOT click any links
   - Read only titles and snippets visible in search results
   - Maximum 10 results then stop
   Return JSON: {blog_url, tech_signals: [{technology, context}], architecture_posts: [{title, snippet}]}" \
  --sync > /tmp/tsd_blog.json &

# Agent 5 — Live website analysis
tinyfish agent run \
  --url "https://{COMPANY_DOMAIN}" \
  "You are on {COMPANY}'s homepage at {COMPANY_DOMAIN}.
   Analyze the page for frontend technology signals:
   - JavaScript framework clues (React, Vue, Angular, Svelte, etc.) — look for script tags, __NEXT_DATA__, __nuxt, ng-, data-reactroot, etc.
   - CSS framework signals (Tailwind classes, Bootstrap, etc.)
   - Analytics tools (Google Analytics, Segment, Mixpanel, etc.)
   - CDN or hosting signals (Vercel, Cloudflare, Fastly, etc.)
   - Any visible 'built with' or 'powered by' badges
   - Meta tags that reveal framework or CMS
   STRICT RULES:
   - Do NOT navigate away from the homepage
   - Read source signals from the visible page
   - Return only what you can confidently infer — do not guess
   Return JSON: {frontend_framework, css_framework, analytics: [], cdn_hosting, other_signals: []}" \
  --sync > /tmp/tsd_website.json &

wait

echo "=== STACKSHARE ===" && cat /tmp/tsd_stackshare.json
echo "=== JOBS ===" && cat /tmp/tsd_linkedin.json
echo "=== GITHUB ===" && cat /tmp/tsd_github.json
echo "=== BLOG ===" && cat /tmp/tsd_blog.json
echo "=== WEBSITE ===" && cat /tmp/tsd_website.json
```

**Before running**, replace:
- `{COMPANY}` — e.g. `Stripe`
- `{COMPANY_SLUG}` — lowercase, hyphenated e.g. `stripe`
- `{COMPANY_ENCODED}` — URL-encoded e.g. `Stripe`
- `{COMPANY_DOMAIN}` — e.g. `stripe.com`

---

## Step 3 — Synthesize the stack map

Combine signals from all sources. Assign a confidence level to each technology based on how many sources confirmed it:

- **High confidence** — mentioned in 3+ sources or explicitly listed on StackShare
- **Medium confidence** — mentioned in 2 sources or inferred from job listings
- **Low confidence** — mentioned in only 1 source or inferred from indirect signals

```
## Tech Stack — {COMPANY}

*Reverse-engineered from StackShare, job listings, GitHub, engineering blog, and live site analysis*
*Data fetched: {date}*

---

### 🖥️ Frontend
| Technology | Confidence | Source |
|---|---|---|
| {tech} | 🟢 High / 🟡 Medium / 🔴 Low | {sources} |

### ⚙️ Backend
| Technology | Confidence | Source |
|---|---|---|

### 🗄️ Data & Storage
| Technology | Confidence | Source |
|---|---|---|

### ☁️ Infrastructure & DevOps
| Technology | Confidence | Source |
|---|---|---|

### 📊 Analytics & Monitoring
| Technology | Confidence | Source |
|---|---|---|

### 🔧 Developer Tooling
| Technology | Confidence | Source |
|---|---|---|

---

### 🧠 Key Architectural Signals
{2-4 bullet points on notable architectural choices inferred from the research}
- e.g. "Strong Go + Rust signals in job listings suggest performance-critical backend services"
- e.g. "Multiple Kubernetes and Terraform repos on GitHub indicate heavy infrastructure-as-code culture"

---

### 🔍 Sources
- StackShare: {found / not found}
- Job listings: {N} engineering roles analyzed
- GitHub: {N} public repos
- Engineering blog: {blog_url or not found}
- Live site analysis: {COMPANY_DOMAIN}

### ⚠️ Low Confidence Items
{List technologies with only 1 source signal and what that signal was}
```

---

## Edge Cases

- **StackShare profile doesn't exist** — skip it, rely on other 4 sources, note the gap
- **Company GitHub org not found** — try common variations (`{company}hq`, `{company}-inc`, `{company}io`) before giving up
- **Private company with minimal public presence** — job listings and website analysis will be the richest sources; be upfront about confidence levels
- **Very large company** (Google, Meta, Amazon) — stack is extremely diverse; ask if the user wants a specific team or product area, otherwise summarize known public stacks
- **Startup with almost no public signals** — be honest: "Limited public signals found. Based on job listings alone: [findings]"
- **Company uses different names** on GitHub vs LinkedIn — use the domain as the anchor and note the discrepancy
