---
name: kb-builder
description: >
  Build an Obsidian-compatible knowledge base from public web sources using the TinyFish CLI.
  Use this skill when a user wants a builder-grade markdown knowledge base on a technical topic,
  asks for a structured research vault, or wants a topic compiled from live public sources into
  interlinked markdown files. Supports two input modes: topic only, or topic plus starter URLs.
  Supports both first-build and update workflows. Always generates index.md, sources.md, audit.md,
  and manifest.json. Creates additional files only when the evidence supports them. The output must
  synthesize the topic into a usable mental model, not just summarize pages. Uses explicit
  tinyfish agent run commands and public web sources only. Optional `--trace` mode saves raw
  TinyFish outputs under `_trace/` for debugging.
---

# KB Builder

Build a topic-specific markdown knowledge base by using TinyFish to browse public web sources and extract structured evidence.

This skill is for **builder knowledge bases**, not personal journals and not direct code generation.

The output is a folder you can drop into Obsidian immediately, and update later without starting over.

## Core principle

Do not produce a pile of source summaries.

The KB should help the reader understand:

- the core mental model
- the main approaches or schools of thought
- what is foundational vs derivative
- what actually matters
- what is unresolved
- what to read first if they want genuine understanding

If the output only says what each source said, the skill has failed.

## Pre-flight check

Run both checks before any TinyFish call:

```bash
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"
tinyfish auth status
```

If TinyFish is not installed, stop and tell the user:

```bash
npm install -g @tiny-fish/cli
```

If TinyFish is not authenticated, stop and tell the user:

```bash
tinyfish auth login
```

Do not continue until both checks pass.

## Scope

- **Allowed:** public web pages, public GitHub repos, public papers, public docs, public datasets, public blog posts
- **Not allowed:** private sources, local private files, authenticated dashboards, chat logs, email, Slack, or anything the user cannot access publicly
- **Primitive:** use explicit `tinyfish agent run` commands
- **Output shape:** always `index.md`, `sources.md`, `audit.md`, and `manifest.json`; everything else is dynamic

## Input modes

You support two modes:

1. **Topic only**
   - Example: `Build me a knowledge base on web agent frameworks`
2. **Topic + starter URLs**
   - Example: `Build me a knowledge base on web agent frameworks and start from these URLs: ...`
3. **Update an existing KB**
   - Example: `Update my knowledge base on Kolmogorov-Arnold Networks with these new URLs: ...`
4. **Trace mode**
   - Example: `Build me a knowledge base on browser agents --trace`

If the topic is missing, ask for it before proceeding.

If starter URLs are present:
- use them first
- deduplicate them
- keep only public URLs

If the user explicitly says `update`, `refresh`, `add these sources`, or clearly wants to add to an existing KB, switch into update mode.

If the user includes `--trace`, `trace`, `debug`, or explicitly asks for raw outputs:
- enable trace mode
- save raw TinyFish outputs under `_trace/`
- keep `_trace/` out of the main page navigation unless the user asks for it

## Output directory

Create a folder named:

```text
kb-{topic-slug}/
```

Examples:
- `kb-web-agent-frameworks/`
- `kb-kolmogorov-arnold-networks/`
- `kb-landing-page-design-patterns/`

When trace mode is enabled, also create:

```text
kb-{topic-slug}/_trace/
```

## Always-generated files

### `index.md`

This file is always required. It should contain:
- a short topic overview
- what the knowledge base covers
- a list of generated pages using `[[wikilinks]]`
- 3-7 key takeaways
- open questions or evidence gaps
- a **mental model** section
- a **what matters** section
- a **reading order** section for the strongest sources or pages

### `sources.md`

This file is always required. It should log **every URL visited** with:
- stable source ID
- timestamp
- URL
- source label
- reason it was opened
- result status: useful, partial, irrelevant, blocked, or conflicting

Use ISO 8601 timestamps.

Each source entry must use a stable source ID such as `S001`, `S002`, `S003`.

Example:

```markdown
## [S001] 2026-04-06T08:49:24.014Z | useful

- URL: https://example.com
- Label: Official docs
- Reason opened: discovery pass for {TOPIC}
- Notes: yielded 4 good follow-up links
```

### `audit.md`

This file is always required. It is the trust layer for the KB.

It must contain four sections:

- `FOUND`
- `INFERRED`
- `CONFLICTING`
- `MISSING`

Example:

```markdown
# Audit

## FOUND
- [FOUND | S003] Pikachu is an Electric-type Mouse Pokemon.

## INFERRED
- [INFERRED | S003,S004] Pikachu's mascot role is reinforced across both official canon and encyclopedia framing.

## CONFLICTING
- [CONFLICTING | S004,S009] Source A says X while source B frames Y.

## MISSING
- [MISSING] No dedicated benchmark source was read in this run.
```

Rules:

- `FOUND` requires at least one direct source ID
- `INFERRED` should usually reference at least two source IDs
- `CONFLICTING` must name the disagreement explicitly
- `MISSING` should be used whenever the KB lacks evidence rather than hand-waving

### `manifest.json`

This file is always required. It stores:

- topic
- topic slug
- build or update mode
- created timestamp
- last updated timestamp
- page list
- run history
- simple run bookkeeping like URLs visited and pages generated
- whether trace mode was enabled

## Dynamic files

Do **not** hardcode a fixed set like `papers.md` or `repos.md` for every topic.

Create additional files only when the topic actually supports them.

Common examples:
- `papers.md`
- `repos.md`
- `docs.md`
- `articles.md`
- `datasets.md`
- `benchmarks.md`
- `people.md`
- `glossary.md`
- `timeline.md`
- `landscape.md`
- `reading-order.md`
- `disagreements.md`
- `what-matters.md`

Rules:
- if a category has meaningful evidence, create its file
- if it does not, skip it
- do not create empty placeholder files
- if a category only has 1-2 minor findings, fold it into `index.md` instead
- create `updates.md` when the KB is refreshed in update mode
- if the topic is broad enough to have multiple camps, phases, or implementation styles, create `landscape.md`
- if the sources disagree in meaningful ways, create `disagreements.md`
- if the reader would benefit from a guided path, create `reading-order.md`

All generated markdown files should use `[[wikilinks]]` when linking to other local pages.

Trace mode exception:
- files under `_trace/` are debugging artifacts, not user-facing KB pages
- do not clutter `index.md` with `_trace/` links unless the user explicitly asks

## Operating model

Use a **two-pass workflow**:

1. **Discovery pass**
   - find high-value URLs
2. **Reading pass**
   - extract structured information from the selected URLs

Use **one TinyFish run per URL**.

Do not ask one TinyFish agent to cover multiple independent sites in a single command.

Run independent URLs in parallel where possible using background jobs and `wait`.

## Step 0 — Decide build mode

Determine whether this run is:

- `build` — creating a KB from scratch
- `update` — adding or refreshing sources in an existing KB

Also determine:

- `TRACE` = `true` or `false`

Use `update` mode when:

- the user explicitly says update or refresh
- the target KB folder already exists and the user's intent is additive

In update mode:

- read the existing `index.md`
- read the existing `sources.md`
- read the existing `audit.md`
- read the existing `manifest.json`
- do not renumber old source IDs
- only rewrite the pages whose evidence changed

## Step 1 — Normalize the task

Write down:
- `TOPIC`
- `TOPIC_SLUG`
- `STARTER_URLS` if provided
- `MODE` = `build` or `update`
- `TRACE` = `true` or `false`

Keep the topic human-readable in the markdown output.

## Step 2 — Build the starting URL set

If the user gave starter URLs:
- start with those

If a starter URL is a direct arXiv paper page such as `/abs/...`, `/pdf/...`, or an arXiv HTML render:
- treat it as a **reading target**
- do not send it through the discovery-search workflow first

Then expand with a small set of public discovery URLs relevant to the topic. Choose from these patterns when relevant:

- GitHub repo search:
  ```text
  https://github.com/search?q={TOPIC}&type=repositories
  ```
- arXiv search:
  ```text
  https://arxiv.org/search/?query={TOPIC}&searchtype=all
  ```
- Hugging Face models search:
  ```text
  https://huggingface.co/models?search={TOPIC}
  ```
- Hugging Face datasets search:
  ```text
  https://huggingface.co/datasets?search={TOPIC}
  ```
- General web discovery:
  ```text
  https://duckduckgo.com/?q={TOPIC}
  ```

Only include discovery URLs that are likely to produce useful public results.

Aim for 4-8 discovery URLs in the first pass, not 20.

Always reserve **one extra discovery slot** for a trusted-source scout that is not limited to the template list above.

Trusted-source scout rule:
- run one extra discovery agent against a general search page for the topic
- use a public search engine results page that TinyFish can access reliably in the current environment
- do not hardcode or prefer a specific search engine unless the user explicitly asks for one
- the scout's job is to find **trusted primary sources outside the template list**, not to repeat GitHub/arXiv/Hugging Face results you already have
- trusted sources include official product docs, official company or lab pages, standards bodies, top conference project pages, official benchmark sites, and strong primary-source blog posts from recognized builders or research groups
- do not promote SEO sludge, low-signal affiliate lists, or derivative summaries unless they are the only path to a stronger primary source

Important:
- arXiv search pages are valid discovery URLs when papers matter for the topic
- they are often slower than GitHub or DuckDuckGo discovery pages
- do **not** drop arXiv just because it is the slowest source in the batch

When selecting discovery and reading targets, prefer sources that improve understanding, not just coverage:

- canonical or foundational sources
- implementation anchors
- benchmark or comparison sources
- one or two strong explainers that clarify the field

Do not spend most of your budget on redundant summaries of the same idea.

## Step 3 — Run the discovery pass

For each discovery URL, run TinyFish with a concrete extraction goal.

Command template:

```bash
tinyfish agent run --sync --url "{DISCOVERY_URL}" \
  "You are helping build a markdown knowledge base on '{TOPIC}'.
   Read this page and identify up to 5 high-value public URLs worth following.
   Prefer official docs, canonical GitHub repos, papers, datasets, benchmarks, and
   high-signal tutorials or explainers.
   Return JSON:
   {
     \"candidates\": [
       {
         \"title\": \"\",
         \"url\": \"\",
         \"sourceType\": \"docs|repo|paper|dataset|article|benchmark|person|other\",
         \"whyItMatters\": \"\"
       }
     ]
   }
   Rules:
   - public URLs only
   - max 5 candidates
   - do not guess URLs
   - if nothing useful is found, return an empty array" \
  > /tmp/kb_discovery_{SAFE_NAME}.json &
```

Trusted-source scout template:

```bash
tinyfish agent run --sync --url "{GENERAL_SEARCH_URL}" \
  "You are helping build a markdown knowledge base on '{TOPIC}'.
   Search this results page for up to 5 trusted high-value sources that are
   NOT already represented by the template discovery URLs.
   Prefer official docs, official company or lab pages, standards bodies,
   official benchmark sites, top conference project pages, and strong primary
   source explainers from recognized builders or research groups.
   Return JSON:
   {
     \"candidates\": [
       {
         \"title\": \"\",
         \"url\": \"\",
         \"sourceType\": \"docs|repo|paper|dataset|article|benchmark|person|other\",
         \"whyItMatters\": \"\",
         \"whyTrusted\": \"\"
       }
     ]
   }
   Rules:
   - public URLs only
   - max 5 candidates
   - do not guess URLs
   - avoid low-signal SEO listicles unless they point to a stronger primary source
   - if the template list already covers the best sources, return an empty array" \
  > /tmp/kb_discovery_trusted_{SAFE_NAME}.json &
```

Important runtime behavior:
- when you redirect TinyFish output to a file with `> /tmp/...json`, that file may stay `0` bytes until the run exits
- a zero-byte discovery file does **not** mean the run is stuck
- arXiv search pages often finish later than GitHub or DuckDuckGo pages in the same batch
- if the rest of the batch finishes first, keep waiting for arXiv before declaring failure

Timeout rule:
- allow up to **10 minutes** for a single discovery run before marking it `partial` or `blocked`
- for arXiv discovery specifically, assume 1-3 minutes is normal and keep waiting
- only intervene early if the process is clearly gone or has already produced a terminal TinyFish error

After launching all discovery runs:

```bash
wait
```

Interpretation rule:
- `wait` finishing slowly because one arXiv process is still running is expected behavior
- do not kill the arXiv run just because the other files finished first
- only treat the batch as stalled if an individual discovery run exceeds the 10-minute timeout above

If `TRACE=true`, copy or save the raw discovery outputs into `_trace/` with readable names such as:

- `_trace/discovery-github.json`
- `_trace/discovery-arxiv.json`
- `_trace/discovery-ddg.json`
- `_trace/discovery-trusted-scout.json`

Then read all discovery outputs, merge them, deduplicate by URL, and choose the best 6-12 URLs for the reading pass.

Trusted-source promotion rule:
- if the trusted-source scout finds credible primary sources not already covered by the template list, promote the best 1-5 of them into the reading pass
- run one TinyFish reading pass per promoted source, in parallel with the rest of the batch
- if the scout only finds weaker or duplicative sources, keep them out of the reading pass and record them as low-value or skipped in `sources.md` only if you actually opened them

Selection priority:
1. official documentation
2. trusted non-template primary sources from the scout
3. canonical GitHub repositories
4. arXiv papers
5. Hugging Face model or dataset pages
6. strong blog posts or tutorials
7. benchmark or leaderboard pages

By default, do **not** spend your budget on social posts, Reddit threads, or generic chatter unless the user explicitly asks for them.

## Step 4 — Run the reading pass

Run one TinyFish agent per chosen URL.

Command template:

```bash
tinyfish agent run --sync --url "{TARGET_URL}" \
  "You are extracting evidence for a markdown knowledge base on '{TOPIC}'.
   Read this source carefully and return structured JSON.
   Extract:
   - title
   - canonicalUrl
   - sourceType
   - shortSummary
   - keyFindings: up to 7 bullets
   - whyItMatters
   - foundationality: foundational|important|derivative|unclear
   - approachOrSchool: the main approach, camp, or framing this source represents
   - whatThisChanges: one line on how this source changes the reader's understanding
   - importantEntities: people, projects, libraries, datasets, papers, companies
   - importantLinks: up to 5 URLs mentioned or linked from the page
   - suggestedPages: page names this should contribute to, e.g. [\"repos\", \"papers\", \"docs\", \"articles\", \"benchmarks\"]
   - evidenceQuality: high|medium|low
   - limitations: things this page did not answer
   If this is a GitHub repository:
   - inspect the README
   - inspect up to 3 important files or folders if they are clearly relevant
   - include key files or folders under keyFindings
   If this is a paper:
   - extract the title, abstract-level contribution, and 3-5 implementation-relevant points
   If this is documentation:
   - extract concepts, APIs, workflows, and caveats
   If this is a dataset or model page:
   - extract task, modality, schema if visible, and usage constraints
   Also extract:
   - what this source says that is actually important
   - what this source does NOT resolve
   Return JSON only.
   Do not invent facts. If something is missing, say it is missing." \
  > /tmp/kb_read_{SAFE_NAME}.json &
```

After launching all reading runs:

```bash
wait
```

If `TRACE=true`, save the raw reading outputs into `_trace/` as well, for example:

- `_trace/read-paper.json`
- `_trace/read-repo-main.json`
- `_trace/read-docs.json`

Do not summarize `_trace/` into the main KB pages. It exists for inspection, debugging, and trust when needed.

## Step 5 — Log all sources immediately

Before writing the synthesis pages, update `sources.md` with every visited URL.

In build mode:
- start source IDs at `S001`

In update mode:
- read the highest existing source ID
- continue numbering from there

Use one section per visited page. Do not skip failed or low-value pages.

## Step 6 — Build the audit trail

Before or while writing the content pages, classify important claims into:

- `FOUND`
- `INFERRED`
- `CONFLICTING`
- `MISSING`

Use these rules:

- `FOUND` = directly supported by one or more sources
- `INFERRED` = synthesis across sources or a careful deduction
- `CONFLICTING` = sources disagree or frame something differently
- `MISSING` = the KB does not have enough evidence

The audit file is required even if it is short.

For especially important claims in topic pages, you may add inline markers like:

```markdown
- [FOUND | S003] ...
- [INFERRED | S003,S004] ...
```

Use them sparingly. Do not turn every line into metadata noise.

## Step 7 — Build the synthesis layer

Before deciding the final page set, synthesize the field as a field.

You must identify:

- the core mental model
- the main approaches, camps, or architectural patterns
- which sources are foundational
- which sources are implementation-oriented
- which sources are mostly derivative or explanatory
- the biggest unresolved questions or disagreements
- the best reading order for someone who wants real understanding

If the topic is broad and source-rich, this synthesis should appear in:

- `index.md`
- and, when justified, one or more of:
  - `landscape.md`
  - `reading-order.md`
  - `disagreements.md`
  - `what-matters.md`

Anti-summary rule:

- do not let every page become "source A says X, source B says Y"
- collapse repetition
- explain what the repetition means
- separate first-order ideas from derivative restatements

## Step 8 — Decide the page set

Create the optional pages based on the actual evidence you found.

Good examples:
- if you found 3+ relevant papers, create `papers.md`
- if you found multiple strong repositories, create `repos.md`
- if you found official docs plus API references, create `docs.md`
- if the topic has strong benchmarks, create `benchmarks.md`
- if the topic is mostly design/tutorial content, create `articles.md`

If the topic does **not** have a category, skip that file.

Do not create a research-shaped output for topics that are not research-shaped.

## Step 9 — Write the knowledge base

Write clean markdown. Keep it skimmable and builder-friendly.

### `index.md` structure

Use this pattern:

```markdown
# {TOPIC}

## Overview
{2-4 paragraph overview}

## Mental Model
{Explain the topic so a smart builder can actually understand the structure of the space.}

## Pages
- [[docs]]
- [[repos]]
- [[articles]]

## Key Takeaways
- ...
- ...

## Gaps
- ...

## Reading Order
- {what to read first}
- {what to read second}
- {what to skip until later}

## Source Log
- [[sources]]
```

In update mode, add a short section such as:

```markdown
## This Run
- Mode: update
- Updated pages: [[papers]], [[docs]]
- See also: [[updates]]
```

### Optional page structure

Each optional page should:
- start with `# {Page Name}`
- summarize what the page covers
- organize findings under clear headings
- include outbound `[[wikilinks]]` to sibling pages where relevant
- include source links inline as standard markdown links
- include a short section on why the page matters in the bigger picture
- avoid repeating material that belongs more naturally in another page

Example:

```markdown
# Repositories

## Canonical Repos

### Primary repository
- Summary: ...
- Why it matters: ...
- Key files or concepts: ...
- Related: [[docs]], [[articles]]
- Source: [GitHub](https://github.com/...)
```

### `updates.md` structure

Create this file only in update mode, or append to it if it already exists.

Pattern:

```markdown
# Updates

## Run 2 | 2026-04-08T10:11:00Z

- Added sources: [S007], [S008]
- Updated pages: [[papers]], [[docs]]
- New confirmed claims:
  - [FOUND | S008] ...
- Open conflicts:
  - [CONFLICTING | S004,S008] ...
```

### `manifest.json` structure

At minimum, store:

- `topic`
- `topic_slug`
- `mode`
- `trace`
- `created_at`
- `last_updated_at`
- `pages`
- `runs`

Append a new run entry on each build or update.

## Step 10 — Quality rules

Always follow these rules:

- public web only
- `index.md`, `sources.md`, `audit.md`, and `manifest.json` are mandatory
- all other files are evidence-driven
- use `[[wikilinks]]` for local page references
- keep filenames simple and lowercase
- do not invent structure just to make the KB look bigger
- if a source conflicts with another source, say so explicitly
- if a source is weak, say so explicitly
- if you cannot access a page or it is thin, record that in `sources.md`
- if the KB is being updated, do not destroy prior valid work just because new sources were added
- the KB should teach the reader how to think about the topic, not just what links were visited
- every major page should answer "why does this matter?" not only "what is this?"
- if multiple sources restate the same point, compress them into one synthesized claim instead of duplicating summaries
- include a reading path for the strongest or most foundational sources when the topic is broad
- raw TinyFish outputs should only be stored when trace mode is requested

## Parallelism rule

Good:
- one TinyFish run per URL
- many URLs in parallel
- letting slow arXiv discovery runs finish when they are still within the 10-minute timeout
- one extra trusted-source scout in parallel with the template discovery runs

Bad:
- one TinyFish run told to visit GitHub, arXiv, and Hugging Face all in a single goal
- treating a zero-byte redirected output file as proof that TinyFish is stuck
- killing arXiv discovery after 60-120 seconds just because faster sources finished first
- blindly trusting the template list and missing a stronger official source found by the scout

## Edge cases

### Topic has no papers

That is fine. Do not create `papers.md`.

### Topic has no datasets

That is fine. Do not create `datasets.md`.

### Topic is mostly docs and blogs

Create files like `docs.md` and `articles.md`.

### Topic is broad and noisy

Prefer fewer high-quality sources over many weak ones.

### Topic has only starter URLs and little public discovery value

Use the starter URLs first, extract them well, and keep the KB narrow.

## Final delivery

At the end, report:
- output folder path
- files created
- number of URLs visited
- mode: build or update
- trace: on or off
- any important gaps or blocked sources

Use a concise summary like:

```text
KB Builder complete for {TOPIC}
Output: kb-{topic-slug}/
Mode: {MODE}
Trace: {TRACE}
Files: index.md, sources.md, ...
URLs visited: 11
Open gaps: benchmarks unclear, no public dataset page found
```
