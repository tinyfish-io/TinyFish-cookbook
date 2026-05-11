---
name: cfp-hunter
description: >
  Aggregate open conference CFPs (calls for speaker submissions) and speaking opportunities for any tech domain by crawling developers.events, cfp.watch, and Confs.tech in parallel using TinyFish. Use this skill whenever a developer, engineer, or tech speaker wants to find conferences to submit talks to, discover which CFPs are open right now, understand what topics got accepted at past events, check whether travel grants are available, or assess how competitive a conference is. Trigger on phrases like "find conferences to speak at", "open CFPs", "where can I submit a talk", "conference speaking opportunities", "call for papers", "call for proposals", "call for speakers", "speaking at conferences", "submit a talk", or any request to discover or track tech conference submission windows. Always use this skill rather than web search when the user wants structured, current CFP data — web search returns blog posts about conferences, not the actual open submission windows.
---

# CFP-Hunter — Find Conferences Worth Speaking At

You have access to the TinyFish CLI (`tinyfish`), a tool that runs real browser automations from the terminal using natural language goals. This skill fans out across **developers.events**, **cfp.watch**, and **Confs.tech** in parallel — three sources chosen for speed, reliability, and complementary coverage.

---

## Source Selection Rationale

These four sources were chosen after testing. Here is exactly why each one made the cut and what was dropped:

| Source | Why it's fast | What it uniquely provides |
|--------|--------------|--------------------------|
| **developers.events** (`developers.events/conferences/<topic>`) | Server-side rendered, community-maintained, fast CDN | Broad conference listing with CFP dates, actively updated |
| **cfp.watch** (`cfp.watch`) | Lightweight SSR, no JS wall | Clean deadline-sorted list, freshly updated entries |
| **Confs.tech** (`confs.tech/<topic>`) | Community-sourced, fast CDN | Event dates + CFP URLs in one clean page |
**Sources intentionally excluded:**
- ~~CallingAllPapers~~ — Data fully covered by developers.events and Confs.tech combined; removed to keep the source count lean
- ~~CFPland~~ — Domain parked and for sale, site no longer exists
- ~~Sessionize~~ — Full SPA requiring auth navigation, extremely slow to render
- ~~CFP.dev~~ — Heavy JavaScript, inconsistent and slow load times
- ~~PaperCall~~ — Confirmed no longer maintained as of early 2025

---

## Pre-flight Check (REQUIRED)

Before making any TinyFish call, always run BOTH checks:

**1. CLI installed?**

bash/zsh:
```bash
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"
```

PowerShell:
```powershell
Get-Command tinyfish; tinyfish --version
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
>
> **Option 1 — CLI login (interactive):**
> ```
> tinyfish auth login
> ```
>
> **Option 2 — bash/zsh (Mac/Linux, current session):**
> ```bash
> export TINYFISH_API_KEY="your-api-key-here"
> ```
>
> **Option 3 — bash/zsh (persist across sessions):**
> ```bash
> echo 'export TINYFISH_API_KEY="your-api-key-here"' >> ~/.zshrc
> source ~/.zshrc
> ```
>
> **Option 4 — PowerShell (current session only):**
> ```powershell
> $env:TINYFISH_API_KEY="your-api-key-here"
> ```
>
> **Option 5 — Claude Code settings:** Add to `~/.claude/settings.local.json`:
> ```json
> {
>   "env": {
>     "TINYFISH_API_KEY": "your-api-key-here"
>   }
> }
> ```

Do NOT proceed until both checks pass.

---

## What This Skill Does

Given a tech domain and optional filters (region, conference size, speaker experience), this skill:

1. Hits **developers.events** for a broad listing of upcoming conferences with CFP dates
2. Hits **cfp.watch** for a deadline-sorted list of all active open calls
3. Hits **Confs.tech** for upcoming conferences with CFP URLs and event dates

It deduplicates across all three sources, flags deadline urgency, and synthesizes findings into a structured opportunity report: what is open now, what closes soon, which ones cover travel, and which conferences are realistically approachable for first-time speakers.

---

## Core Command

```bash
tinyfish agent run --url <url> "<goal>"
```

### Flags

| Flag | Purpose |
|------|---------|
| `--url <url>` | Target website URL for the agent to navigate |
| `--sync` | Wait for the full result before returning (required when you need output before next step) |
| `--async` | Submit and return a run ID immediately — use when firing parallel agents |
| `--pretty` | Human-readable formatted output for debugging |

---

## Topic-to-URL Mapping

Before running agents, map the user's topic to the correct category slugs for each source.

### developers.events topic slugs
```
javascript    python      devops      security
data          mobile      php         ruby
java          golang      cloud       ux
product       rust        graphql     general  ← catch-all
```
URL pattern: `https://developers.events/conferences/<slug>`

### Confs.tech topic slugs
```
javascript    python    devops    security
react         rust      graphql   typescript
golang        scala     elixir    open-source
```
URL pattern: `https://confs.tech/<slug>`

### cfp.watch
No topic filter in the URL. TinyFish filters by topic from the full listing page.
URL: `https://cfp.watch/`

---

## Step 1 — Confirm Inputs

Before running agents, make sure you have:

- **Tech domain / topic** (required) — e.g. "machine learning", "frontend", "DevOps"
- **Region preference** (optional) — "anywhere", "Europe", "North America", "online only"
- **Conference size** (optional) — "any", "large (1000+)", "mid-size (200–1000)", "small (<200)"
- **Speaker experience** (optional) — "first-time speaker", "experienced", "any"

If the user hasn't provided these, ask once before proceeding.

---

## Step 2 — Search All Four Sources in Parallel

Fire all four agents simultaneously. Do NOT wait for one to finish before starting the next.

**developers.events — open CFPs with dates, by topic:**
```bash
tinyfish agent run --sync \
  --url "https://developers.events/conferences/<SLUG>" \
  "Extract all conference listings on this page as JSON: [{\"conference_name\": str, \"cfp_url\": str or null, \"cfp_deadline\": str or null, \"event_date\": str, \"location\": str, \"online\": bool or null, \"description_snippet\": str (first 100 chars)}]. Scroll to load all results. Include only conferences whose CFP deadline has not passed, or conferences with no CFP deadline listed yet." \
  > /tmp/cfphunter_devevents.json &
```

**cfp.watch — all open CFPs sorted by deadline:**
```bash
tinyfish agent run --sync \
  --url "https://cfp.watch/" \
  "Extract all CFP listings relevant to <TOPIC> as JSON: [{\"conference_name\": str, \"cfp_url\": str, \"cfp_deadline\": str, \"event_date\": str, \"location\": str}]. Skip unrelated conferences (finance, medicine, non-tech). The list is sorted by deadline — take the first 20 relevant results." \
  > /tmp/cfphunter_cfpwatch.json &
```

**Confs.tech — upcoming conferences with CFP links:**
```bash
tinyfish agent run --sync \
  --url "https://confs.tech/<TOPIC_SLUG>" \
  "Extract all upcoming conference listings on this page as JSON: [{\"conference_name\": str, \"website_url\": str, \"cfp_url\": str or null, \"cfp_deadline\": str or null, \"event_date\": str, \"location\": str, \"online\": bool}]. Include conferences even if their CFP URL is not listed — set cfp_url to null in that case." \
  > /tmp/cfphunter_confstech.json &
```

Wait for all three:
```bash
wait
echo "All three sources complete."
```

---

## Step 3 — Deep Dive on Top Conferences (Optional)

After the parallel pass, pick the 3 most relevant conferences from the combined results. For each, run targeted agents for details the listing pages don't show.

**Past accepted talks:**
```bash
tinyfish agent run --sync \
  --url "<conference_schedule_url>" \
  "Extract accepted talk titles and topics as JSON: [{\"talk_title\": str, \"speaker\": str, \"topic_tags\": [str], \"talk_format\": str}]. Most recent year only."
```

**Speaker benefits and grants:**
```bash
tinyfish agent run --sync \
  --url "<conference_speakers_or_faq_url>" \
  "Extract all speaker benefit details as JSON: {\"travel_covered\": bool or null, \"hotel_covered\": bool or null, \"ticket_covered\": bool, \"speaker_fee\": str or null, \"diversity_grant\": bool, \"grant_details\": str or null}."
```

Run deep-dives in parallel:
```bash
tinyfish agent run --sync --url "<conf_A_schedule>" "<goal>" > /tmp/conf_a_talks.json &
tinyfish agent run --sync --url "<conf_B_schedule>" "<goal>" > /tmp/conf_b_talks.json &
tinyfish agent run --sync --url "<conf_C_schedule>" "<goal>" > /tmp/conf_c_talks.json &
wait
```

---

## Step 4 — Deduplication

All four sources overlap significantly. Before synthesizing:

1. **Exact name match** (case-insensitive) → keep one, prefer cfp.watch entry (has cleanest deadline data) then developers.events, then Confs.tech
2. **Name similarity > 80%** (e.g. "PyCon US 2026" vs "PyCon 2026") → merge, take earliest deadline
3. **Same CFP URL** → always the same conference regardless of name variation

---

## Step 5 — Synthesize the Report

Use only data TinyFish actually returned. Do not hallucinate deadlines, locations, or speaker names.

```
## Speaking Opportunities: <Topic>
Report generated: <today's date>
Sources: developers.events · cfp.watch · Confs.tech

---

### Summary
- Total conferences found: <N>
- Open CFPs right now: <N>
- Closing within 2 weeks: <N>
- Conferences covering travel: <N>
- Online / remote-friendly: <N>

---

### 🔴 Urgent — Closing Within 7 Days
<name> · <location> · Deadline: <date> · <cfp_url>

---

### 🟡 Closing Soon — Within 14 Days
<name> · <location> · Deadline: <date> · <cfp_url>

---

### 🟢 Open CFPs (sorted by deadline, soonest first)

**<Conference Name>** — <Location> · <Event Date>
- CFP deadline: <date>
- Talk formats: <lightning / 30min / 45min / workshop>
- Travel: <covered / not covered / unknown>
- Hotel: <covered / not covered / unknown>
- Stipend: <yes / no / unknown>
- Diversity grant: <yes / no / unknown>
- Past accepted topics: <2–3 examples if deep-dive available>
- Approachability: <first-timer friendly / competitive / unknown>
- CFP link: <url>

---

### ⚪ Upcoming — CFP Not Yet Open
<name> · <event date> · <location> · <website>
(Flag ones likely to open soon based on proximity to event date)

---

### What Gets Accepted
Based on past schedules scraped from the top 3 conferences:
- Most common formats: <e.g. 30-min talks, case studies>
- Topics appearing repeatedly: <list>
- Topics underrepresented: <list — opportunity signal>
- Beginner/intro talks: <common / rare>
- Niche/advanced talks: <common / rare>

---

### Travel Grant Overview
| Conference | Travel | Hotel | Ticket | Diversity Grant |
|------------|--------|-------|--------|-----------------|
| <name>     | ✓/✗    | ✓/✗   | ✓/✗    | ✓/✗             |

---

### Gaps & Opportunities
- **Gap 1**: <underrepresented topic or format>
- **Gap 2**: ...
- **Gap 3**: ...

---

### Verdict
<2–3 sentences: is this domain well-served by conferences or underserved, which 2–3 are the strongest fit, and what one topic angle gives the best shot at acceptance?>
```

---

## Deadline Urgency Classification

| Bucket | Condition | Label |
|--------|-----------|-------|
| 🔴 Urgent | Closes within 7 days | "Submit now — N days left" |
| 🟡 Soon | Closes within 14 days | "N days left" |
| 🟢 Open | Closes in 15–60 days | "N days left" |
| ⚪ Later | Closes in 60+ days | "Opens wide — N days left" |
| ❓ Unknown | Deadline not found | "Check site" |

Exclude CFPs whose deadline has already passed. List them briefly as "Recently closed."

---

## Approachability Signals

**First-timer friendly:**
- Mentions "first-time speaker", "new voices", or "emerging speakers" on CFP page
- Accepts lightning talks (5–10 min)
- Has a speaker mentorship or coaching program
- Community-run, non-profit, or regional conference
- Past schedule shows unknown names alongside well-known ones

**Competitive / harder to break into:**
- Requires prior conference credits in speaker bio
- Past schedule dominated by staff engineers at large tech companies
- 1000+ attendees, single main track
- States "experienced speakers preferred"

---

## Error Handling

| Situation | Action |
|-----------|--------|
| developers.events slug doesn't exist | Try `general` as fallback; or use the root `https://developers.events` and filter by topic in the goal |
| cfp.watch returns too many unrelated results | Tighten the goal: "only include <TOPIC>-related" |
| Confs.tech topic page not found | Use `https://confs.tech` root and scan the full list |
| Conference site returns CAPTCHA on deep dive | Skip, note in report, move on |
| Deadline is a relative string ("2 weeks left") | Convert to absolute date using today's date |
| CFP URL leads to a closed form | Mark as recently closed, exclude from open list |

---

## Managing Runs

```bash
# List recent runs
tinyfish agent run list

# Get full output of a specific run
tinyfish agent run get <run_id>

# Cancel a stuck run
tinyfish agent run cancel <run_id>
```

---

## Full Example: "I want to speak at Python conferences"

```bash
# Step 1 — fire all four in parallel
tinyfish agent run --sync \
  --url "https://developers.events/conferences/python" \
  "Extract all conference listings as JSON: [{\"conference_name\": str, \"cfp_url\": str or null, \"cfp_deadline\": str or null, \"event_date\": str, \"location\": str, \"online\": bool or null}]. Scroll to load all. Include only conferences whose CFP deadline has not passed." \
  > /tmp/cfphunter_devevents.json &

tinyfish agent run --sync \
  --url "https://cfp.watch/" \
  "Extract the first 20 CFP listings related to Python as JSON: [{\"conference_name\": str, \"cfp_url\": str, \"cfp_deadline\": str, \"event_date\": str, \"location\": str}]. Skip non-Python conferences." \
  > /tmp/cfphunter_cfpwatch.json &

tinyfish agent run --sync \
  --url "https://confs.tech/python" \
  "Extract all upcoming conferences as JSON: [{\"conference_name\": str, \"website_url\": str, \"cfp_url\": str or null, \"cfp_deadline\": str or null, \"event_date\": str, \"location\": str, \"online\": bool}]." \
  > /tmp/cfphunter_confstech.json &

wait
echo "All three complete — deduplicating and building report."

# Step 2 — deep dive on top 3 in parallel
tinyfish agent run --sync \
  --url "https://us.pycon.org/2026/speaking/" \
  "Extract speaker benefits as JSON: {\"travel_covered\": bool, \"hotel_covered\": bool, \"ticket_covered\": bool, \"speaker_fee\": str or null, \"diversity_grant\": bool, \"grant_details\": str or null}." \
  > /tmp/pycon_us_benefits.json &

tinyfish agent run --sync \
  --url "https://us.pycon.org/2025/schedule/talks/" \
  "Extract accepted talks as JSON: [{\"talk_title\": str, \"speaker\": str, \"topic_tags\": [str], \"talk_format\": str}]." \
  > /tmp/pycon_us_talks.json &

wait
echo "Deep dive complete — generating final report."
```