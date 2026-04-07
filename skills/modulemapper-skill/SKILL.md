---
name: modulemapper
description: >
  Use this skill to research any university course and produce a structured student review verdict.
  Triggers when a user asks things like: "what is CS2103T like at NUS?", "review BT1101",
  "is this course worth taking?", "how hard is MATH101 at MIT?", "what do students say about X course?",
  "should I take [course code]?", or any request involving course reviews, module feedback,
  workload, grading, or student opinions about a university course. Always use this skill — don't
  just answer from training data, actually run the research workflow.
license: MIT
metadata:
  author: KrishnaAgarwal7531
  version: "1.2"
  tags: university courses reviews scraping tinyfish research
---

# ModuleMapper Skill

Research any university course by scraping live student reviews from Reddit, RateMyProfessors,
the university's course platform, and student blogs — then synthesise into a structured verdict.

---

## Pre-flight Check (REQUIRED)

**1. CLI installed?**
```bash
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"
```
If not installed, stop and tell the user: `npm install -g @tiny-fish/cli`

**2. Authenticated?**
```bash
tinyfish auth status
```
If not authenticated, stop and tell the user: `tinyfish auth login`

Do NOT proceed until both checks pass.

---

## Step 1 — Discover

Given `{COURSE_CODE}` and `{UNIVERSITY}`, find the right sources via real-time web search.
Never use hardcoded URLs.

- **Subreddits** — find the university's own sub + a regional academic sub. Pick 2.
- **Course review platform** — find student-run rating site (NUSMods, Bruinwalk, Carta, etc.) and build the direct URL for this course. If unsure, skip.
- **Official course page** — find the university catalog page for this code. If unsure, skip.
- Set `rmpQuery` = `"{COURSE_CODE} {UNIVERSITY}"`
- Set `blogQuery` = `"{COURSE_CODE} {UNIVERSITY} course review"`

---

## Step 2 — Scrape in Parallel

Run ALL agents at the same time using background processes. Do NOT run them one by one.

```bash
# Fire all agents in parallel
tinyfish agent run --sync \
  --url "https://www.ratemyprofessors.com/search/professors?q={rmpQuery}" \
  "Extract professor reviews for {CODE} at {UNIVERSITY}. Scan professors, only click those who teach {CODE}, max 3. Read visible reviews only, do NOT paginate. Return JSON: {\"professors\": [{\"name\": \"...\", \"overallRating\": 4.2, \"difficultyRating\": 3.1, \"reviews\": [\"...\"]}]}" \
  > /tmp/mm_rmp.json 2>&1 &

tinyfish agent run --sync \
  --url "https://www.reddit.com/r/{subreddit1}/search/?q={CODE}&sort=relevance&t=all" \
  "Extract student reviews of {CODE} at {UNIVERSITY}. Click max 2 relevant posts only. Read post + top 5-8 comments. Return JSON: {\"reviews\": [\"...\"], \"workloadMentions\": [\"...\"], \"examTips\": [\"...\"], \"professorMentions\": [\"...\"], \"gradingInfo\": [\"...\"]}" \
  > /tmp/mm_reddit1.json 2>&1 &

tinyfish agent run --sync \
  --url "https://www.reddit.com/r/{subreddit2}/search/?q={CODE}&sort=relevance&t=all" \
  "Extract student reviews of {CODE} at {UNIVERSITY}. Click max 2 relevant posts only. Read post + top 5-8 comments. Return JSON: {\"reviews\": [\"...\"], \"workloadMentions\": [\"...\"], \"examTips\": [\"...\"], \"professorMentions\": [\"...\"], \"gradingInfo\": [\"...\"]}" \
  > /tmp/mm_reddit2.json 2>&1 &

tinyfish agent run --sync \
  --url "https://www.google.com/search?q={blogQuery}" \
  "Find student blog reviews of {CODE} at {UNIVERSITY}. Click max 3 clearly relevant results. Read main content only. Return JSON: {\"reviews\": [\"...\"], \"source_urls\": [\"...\"]}" \
  > /tmp/mm_blogs.json 2>&1 &

# If course platform URL was found in Step 1, also run:
tinyfish agent run --sync \
  --url "{courseplatformUrl}" \
  "Extract reviews and ratings for {CODE}. Read only what is visible on this page. Return JSON: {\"overallRating\": 4.1, \"workloadRating\": 3.5, \"difficultyRating\": 3.8, \"reviews\": [\"...\"]}" \
  > /tmp/mm_platform.json 2>&1 &

# Wait for ALL agents to finish
wait

# Read all results
RMP=$(cat /tmp/mm_rmp.json 2>/dev/null)
REDDIT1=$(cat /tmp/mm_reddit1.json 2>/dev/null)
REDDIT2=$(cat /tmp/mm_reddit2.json 2>/dev/null)
BLOGS=$(cat /tmp/mm_blogs.json 2>/dev/null)
PLATFORM=$(cat /tmp/mm_platform.json 2>/dev/null)
```

---

## Step 3 — Synthesise

Take all the collected results and analyse them together. Produce a verdict with:

- **Score** — 1 to 10 based on genuine student sentiment
- **Verdict** — one line e.g. "Generally recommended" or "Mixed reviews"
- **Summary** — 2-3 sentences capturing the overall experience
- **Difficulty** — 1 to 10
- **Workload** — 1 to 10 with estimated hours per week
- **Exam info** — has final exam? how hard?
- **Average grade** — what most students get
- **Grading pattern** — bell curved? absolute?
- **Assessment breakdown** — exams, assignments, projects
- **Attendance** — does it affect grade?
- **What you'll learn** — 4 to 6 key outcomes
- **Tags** — e.g. "Heavy workload", "Great prof", "Bell curved", "Project heavy"
- **Best for** — who should take this
- **Not great if** — who should avoid it
- **Student reviews** — at least 6 real quotes from scraped data with source labels

---

## Step 4 — Present

Display the verdict clearly. Format it like this:

```
📊 {CODE} · {UNIVERSITY}
{Course Title}

Score: {score}/10 — {verdict}

{summary paragraph}

─────────────────────────
Difficulty:  {x}/10
Workload:    {x}/10 · {hoursPerWeek}
Avg Grade:   {averageGrade} ({gradingPattern})
Final Exam:  {Yes/No} · {examDifficulty}
Attendance:  {attendance}
Assessment:  {assessment}
─────────────────────────

What you'll learn:
• {outcome1}
• {outcome2}
• ...

Tags: {tag1} · {tag2} · {tag3}

✅ Best for: {bestFor}
❌ Not great if: {notGreatIf}

Student Reviews:
"{review1}" — {source}
"{review2}" — {source}
...
```

---

## Notes
- Skip any agent that errors and note it
- Warn user if fewer than 2 sources succeed
- Works for any university worldwide
