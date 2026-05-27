# ModuleMapper Skill for Claude

Research any university course using live student reviews — directly inside Claude.

## What it does

Ask Claude things like:
- *"What is BT1101 like at NUS?"*
- *"Is CS2103T worth taking?"*
- *"How hard is MATH101 at MIT?"*
- *"What do students say about CS50 at Harvard?"*

Claude will automatically scrape **Reddit**, **RateMyProfessors**, the university's **course review platform**, the **official course page**, and **student blogs** in real-time using TinyFish — then synthesise everything into a structured verdict with score, difficulty, workload, student quotes, and more.

## Requirements

- A **TinyFish API key** — get one free (500 steps, no credit card) at [tinyfish.ai](https://agent.tinyfish.ai/api-keys)
- Set it as the environment variable `TINYFISH_API_KEY`

## Install

### Option 1 — Skills CLI (recommended)

```bash
npx skills add https://github.com/tinyfish-io/tinyfish-cookbook --skill modulemapper
```

### Option 2 — Manual

1. Clone or download this repository
2. Copy the `modulemapper/` folder into your agent's skills directory:
   - Claude Code: `~/.claude/skills/`
   - Cursor: `.cursor/skills/` in your project
   - Global (all agents): `~/.agents/skills/`
3. The skill is picked up automatically — no restart needed

## How it works

The skill follows a 4-step pipeline:

1. **Discover** — searches the web in real-time to find the right subreddits, course review platform, and official course page for any university
2. **Scrape** — runs multiple TinyFish web agents in parallel across all sources
3. **Synthesise** — analyses all raw student data and produces a structured verdict
4. **Present** — displays score, difficulty, workload, student quotes, tags, and more

Works for **any university worldwide** — not limited to a hardcoded list.

## Built with

- [TinyFish Web Agent](https://tinyfish.ai) — parallel web scraping
- [ModuleMapper](https://github.com/KrishnaAgarwal7531/tinyfish-projects/tree/main/modulemapper) — the original web app this skill is based on

## License

MIT
