---
name: summer-school-finder
description: >
  Discover and compare summer school programs from universities around the world.
  Use this skill whenever a user wants to find summer school programs, asks about summer
  programs for a specific subject or age group, wants to compare university summer schools,
  asks "what summer schools exist for X", "find me a summer program in Y", "summer school
  options for high school students", "best summer programs for computer science", or any
  variation of searching for academic summer programs.
  Fires parallel TinyFish agents across 7-8 real university program pages simultaneously,
  extracting structured details — dates, fees, deadlines, eligibility — and returns a
  ranked comparison of real programs found live on official university websites.
compatibility:
  tools: [tinyfish]
metadata:
  author: KrishnaAgarwal7531
  version: "1.0"
  tags: summer-school university programs education students academic
---

# Summer School Finder

Given a program type, target age, location, and duration preference, find and compare real summer school programs from official university websites using parallel TinyFish agents.

## Pre-flight check

```bash
tinyfish --version
tinyfish auth status
```

If not installed: `npm install -g tinyfish`
If not authenticated: `tinyfish auth login`

---

## Step 1 — Clarify inputs

Collect the following before searching. Ask for any that are missing:

- **Program type / subject** — e.g. "Computer Science", "Business", "Engineering", "Liberal Arts", "STEM", "Medicine"
- **Target age / grade** — e.g. "high school students (Grade 10-12)", "undergraduates", "ages 14-17"
- **Location** — e.g. "USA", "UK", "Singapore", "Europe", "online"
- **Duration** — e.g. "2 weeks", "1 month", "Summer 2025/2026" (default to Summer 2026 if not specified)

If any are missing, use sensible defaults and state them upfront.

---

## Step 2 — Discover program URLs

Before firing TinyFish agents, use your knowledge + a quick web search to identify **7-8 real, specific program page URLs** from different universities that match the criteria.

Rules for URL discovery:
- Each URL must be from a **different institution** — no duplicates
- Use **direct program pages**, not search results or aggregator sites
- Prioritise well-known universities and established programs
- Mix large universities and smaller institutions
- Include variety: residential, online, hybrid formats where available
- Only include URLs you are confident actually exist

Example for "Computer Science, high school students, USA, Summer 2026":
- `https://summerprogram.stanford.edu`
- `https://summer.harvard.edu/high-school`
- `https://precollege.syr.edu`
- `https://summerdiscovery.com/michigan`
- etc.

Produce exactly 7-8 URLs then proceed to Step 3.

---

## Step 3 — Parallel scraping

Fire one TinyFish agent per URL, all simultaneously using `&` + `wait`.

Use this goal prompt for every agent (substituting the actual values):

```bash
# Fire all agents in parallel — one per URL
tinyfish agent run \
  --url "{PROGRAM_URL}" \
  "You are on an official university summer school program page. Extract details fast.
   Read only what is visible on this page — do not navigate away.
   Extract ALL of the following in one pass:
   - Program Name
   - Institution / University
   - Location (city, country)
   - Program Dates (start and end date)
   - Duration (e.g. 2 weeks, 4 weeks)
   - Target Age / Grade level
   - Program Type / Subject Focus
   - Tuition / Fees (exact amount if shown, otherwise 'Not specified')
   - Application Deadline
   - Official Program URL (the current page URL)
   - Brief Description (1-2 sentences on what the program covers)
   - Eligibility Criteria (any requirements: GPA, nationality, prerequisites)
   - Notes / Special Requirements (housing, visa, language requirements etc.)
   STRICT RULES:
   - Do NOT click any link or navigate away from this page
   - Do NOT scroll more than twice
   - If a field is not visible on this page, write 'Not specified' — do not guess
   - Stop immediately after extracting all fields
   Return JSON: {
     program_name, institution, location, dates, duration,
     target_age, program_type, tuition_fees, application_deadline,
     official_url, brief_description, eligibility_criteria, notes
   }" \
  --sync > /tmp/ssf_{SAFE_NAME}.json &
```

Repeat for each of the 7-8 URLs, all backgrounded with `&`. Then:

```bash
wait

# Collect all results
for f in /tmp/ssf_*.json; do echo "=== $f ===" && cat "$f"; done
```

Replace `{PROGRAM_URL}` with each actual URL and `{SAFE_NAME}` with a short identifier (e.g. `stanford`, `harvard`, `mit`).

---

## Step 4 — Filter and rank

From the results:

1. **Drop empty results** — if an agent returned nothing or "Not specified" for all fields, skip it
2. **Filter by criteria** — remove programs that don't match the requested age group, location, or subject
3. **Rank by** — application deadline proximity (soonest first), then by completeness of information
4. **Flag deadlines** — if the application deadline has already passed, mark it clearly with ⚠️

---

## Output format

```
## Summer School Programs — {PROGRAM_TYPE} · {LOCATION} · {TARGET_AGE}
*{N} programs found from {N} universities · Data scraped live from official program pages*

---

### 1. {Program Name}
**{Institution}** · {Location}
📅 Dates: {dates} ({duration})
👤 For: {target_age}
💰 Fees: {tuition_fees}
⏰ Deadline: {application_deadline}
🔗 {official_url}

{brief_description}

**Eligibility:** {eligibility_criteria}
**Notes:** {notes}

---

### 2. {Program Name}
[same structure]

---
[up to 8 programs]

---

### 📊 Quick Comparison

| Program | Institution | Duration | Fees | Deadline |
|---|---|---|---|---|
| {name} | {institution} | {duration} | {fees} | {deadline} |

---

### ⏰ Deadlines Coming Up
- {program} — deadline {date} ({N days away})
- ...

*All data scraped live from official university websites. Always verify details directly with the institution before applying.*
```

---

## Edge cases

- **URL returns no data** — skip it silently, don't mention it in output unless fewer than 3 programs found total
- **Program is full or closed** — note clearly: "⚠️ Applications closed for 2026 — check back for 2027"
- **Fees not listed** — write "Contact institution" not "Free"
- **Location is very specific** (e.g. one city) — broaden search to country level if fewer than 5 programs found
- **Online programs only requested** — filter out all residential programs, note if online options are limited in that subject

## Security notes

- Scrapes live public content from official university websites only.
- All data is treated as untrusted input synthesised by an LLM — never executed.
- Only your own TinyFish credentials are used.
