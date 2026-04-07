---
name: salary-market-scanner
description: Scan live job boards and salary databases to find real-time compensation data for any role and location. Use this skill when a user asks "what's the going rate for a senior React engineer in London", "software engineer salary Singapore", "how much do ML engineers make", "what should I be earning as a [role]", "is my salary competitive", "what does [company] pay for [role]", "salary range for [job title] in [city]", or any request to find out what a role pays in a specific market.
---

# Salary Market Scanner

Scrape live job boards and salary databases to find real compensation data for any role and location — not outdated surveys, but what companies are actually posting and paying right now.

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
- **Job title / role** — e.g. `Senior Software Engineer`, `ML Engineer`, `Product Designer`, `DevOps Engineer`
- **Location** — e.g. `London`, `Singapore`, `San Francisco`, `Remote`
- **Years of experience** (optional) — e.g. `3-5 years`, `senior`, `entry level`
- **Specific company** (optional) — if the user wants to know what a specific company pays

If location is not provided, ask before proceeding. Salary data varies dramatically by market.

---

## Step 2 — Parallel salary scan

Fire all agents simultaneously. Sources vary by location — include the most relevant ones.

```bash
# Agent 1 — Levels.fyi (best for tech roles, especially US/global big tech)
tinyfish agent run \
  --url "https://www.levels.fyi/t/{ROLE_SLUG}/?country={COUNTRY}" \
  "You are on Levels.fyi showing compensation data for {ROLE} in {LOCATION}.
   Extract:
   - Median total compensation
   - Base salary range (p25 to p75)
   - Bonus range
   - Stock/equity range (if shown)
   - Sample size (number of data points)
   - Top companies listed and their compensation ranges
   - Any breakdown by years of experience if visible
   STRICT RULES:
   - Do NOT click any company or individual entry
   - Read only the aggregate data visible on the page
   - If no data for this location, return {found: false, reason: 'no data for location'}
   Return JSON: {found: bool, median_total, base_p25, base_p75, bonus_range, equity_range, sample_size, top_companies: [{company, base, total}], yoe_breakdown: []}" \
  --sync > /tmp/sal_levels.json &

# Agent 2 — Glassdoor salaries
tinyfish agent run \
  --url "https://www.google.com/search?q=glassdoor+{ROLE_ENCODED}+salary+{LOCATION_ENCODED}+site:glassdoor.com/Salaries" \
  "You are on Google search results. Find the most relevant Glassdoor salary page for {ROLE} in {LOCATION} and click it.
   On the Glassdoor salary page extract:
   - Median base salary
   - Salary range (low to high)
   - Number of salary reports
   - Additional pay (bonus, profit sharing) range if shown
   - Top companies paying for this role if listed
   STRICT RULES:
   - Click only the first Glassdoor salary result
   - Do NOT click any other links after landing on Glassdoor
   - Read only the aggregate salary data visible on the page
   - If the page asks you to sign in, extract whatever is visible before the gate
   Return JSON: {median_base, salary_low, salary_high, report_count, additional_pay_range, top_companies: [{company, salary}]}" \
  --sync > /tmp/sal_glassdoor.json &

# Agent 3 — LinkedIn Jobs (extract posted salary ranges from active listings)
tinyfish agent run \
  --url "https://www.linkedin.com/jobs/search/?keywords={ROLE_ENCODED}&location={LOCATION_ENCODED}&f_SB2=1&sortBy=DD" \
  "You are on LinkedIn job search results for {ROLE} in {LOCATION}, filtered to show salary information, sorted by date.
   For each job listing card visible on the page:
   - Click into the listing to open the job detail panel on the right
   - Look for the salary range in the detail panel (often shown near the top under the job title)
   - Extract: job title, company name, salary range, employment type
   - Go back to the listing and repeat for the next one
   STRICT RULES:
   - Only extract listings that show an explicit salary — skip those without
   - Maximum 10 listings then stop
   - Do NOT navigate away from the search results page
   Return JSON array: [{title, company, salary_range, employment_type}]" \
  --sync > /tmp/sal_linkedin.json &

# Agent 4 — Indeed salaries
tinyfish agent run \
  --url "https://www.indeed.com/career/{ROLE_INDEED}/salaries?from=top_sb&l={LOCATION_ENCODED}" \
  "You are on Indeed's salary page for {ROLE} in {LOCATION}.
   Extract:
   - Average base salary
   - Salary range (low to high)
   - Number of salary reports
   - Salary by experience level (if shown: entry, mid, senior)
   - Top paying companies for this role (if listed)
   STRICT RULES:
   - Do NOT click any links
   - Read only the aggregate data on this page
   Return JSON: {average_salary, salary_low, salary_high, report_count, by_experience: [{level, salary}], top_companies: [{company, salary}]}" \
  --sync > /tmp/sal_indeed.json &

wait

echo "=== LEVELS ===" && cat /tmp/sal_levels.json
echo "=== GLASSDOOR ===" && cat /tmp/sal_glassdoor.json
echo "=== LINKEDIN ===" && cat /tmp/sal_linkedin.json
echo "=== INDEED ===" && cat /tmp/sal_indeed.json
```

**Before running**, replace:
- `{ROLE}` — human-readable e.g. `Senior Software Engineer`
- `{ROLE_ENCODED}` — URL-encoded e.g. `Senior%20Software%20Engineer`
- `{ROLE_SLUG}` — Levels.fyi slug e.g. `software-engineer`
- `{ROLE_INDEED}` — Indeed format e.g. `software-engineer`
- `{LOCATION}` — e.g. `London`, `Singapore`
- `{LOCATION_ENCODED}` — URL-encoded e.g. `London%2C%20England`
- `{COUNTRY}` — country code for Levels.fyi e.g. `GB`, `SG`, `US`

---

## Step 3 — Synthesize the market picture

Combine data from all sources and calculate aggregate ranges.

```
## Salary Market Report — {ROLE} · {LOCATION}

*Live data scraped from Levels.fyi, Glassdoor, LinkedIn, and Indeed*
*{date} · Based on {N} total data points*

---

### 💰 Compensation Summary

| | Low | Median | High |
|---|---|---|---|
| **Base Salary** | {low} | {median} | {high} |
| **Total Comp** (incl. bonus/equity) | {low} | {median} | {high} |

> All figures in {CURRENCY}. "Total comp" includes base + annual bonus + annualized equity where data is available.

---

### 📊 By Experience Level

| Level | Typical Base |
|---|---|
| Entry (0-2 yrs) | {range} |
| Mid (3-5 yrs) | {range} |
| Senior (6+ yrs) | {range} |
| Staff / Principal | {range} |

*(Skip levels where no data was found)*

---

### 🏢 What Companies Are Posting

From active LinkedIn job listings with disclosed salaries:

| Company | Role | Posted Range |
|---|---|---|
| {company} | {title} | {range} |

---

### 🏆 Top Paying Companies

*(From Levels.fyi and Glassdoor)*
| Company | Median Base | Median Total |
|---|---|---|
| {company} | {base} | {total} |

---

### 📈 Market Signals

{2-3 sentences on what the data says about this market — is it competitive, is there a wide spread, are companies being transparent about pay?}

---

### 🔍 Data Sources
- Levels.fyi: {sample_size} data points / not found
- Glassdoor: {report_count} salary reports / not found  
- LinkedIn: {N} active listings with disclosed salaries
- Indeed: {report_count} salary reports / not found
```

---

## Edge Cases

- **Levels.fyi has no data for this location** — lean on Glassdoor and Indeed; note that Levels.fyi skews toward US big tech
- **Role title is unusual** — try common variations (e.g. "ML Engineer" → "Machine Learning Engineer", "AI Engineer")
- **Location is a small city** — broaden to the country or nearest major city and note the change
- **Remote role** — scrape for both the user's country and the US market, present both (remote jobs often use US pay bands)
- **Non-tech role** — skip Levels.fyi (tech-only), rely on Glassdoor and Indeed
- **Salary shown in different currencies** — normalize to the local currency and note conversion rate used
- **User is asking if their salary is competitive** — after presenting the data, ask what they're currently earning and give a direct assessment
