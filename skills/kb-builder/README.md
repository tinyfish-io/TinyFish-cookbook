# KB Builder — TinyFish Skill

**Build and maintain an Obsidian-ready knowledge base from the live web.**

Ask your coding agent things like:
- *"Build me a knowledge base on web agent frameworks"*
- *"Build me a knowledge base on Kolmogorov-Arnold Networks"*
- *"Build me a knowledge base on landing page design patterns, start from these URLs..."*
- *"Update my KAN knowledge base with these 3 new URLs"*
- *"Build me a knowledge base on browser agents --trace"*

The agent uses TinyFish's web agent to visit public sources, extract the highest-signal information, and write a clean markdown vault with `[[wikilinks]]`.

The goal is not just to summarize sources. The skill is meant to synthesize the field:

- what the core mental model is
- what actually matters
- what the main approaches are
- what is foundational vs derivative
- what is still unresolved
- what to read first if you want real understanding

## Input modes

- **Topic only** — the agent starts from search and hub pages
- **Topic + starter URLs** — the agent uses your URLs first, then expands from there
- **Update an existing KB** — the agent adds new sources into an existing vault instead of rebuilding blindly
- **Optional trace mode** — `--trace` saves raw TinyFish outputs in `_trace/` for debugging and deeper inspection

## Output

Always generated:
- `index.md`
- `sources.md`
- `audit.md`
- `manifest.json`

Generated only when relevant:
- `papers.md`
- `repos.md`
- `docs.md`
- `articles.md`
- `datasets.md`
- `benchmarks.md`
- `people.md`
- other topic-specific markdown files
- `updates.md` when the KB is refreshed
- `_trace/` only when `--trace` is used

## Requirements

- TinyFish CLI installed
- TinyFish authenticated
- Public web sources only

## What makes this useful

- Explicit `tinyfish agent run` command flow
- One source per TinyFish run for better reliability
- Dynamic output files based on what the agent actually finds
- Obsidian-compatible markdown with `[[wikilinks]]`
- Honest logging of every visited URL in `sources.md`
- Honest audit trail with `FOUND`, `INFERRED`, `CONFLICTING`, and `MISSING`
- Update mode for refreshing an existing KB with new sources
- Stronger synthesis defaults so the KB feels like understanding, not just summaries
- Optional trace mode when you want raw TinyFish responses for inspection

## Built for

- builders
- vibe coders
- research-heavy devs
- technical founders doing deep dives
