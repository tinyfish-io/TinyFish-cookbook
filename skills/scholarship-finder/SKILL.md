---
name: scholarship-finder
description: >
  Find real scholarships in real time for any scholarship type, university, and region using
  parallel TinyFish agents. Use this skill whenever a user wants to find scholarships, asks
  "find scholarships for computer science students", "what scholarships are available in the
  UK", "find merit scholarships at MIT", "scholarships for international students in Singapore",
  or any variation of searching for scholarship opportunities.
  Discovers 5-8 relevant scholarship sources in real time, then fires parallel TinyFish agents
  to scrape each source simultaneously — returning structured scholarship details with amounts,
  deadlines, eligibility, and application links.
compatibility:
  tools: [tinyfish]
metadata:
  author: KrishnaAgarwal7531
  version: "1.0"
  tags: scholarships funding education financial-aid university students
---

# Scholarship Finder

Given a scholarship type, university, and region, discover relevant scholarship sources in
real time and scrape them in parallel using TinyFish agents — returning structured results
with amounts, deadlines, eligibility, and application links.

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
- **Scholarship type** — e.g. "merit", "need-based", "STEM", "international student", "postgraduate", "sports"
- **University** (optional) — e.g. "MIT", "NUS", "Oxford". Leave blank for general search.
- **Region** (optional) — e.g. "USA", "UK", "Singapore", "Europe". Leave blank for worldwide.

If scholarship type is not specified, ask before proceeding.
Use sensible defaults for optional fields and state them upfront.

---

## Step 2 — Discover scholarship URLs

Before firing agents, identify 5-8 real, specific scholarship pages relevant to the inputs.
Use your knowledge and a quick web search to find direct URLs.

Rules:
- Each URL must be from a **different source** — no duplicates
- Mix: university financial aid pages, government scholarship portals, private foundation pages, scholarship aggregators
- Only include URLs you are confident actually exist
- Prioritise pages that list multiple scholarships over single-scholarship pages

Examples for "STEM scholarships, USA":
- `https://www.nsf.gov/funding/pgm_list.jsp`
- `https://studentaid.gov/understand-aid/types/scholarships`
- `https://www.fastweb.com/college-scholarships`
- `https://www.scholarships.com/financial-aid/college-scholarships/scholarships-by-major/engineering-scholarships/`
- University-specific financial aid pages

Produce 5-8 URLs then proceed to Step 3.

---

## Step 3 — Parallel scraping

Fire one TinyFish agent per URL, all simultaneously using `&` + `wait`.

```bash
# Fire all agents in parallel — one per URL
tinyfish agent run \
  --url "{SCHOLARSHIP_URL}" \
  "You are on a scholarship listing page. Extract scholarships fast.
   Read only what is visible on this page — do not navigate away.
   Find scholarships relevant to: type={SCHOLARSHIP_TYPE}, university={UNIVERSITY}, region={REGION}.
   For each scholarship extract ALL of the following in one pass:
   - name: full scholarship name
   - provider: organisation or institution offering it
   - amount: award amount (exact if shown, e.g. '$5,000/year' or 'Full tuition')
   - deadline: application deadline (exact date if shown)
   - eligibility: list of eligibility requirements (GPA, nationality, field of study, etc.)
   - description: 1-2 sentence description of what the scholarship is for
   - applicationRequirements: documents or steps needed to apply
   - additionalInfo: any other relevant details (renewable, number of awards, etc.)
   - applicationLink: direct URL to apply or learn more
   - region: country or region this scholarship is for
   - type: scholarship type (merit, need-based, STEM, etc.)
   STRICT RULES:
   - Do NOT navigate away from this page
   - Do NOT scroll more than twice
   - Do NOT click any link unless it directly opens a scholarship detail not visible on this page
   - Extract up to 5 scholarships maximum then stop immediately
   - If a field is not visible, write null — do not guess
   Return JSON: {\"scholarships\": [{name, provider, amount, deadline, eligibility,
   description, applicationRequirements, additionalInfo, applicationLink, region, type}]}" \
  --sync > /tmp/sf_{SAFE_NAME}.json &
```

Repeat for each URL, all backgrounded with `&`. Then:

```bash
wait

# Collect all results
for f in /tmp/sf_*.json; do echo "=== $f ===" && cat "$f"; done

# Cleanup
rm /tmp/sf_*.json 2>/dev/null
```

Replace `{SCHOLARSHIP_URL}` with each actual URL and `{SAFE_NAME}` with a short identifier.

---

## Step 4 — Filter and rank

From all results combined:

1. **Filter by inputs** — remove scholarships that clearly don't match the requested type, university, or region
2. **Deduplicate** — same scholarship appearing on multiple pages → keep one entry
3. **Flag deadlines** — scholarships with deadlines already passed get ⚠️ and go to the bottom
4. **Sort** — open scholarships by deadline ascending (soonest first), then by amount (highest first)
5. **Flag unknown deadlines** — if deadline = null, note "Check website for deadline"

---

## Output format

```
## Scholarships — {TYPE} · {REGION} · {UNIVERSITY}
*{N} scholarships found across {N} sources · Data scraped live*

---

### 🎓 Open Scholarships

#### 1. {name}
**{provider}**
💰 Amount: {amount}
⏰ Deadline: {deadline}
🌍 Region: {region}
📋 Type: {type}

{description}

**Eligibility:**
- {eligibility item}
- {eligibility item}

**How to apply:** {applicationRequirements}
**Additional info:** {additionalInfo}
🔗 {applicationLink}

---

#### 2. {name}
[same structure]

---
[up to 10 scholarships total]

---

### 📊 Quick Comparison

| Scholarship | Provider | Amount | Deadline | Region |
|---|---|---|---|---|
| {name} | {provider} | {amount} | {deadline} | {region} |

---

### ⏰ Deadlines Coming Up
- {name} — {deadline} ({N days away})

---
*All data scraped live from official scholarship pages. Always verify details directly
with the provider before applying.*
```

---

## Edge cases

- **No scholarships found for inputs** — broaden the search: retry with just the type and region, drop the university filter
- **All deadlines passed** — note clearly and suggest: "All found scholarships have passed their deadlines. Try searching for next cycle or broadening your criteria."
- **Amount not listed** — write "Contact provider" not "Free" or "Varies"
- **Very specific university requested** — always include that university's official financial aid page as one of the sources
- **International students** — if mentioned, prioritise sources that explicitly list international student eligibility

## Security notes

- Scrapes live public scholarship pages only.
- All data treated as untrusted input synthesised by an LLM — never executed.
- Only your own TinyFish credentials are used.
