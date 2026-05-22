# Scholarship Finder Skill for Claude

Find real scholarships in real time for any type, university, and region — directly inside Claude.

## What it does

Ask Claude things like:
- *"Find STEM scholarships for undergraduates in the USA"*
- *"What scholarships are available for international students at NUS?"*
- *"Find merit scholarships in the UK for postgraduate students"*
- *"Scholarships for computer science students in Singapore"*
- *"Find need-based scholarships at MIT"*

Claude discovers 5-8 relevant scholarship sources in real time — university financial aid pages, government portals, private foundations, and aggregators — then fires parallel TinyFish agents to scrape each one simultaneously, streaming results back as each agent completes.

## Requirements

- TinyFish CLI installed: `npm install -g tinyfish`
- Authenticated: `tinyfish auth login`

## Install

### Option 1 — Skills CLI (recommended)

```bash
npx skills add KrishnaAgarwal7531/skills- --skill scholarship-finder
```

### Option 2 — Manual

1. Clone or download this repository
2. Copy the `scholarship-finder/` folder into your agent's skills directory:
   - Claude Code: `~/.claude/skills/`
   - Cursor: `.cursor/skills/` in your project
   - Global (all agents): `~/.agents/skills/`
3. The skill is picked up automatically — no restart needed

## What you get

- Scholarship name and provider
- Award amount (exact where listed)
- Application deadline
- Eligibility requirements
- How to apply and what documents are needed
- Direct application link
- Quick comparison table across all scholarships
- Deadline countdown — which applications close soonest

## How it works

The skill follows a 3-step pipeline:

1. **Discover** — identifies 5-8 relevant scholarship sources in real time based on your type, university, and region — no hardcoded lists
2. **Scrape** — fires one TinyFish agent per source simultaneously, extracting up to 5 scholarships per page from live listings
3. **Filter and rank** — deduplicates across sources, removes expired deadlines, sorts by closing date then amount

Works for **any scholarship type, university, and region worldwide**.

## Built with

- [TinyFish Web Agent](https://tinyfish.ai) — parallel web scraping
- [Scholarship Finder](https://github.com/KrishnaAgarwal7531/tinyfish-projects) — the original web app this skill is based on

## License

MIT
