---
name: hackathon-finder
description: Find hackathons tailored to your tech profile and location by searching Devpost, Luma, Partiful, MLH, and Eventbrite. Use this skill when a user asks "find me a hackathon", "are there any hackathons near me", "what hackathons are coming up", "I want to compete in a hackathon", "find hackathons I could win", "upcoming hackathons in [city]", "online hackathons for [skill/tech]", or any request to discover hackathon opportunities.
---

# Hackathon Finder

Build a tech profile from everything known about you, then search Devpost, Luma, Partiful, MLH, and Eventbrite for upcoming hackathons — local or online — that match your stack and give you the best shot at winning.

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

## Step 1 — Build the user's tech profile

Before searching for anything, build a picture of who you're helping. Draw from everything available in the current conversation and session context:

- Languages and frameworks mentioned or used (e.g. React, Python, Rust)
- Projects described or worked on
- Areas of interest expressed (e.g. AI/ML, Web3, hardware, design)
- Skill level signals (beginner, experienced, specialist)
- Any past hackathon experience mentioned

Summarize this as a brief internal profile:

```
Tech profile:
- Primary languages: {e.g. Python, TypeScript}
- Frameworks / tools: {e.g. React, FastAPI, LangChain}
- Interest areas: {e.g. AI, developer tools, consumer apps}
- Skill level: {beginner / intermediate / experienced}
- Past hackathons: {yes/no, any wins?}
```

If very little is known, ask one quick question:
> "What do you usually build with? (e.g. languages, frameworks, or areas like AI, web, mobile)"

---

## Step 2 — Ask for location and format preference

Ask the user two things before searching:

```
Two quick questions:

1. **Where are you based?** (city and country — e.g. "Singapore", "London, UK", "Austin, TX")
   Or if you prefer online-only hackathons, just say "online".

2. **What are you optimizing for?**
   - 🏆 Best chance of winning (match your stack to the theme)
   - 🌍 Biggest / most prestigious (large prize pools, well-known sponsors)
   - 🤝 Best for networking / meeting people
   - 🧪 Most interesting theme (something you'd genuinely enjoy building)
```

Wait for the user's response before proceeding.

---

## Step 3 — Parallel hackathon search

Fire all agents simultaneously based on the user's location and tech profile.

```bash
# Agent 1 — Devpost (largest hackathon aggregator)
tinyfish agent run \
  --url "https://devpost.com/hackathons?challenge_type=online&status=upcoming" \
  "You are on Devpost's upcoming hackathons page.
   Find hackathons relevant to these technologies: {TECH_KEYWORDS}.
   For each relevant hackathon extract:
   - name
   - theme or focus area
   - prize pool (total or top prize)
   - registration deadline
   - hackathon dates
   - online or in-person (and location if in-person)
   - direct URL
   - sponsor companies (if shown)
   STRICT RULES:
   - Do NOT click into any hackathon page
   - Read only what is visible in the listing cards
   - Only include hackathons with future dates
   - Maximum 10 listings then stop
   Return JSON array: [{name, theme, prize_pool, deadline, dates, format, location, url, sponsors: []}]" \
  --sync > /tmp/hf_devpost.json &

# Agent 2 — Devpost (in-person / local, if user specified a city)
tinyfish agent run \
  --url "https://devpost.com/hackathons?challenge_type=in-person&status=upcoming&search={LOCATION_ENCODED}" \
  "You are on Devpost's upcoming in-person hackathons page filtered to {LOCATION}.
   Find hackathons in or near {LOCATION}.
   For each extract:
   - name
   - theme or focus area
   - prize pool
   - registration deadline
   - hackathon dates
   - exact location (city, venue if shown)
   - direct URL
   - sponsor companies
   STRICT RULES:
   - Do NOT click into any hackathon page
   - Maximum 8 listings then stop
   - Only include hackathons with future dates
   Return JSON array: [{name, theme, prize_pool, deadline, dates, location, url, sponsors: []}]" \
  --sync > /tmp/hf_devpost_local.json &

# Agent 3 — MLH (Major League Hacking)
tinyfish agent run \
  --url "https://mlh.io/seasons/2026/events" \
  "You are on the MLH (Major League Hacking) events page for the current season.
   Find upcoming hackathons, especially any in or near {LOCATION} or online.
   For each event extract:
   - name
   - date
   - location (city or online)
   - direct URL
   - any theme or focus if shown
   STRICT RULES:
   - Do NOT click any event
   - Read only the visible event cards
   - Maximum 10 events then stop
   - Only future events
   Return JSON array: [{name, date, location, url, theme}]" \
  --sync > /tmp/hf_mlh.json &

# Agent 4 — Luma
tinyfish agent run \
  --url "https://lu.ma/discover?q=hackathon+{LOCATION_ENCODED}" \
  "You are on Luma event discovery searching for hackathons near {LOCATION}.
   Find upcoming hackathon events.
   For each event extract:
   - name
   - date and time
   - location (in-person address or online)
   - host / organizer
   - short description or theme
   - direct URL
   STRICT RULES:
   - Do NOT click any event
   - Read only what is visible in the event cards
   - Maximum 8 events then stop
   - Only future events
   - If no hackathons found, return {found: false}
   Return JSON array: [{name, date, location, host, description, url}]" \
  --sync > /tmp/hf_luma.json &

# Agent 5 — Devpost tech-specific search
tinyfish agent run \
  --url "https://devpost.com/hackathons?search={TECH_KEYWORD_ENCODED}&status=upcoming" \
  "You are on Devpost searching for hackathons related to {PRIMARY_TECH}.
   Find hackathons that specifically feature {PRIMARY_TECH} as a theme, sponsor, or required technology.
   For each extract:
   - name
   - theme
   - prize pool
   - deadline
   - dates
   - format (online/in-person)
   - direct URL
   - why it's relevant to {PRIMARY_TECH}
   STRICT RULES:
   - Do NOT click into any hackathon
   - Maximum 8 listings then stop
   - Only future hackathons
   Return JSON array: [{name, theme, prize_pool, deadline, dates, format, url, relevance}]" \
  --sync > /tmp/hf_devpost_tech.json &

# Agent 6 — Eventbrite
tinyfish agent run \
  --url "https://www.eventbrite.com/d/{LOCATION_SLUG}/hackathon/" \
  "You are on Eventbrite searching for hackathon events in {LOCATION}.
   Find upcoming hackathon events.
   For each event extract:
   - name
   - date
   - location (venue or online)
   - price / ticket cost (free or paid)
   - organizer
   - short description
   - direct URL
   STRICT RULES:
   - Do NOT click any event
   - Read only what is visible in the event cards
   - Maximum 8 events then stop
   - Only future events
   Return JSON array: [{name, date, location, price, organizer, description, url}]" \
  --sync > /tmp/hf_eventbrite.json &

wait

echo "=== DEVPOST ONLINE ===" && cat /tmp/hf_devpost.json
echo "=== DEVPOST LOCAL ===" && cat /tmp/hf_devpost_local.json
echo "=== MLH ===" && cat /tmp/hf_mlh.json
echo "=== LUMA ===" && cat /tmp/hf_luma.json
echo "=== DEVPOST TECH ===" && cat /tmp/hf_devpost_tech.json
echo "=== EVENTBRITE ===" && cat /tmp/hf_eventbrite.json
```

**Before running**, replace:
- `{LOCATION}` — e.g. `Singapore`, `London`
- `{LOCATION_ENCODED}` — URL-encoded e.g. `Singapore`
- `{LOCATION_SLUG}` — Eventbrite format e.g. `singapore--sg`
- `{TECH_KEYWORDS}` — comma-separated e.g. `AI, React, Python`
- `{TECH_KEYWORD_ENCODED}` — primary tech URL-encoded e.g. `artificial-intelligence`
- `{PRIMARY_TECH}` — single best-match technology e.g. `AI/ML`

---

## Step 4 — Score and rank by fit

For each hackathon found, score it against the user's tech profile and stated goal:

**Fit score (0-10):**
- Theme matches user's primary tech area: +4
- Sponsor uses tech the user knows: +2
- Prize pool / prestige matches stated goal: +2
- Location matches preference: +2

Present hackathons ranked by fit score, with the win-probability assessment front and center.

---

## Output format

```
## Hackathons for You — {LOCATION} · {date}

*Based on your profile: {PRIMARY_LANGUAGES} · {INTEREST_AREAS}*
*Searched: Devpost · MLH · Luma · Eventbrite*

---

### 🏆 Best Matches (Highest Win Potential)

#### {Hackathon Name}
**📅** {dates} · **📍** {location or online}
**💰** Prize: {prize_pool} · **⏰** Register by: {deadline}
**🎯 Why you'd win:** {1-2 sentences on why this fits the user's stack and the theme}
**Sponsors:** {sponsors}
🔗 {url}

---

#### {Hackathon Name}
[same structure]

---

### 🌍 Also Worth Considering

[remaining hackathons, shorter format]

- **{name}** — {date} · {location} · {prize} · {url}

---

### 📊 Summary

| Hackathon | Format | Date | Prize | Fit |
|---|---|---|---|---|
| {name} | Online/Local | {date} | {prize} | ⭐⭐⭐⭐⭐ |

---

### 💡 Strategy Tips
{1-3 targeted tips based on the user's profile and the hackathons found}
- e.g. "The {hackathon} has an AI track with no strong competition in the LLM tooling space — right in your wheelhouse"
- e.g. "For MLH events, solo Python projects with clean demos tend to score well with judges"
```

---

## Edge Cases

- **User is online-only** — skip Devpost local, Luma local, and Eventbrite local agents; focus on Devpost online and MLH
- **No hackathons found in the city** — broaden to country, then to online, and note the broadening
- **User has no clear tech profile** — skip the fit scoring, present all hackathons by date and let the user choose
- **User has won hackathons before** — note this and suggest larger or more competitive events; skip beginner-friendly ones
- **User is a beginner** — prioritize beginner-friendly or first-timer hackathons; flag events that explicitly welcome new participants
- **No upcoming hackathons found** — suggest checking back closer to major seasons (September-November and January-March tend to be peak hackathon periods)
