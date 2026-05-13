# tinyskill — Hermes Skill

**Turn Hermes into a self-upgrading system that researches live web sources and writes its own reusable skills.**

Ask Hermes things like:
- *"Teach yourself the Stripe API"*
- *"Learn how to use Playwright and save it as a skill"*
- *"Make yourself a skill for deploying to Fly.io"*
- *"Upgrade yourself with knowledge about Cloudflare Workers"*

Hermes uses TinyFish Search and Fetch to research official docs, examples, and real-world usage patterns, then synthesizes everything into a focused SKILL.md it can reuse in future conversations.

## What it does

1. Checks for TinyFish CLI first, falls back to the raw API if CLI isn't available
2. Searches the live web using TinyFish Search for authoritative sources
3. Fetches and reads the best sources using TinyFish Fetch
4. Analyzes coverage across setup, workflows, edge cases, and validation
5. Writes a procedural, reusable SKILL.md with defaults, gotchas, and references
6. Installs the skill into Hermes memory for future use

## Why this is useful

Instead of re-researching the same tool or framework every conversation, Hermes builds permanent procedural memory. Each skill it creates is:
- Focused on execution, not tutorial-style explanation
- Sourced from live, authoritative documentation
- Structured with defaults, gotchas, and validation checks
- Reusable across all future sessions

## Requirements

One of:
- **TinyFish CLI** (preferred): `npm install -g @tiny-fish/cli` then `tinyfish auth login`
- **API key**: Set `TINYFISH_API_KEY` in your environment. Get a key at https://agent.tinyfish.ai/api-keys

## Install

```bash
npx skills add github.com/tinyfish-io/tinyfish-cookbook --skill tinyskill
```

## Built with

- [TinyFish Search](https://docs.tinyfish.ai/search-api)
- [TinyFish Fetch](https://docs.tinyfish.ai/fetch-api)
- Part of the [TinyFish Cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)
