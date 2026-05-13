# self-improve-with-tinyfish — Claude Skill

**Turn your coding agent into a self-upgrading system that researches live web sources and writes its own reusable skills.**

Ask your coding agent things like:
- *"Teach yourself the Stripe API"*
- *"Learn how to use Playwright and save it as a skill"*
- *"Make yourself a skill for deploying to Fly.io"*
- *"Upgrade yourself with knowledge about Cloudflare Workers"*

The agent uses TinyFish Search and Fetch to research official docs, examples, and real-world usage patterns, then synthesizes everything into a focused SKILL.md it can reuse in future conversations.

## What it does

1. Searches the live web using TinyFish Search for authoritative sources
2. Fetches and reads the best sources using TinyFish Fetch
3. Analyzes coverage across setup, workflows, edge cases, and validation
4. Writes a procedural, reusable SKILL.md with defaults, gotchas, and references
5. Installs the skill into agent memory for future use

## Why this is useful

Instead of re-researching the same tool or framework every conversation, the agent builds permanent procedural memory. Each skill it creates is:
- Focused on execution, not tutorial-style explanation
- Sourced from live, authoritative documentation
- Structured with defaults, gotchas, and validation checks
- Reusable across all future sessions

## Requirements

- TinyFish CLI: `npm install -g @tiny-fish/cli`
- Authenticated: `tinyfish auth login`

## Install

```bash
npx skills add github.com/tinyfish-io/tinyfish-cookbook --skill self-improve-with-tinyfish
```

## Built with

- [TinyFish Search](https://docs.tinyfish.ai/search-api)
- [TinyFish Fetch](https://docs.tinyfish.ai/fetch-api)
- Part of the [TinyFish Cookbook](https://github.com/tinyfish-io/tinyfish-cookbook)
