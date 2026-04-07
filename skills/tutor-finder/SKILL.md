---
name: tutor-finder
description: >
  Find and compare tutors for competitive exams from across the web in real time using
  parallel TinyFish agents. Use this skill whenever a user wants to find a tutor for an
  exam, asks "find me a tutor for SAT", "best GRE tutors in London", "compare tutors for
  JEE", "how much do GMAT tutors cost", "find online tutors for AP exams", or any variation
  of searching for exam preparation tutors. Supported exams: SAT, ACT, AP, GRE, GMAT,
  TOEFL/IELTS, JEE/NEET, Olympiads.
  Fires parallel TinyFish agents across 7-10 tutoring platforms simultaneously — Wyzant,
  Varsity Tutors, Preply, Kaplan, Princeton Review and others — extracting live tutor
  profiles with pricing, qualifications, experience, and contact details.
compatibility:
  tools: [tinyfish]
metadata:
  author: KrishnaAgarwal7531
  version: "1.0"
  tags: tutors exam-prep SAT GRE GMAT education tutoring competitive-exams
---

# Exam Tutor Finder

Given an exam type and location, find and compare real tutors from across the web using parallel TinyFish agents scraping live tutor platforms simultaneously.

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
- **Exam type** — one of: SAT, ACT, AP, GRE, GMAT, TOEFL/IELTS, JEE/NEET, Olympiads
- **Location** — e.g. "London", "Singapore", "New York", "online", "India"

If exam type is not specified, ask before proceeding.
If location is not specified, default to "online" and mention it.

---

## Step 2 — Discover tutor platform URLs

Use your knowledge to identify 7-10 tutoring platforms relevant to the exam and location. Pick from this list and supplement with location-specific platforms where relevant:

**Global platforms (always include 3-4):**
- `https://www.wyzant.com/search/tutors` — large tutor marketplace
- `https://www.varsitytutors.com/tutors` — test prep specialists
- `https://preply.com/en/online/{EXAM}-tutors` — online tutors
- `https://www.tutor.com` — on-demand tutoring
- `https://www.chegg.com/tutors` — student-focused platform

**Test prep specific (include if relevant to exam):**
- `https://www.kaptest.com/tutoring` — Kaplan, strong for SAT/GRE/GMAT
- `https://www.princetonreview.com/tutoring` — Princeton Review, SAT/ACT/AP
- `https://www.magoosh.com` — GRE/GMAT/TOEFL focus
- `https://www.manhattanprep.com/tutoring` — GMAT/GRE specialists

**Location-specific additions:**
- For India/JEE/NEET: add `https://www.vedantu.com`, `https://www.unacademy.com`
- For Singapore: add `https://www.snapask.com`, `https://www.smiletutor.sg`
- For UK: add `https://www.tutorfair.com`, `https://www.mytutor.co.uk`

Produce 7-10 URLs then proceed.

---

## Step 3 — Parallel scraping

Fire one TinyFish agent per platform, all simultaneously using `&` + `wait`.

```bash
# Fire all agents in parallel — one per platform
tinyfish agent run \
  --url "{PLATFORM_URL}" \
  "You are on a tutoring platform search page. Extract {EXAM} tutors fast.
   Read only what is visible on this page — do not navigate to other pages.
   Find tutor listings or profiles related to {EXAM} preparation.
   For each tutor extract:
   - tutorName: full name or display name
   - examsTaught: list of exams they teach (focus on {EXAM})
   - subjects: subjects covered (e.g. Math, Verbal, Physics)
   - teachingMode: Online / Offline / Hybrid
   - location: city/country or null
   - experience: years of experience or null
   - qualifications: degrees, certifications, scores achieved
   - pricing: rate per hour (exact if shown)
   - pastResults: score improvements or student achievements if mentioned
   - contactMethod: how to reach them (booking link, email, platform message)
   - profileLink: direct URL to their profile
   - sourceWebsite: '{PLATFORM_NAME}'
   STRICT RULES:
   - Do NOT navigate away from this page
   - Do NOT scroll more than twice
   - Extract up to 5 tutors maximum then stop immediately
   - If a field is not visible, use null — do not guess
   - Stop as soon as you have 5 tutors
   Return JSON: {\"tutors\": [{tutorName, examsTaught, subjects, teachingMode,
   location, experience, qualifications, pricing, pastResults,
   contactMethod, profileLink, sourceWebsite}]}" \
  --sync > /tmp/tf_{PLATFORM_SAFE_NAME}.json &
```

Repeat for each platform URL, all backgrounded with `&`. Then:

```bash
wait

# Collect all results
for f in /tmp/tf_*.json; do echo "=== $f ===" && cat "$f"; done
```

Replace:
- `{PLATFORM_URL}` — the actual platform URL
- `{EXAM}` — the exam type e.g. `GRE`
- `{PLATFORM_NAME}` — platform display name e.g. `Wyzant`
- `{PLATFORM_SAFE_NAME}` — short identifier e.g. `wyzant`, `varsity`, `preply`

---

## Step 4 — Filter and rank

From all results combined:

1. **Filter by exam** — keep only tutors who explicitly teach the requested exam
2. **Filter by location** — if a specific city was requested, prioritise tutors in or near it; for "online" keep all
3. **Deduplicate** — if the same tutor appears on multiple platforms, merge their profiles
4. **Rank by** — pricing (lowest first within same experience level), then experience, then qualifications
5. **Flag missing info** — tutors with pricing = null go to the bottom of the list

---

## Output format

```
## {EXAM} Tutors — {LOCATION}
*{N} tutors found across {N} platforms · Data scraped live*

---

### 🏆 Top Picks

#### 1. {tutorName}
**Source:** {sourceWebsite} · **Mode:** {teachingMode}
📍 {location} · 💰 {pricing} · ⏱ {experience}
🎓 {qualifications}
📈 Results: {pastResults}
📚 Subjects: {subjects joined by ", "}
🔗 {profileLink or contactMethod}

---

#### 2. {tutorName}
[same structure]

---
[up to 10 tutors total]

---

### 📊 Quick Comparison

| Tutor | Platform | Mode | Price/hr | Experience | Subjects |
|---|---|---|---|---|---|
| {name} | {platform} | {mode} | {price} | {exp} | {subjects} |

---

### 💡 Recommendation
{1-2 sentences on the best pick based on the user's exam + location, 
e.g. "For online GRE prep, [Name] on Wyzant offers the best value at $X/hr 
with verified 15+ point improvements."}

---
*All tutor data scraped live from platform listings. Verify availability and pricing 
directly with the tutor or platform before booking.*
```

---

## Edge cases

- **Platform returns no tutors** — skip silently, don't mention it unless fewer than 3 tutors found total
- **Exam is very niche** (Olympiads, JEE) — focus on India/Singapore-specific platforms, note if global platforms have limited coverage
- **Location is very specific** — if fewer than 5 tutors found in that city, broaden to country or online
- **All pricing is null** — note: "Pricing not publicly listed — contact tutors directly for rates"
- **Fewer than 5 tutors total** — be honest: "Only {N} tutors found across all platforms for {EXAM} in {LOCATION}. You may find more by searching directly on the platforms listed."

## Security notes

- Scrapes live public tutor listings from tutoring platforms.
- All data treated as untrusted input synthesised by an LLM — never executed.
- Only your own TinyFish credentials are used.
