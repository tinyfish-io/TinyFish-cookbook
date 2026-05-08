---
name: academic-research-mapper
description: Map the research landscape for any technical or academic topic by searching arXiv, Semantic Scholar, and Google Scholar in parallel. Use when a developer, researcher, or engineer wants to understand what has been published, who the key authors are, which subtopics are active, and where the gaps still live. Runs parallel TinyFish agents across all three sources, deduplicates results, and synthesizes findings into a structured landscape report with a gap analysis. Trigger this skill whenever someone wants to survey a field, prepare a literature review, find underexplored research directions, or understand the state of the art before building something new.
---

# Research Landscape Mapper — Understand a Field Before You Build or Write

You have access to the TinyFish CLI (`tinyfish`), a tool that runs browser automations from the terminal using natural language goals. This skill uses it to search arXiv, Semantic Scholar, and Google Scholar in parallel, then synthesizes results into a structured landscape report with identified gaps.

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
> **Option 3 — bash/zsh (persist across sessions, add to ~/.bashrc or ~/.zshrc):**
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

Given a research topic (e.g. *"retrieval-augmented generation"* or *"protein structure prediction"*), this skill:

1. Searches **arXiv** for preprints sorted by most recent — capturing what is being worked on right now
2. Searches **Semantic Scholar** for papers ranked by relevance with citation counts — identifying what the field considers important
3. Searches **Google Scholar** for broad coverage including published venues not yet on arXiv

It then deduplicates across all three sources by title similarity, clusters papers into subtopics, and synthesizes findings into a structured landscape report: what is well-studied, what is emerging, and where the gaps are.

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

## Keyword Strategy

The quality of results depends entirely on your search terms. Before running anything, derive 2–3 keyword variants from the topic. Each source has different vocabulary norms — academic terms work best on Semantic Scholar, shorter compressed terms work best on arXiv.

| Topic | Primary keywords | Variant A | Variant B |
|-------|-----------------|-----------|-----------|
| Retrieval-augmented generation | `retrieval augmented generation` | `RAG language model` | `dense retrieval QA` |
| Protein structure prediction | `protein structure prediction` | `AlphaFold protein folding` | `ab initio structure biology` |
| Neural architecture search | `neural architecture search` | `NAS automated machine learning` | `hyperparameter optimization deep learning` |
| Federated learning privacy | `federated learning` | `federated learning differential privacy` | `distributed training privacy` |

Use the primary keywords for the first parallel pass. If any source returns fewer than 5 results, run a second pass with the variant keywords on that source only.

---

## Step-by-Step Workflow

### Step 1 — Derive keywords and build URLs

Before running any agents, construct all three search URLs. Do this in your head or in a scratch note — do not make TinyFish calls yet.

**arXiv URL pattern:**
```
https://arxiv.org/search/?query=<keywords>&searchtype=all&order=-announced_date_first
```

**Semantic Scholar URL pattern:**
```
https://www.semanticscholar.org/search?q=<keywords>&sort=Relevance
```

**Google Scholar URL pattern:**
```
https://scholar.google.com/scholar?q=<keywords>&as_sdt=0%2C5&hl=en
```

Replace `<keywords>` with URL-encoded primary keywords (spaces become `+`).

---

### Step 2 — Search all three sources in parallel

Fire all three agents simultaneously. Do NOT wait for one to finish before starting the next.

**arXiv — sorted by most recent:**
```bash
tinyfish agent run --sync \
  --url "https://arxiv.org/search/?query=retrieval+augmented+generation&searchtype=all&order=-announced_date_first" \
  "Extract the top 15 search results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"abstract_snippet\": str (first 150 chars of abstract), \"arxiv_id\": str, \"url\": str}]. If a result has no year visible, use the submission date year."
```

**Semantic Scholar — sorted by relevance with citation counts:**
```bash
tinyfish agent run --sync \
  --url "https://www.semanticscholar.org/search?q=retrieval+augmented+generation&sort=Relevance" \
  "Extract the top 15 search results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"citation_count\": str, \"venue\": str, \"abstract_snippet\": str (first 150 chars), \"url\": str}]. Scroll down to load more results if fewer than 10 are visible."
```

**Google Scholar — broad coverage:**
```bash
tinyfish agent run --sync \
  --url "https://scholar.google.com/scholar?q=retrieval+augmented+generation&as_sdt=0%2C5&hl=en" \
  "Extract the top 15 search results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"citation_count\": str, \"venue\": str, \"snippet\": str, \"url\": str}]. Citation count appears after 'Cited by' — extract that number."
```

---

## Parallel Execution

All three source searches are fully independent. Always fire them simultaneously.

**Good — parallel calls (fire and wait):**
```bash
tinyfish agent run --sync \
  --url "https://arxiv.org/search/?query=retrieval+augmented+generation&searchtype=all&order=-announced_date_first" \
  "Extract the top 15 results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"abstract_snippet\": str, \"arxiv_id\": str, \"url\": str}]" > /tmp/arxiv_results.json &

tinyfish agent run --sync \
  --url "https://www.semanticscholar.org/search?q=retrieval+augmented+generation&sort=Relevance" \
  "Extract the top 15 results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"citation_count\": str, \"venue\": str, \"abstract_snippet\": str, \"url\": str}]" > /tmp/s2_results.json &

tinyfish agent run --sync \
  --url "https://scholar.google.com/scholar?q=retrieval+augmented+generation&as_sdt=0%2C5&hl=en" \
  "Extract the top 15 results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"citation_count\": str, \"venue\": str, \"snippet\": str, \"url\": str}]" > /tmp/scholar_results.json &

wait
echo "All three sources complete."
```

**Bad — sequential calls:**
```bash
# Do NOT do this — triples the wait time for no benefit
tinyfish agent run --url "https://arxiv.org/..." "search arxiv, then also search semantic scholar, then also search google scholar"
```

Each source is always its own separate call. Never combine them into one goal.

---

### Step 3 — Handle sparse results (if needed)

After the parallel run completes, check each result set. If any source returned fewer than 5 papers, run a second pass on that source with variant keywords:

```bash
# Example: arXiv returned only 3 results for primary keywords
tinyfish agent run --sync \
  --url "https://arxiv.org/search/?query=RAG+language+model&searchtype=all&order=-announced_date_first" \
  "Extract the top 15 results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"abstract_snippet\": str, \"arxiv_id\": str, \"url\": str}]"
```

Do not run second passes if the primary pass was already rich — this wastes steps.

---

### Step 4 — Synthesize into a Landscape Report

Once all three sources have returned results, synthesize findings into this structure. Use only data that TinyFish actually returned — do not hallucinate paper titles, citation counts, or author names.

```
## Research Landscape: <topic>

### Volume & Coverage
- arXiv: <N> papers found, most recent: <year>
- Semantic Scholar: <N> papers found, highest citations: <N> (paper title)
- Google Scholar: <N> papers found
- Unique papers after deduplication: <N>

### Key Papers (sorted by citation count)
1. <Title> — <Authors>, <Year>, <Venue if known> — <citation_count> citations
   <one-sentence summary from abstract snippet>
2. ...
(list top 8–10 unique papers)

### Active Subtopics
Cluster the papers by what they are actually about. Label each cluster with a short name.
- **<Subtopic A>**: <N> papers — <1-sentence description of what this cluster covers>
- **<Subtopic B>**: <N> papers — ...
- **<Subtopic C>**: <N> papers — ...

### Key Authors & Groups
- <Author name> — <N> papers in results, affiliated with <institution if visible>
- ...
(list authors appearing 2+ times across the results)

### Recency Signal
- Papers from last 12 months: <N>
- Papers from last 3 years: <N>
- Oldest paper in results: <year>
- Trend: <accelerating / stable / declining> (infer from year distribution)

### Gaps & Open Directions
Based on what the papers cover and what they do not:
- **Gap 1**: <specific thing that is missing or underexplored>
- **Gap 2**: ...
- **Gap 3**: ...

### Landscape Verdict
<2–3 sentences: is this field crowded or open, mature or nascent, dominated by a few groups or distributed, and what is the single most underexplored angle?>
```

---

## Deduplication Rules

Papers appear across multiple sources. Before synthesizing, deduplicate using these rules in order:

1. **Exact title match** (case-insensitive) → keep one, prefer the Semantic Scholar entry (has citation count)
2. **Title similarity > 85%** (same words, different punctuation) → treat as the same paper
3. **Same arXiv ID** → always the same paper regardless of title variation
4. If unsure, keep both and note the possible duplicate in the report

---

## Subtopic Clustering Guide

Group papers by reading their abstract snippets, not just their titles. Common cluster patterns:

| If papers discuss... | Cluster label |
|---------------------|---------------|
| Benchmarks, evaluation datasets, metrics | "Evaluation & benchmarks" |
| New model architectures or training methods | "Model architecture" |
| Application to a specific domain (medical, legal, code) | "Domain adaptation: <domain>" |
| Efficiency, speed, compression, cost | "Efficiency & scaling" |
| Safety, alignment, robustness, hallucination | "Safety & reliability" |
| Surveys, meta-analyses, overviews | "Surveys & overviews" |

A paper can belong to at most two clusters. Name the clusters based on what you actually see, not these defaults if the topic warrants different ones.

---

## Managing Runs

```bash
# List recent runs (useful if a run takes longer than expected)
tinyfish agent run list

# Get the full output of a specific run by ID
tinyfish agent run get <run_id>

# Cancel a run that is taking too long
tinyfish agent run cancel <run_id>
```

---

## Output Format

The CLI streams `data: {...}` SSE lines by default. The final usable result is the event where `type == "COMPLETE"` and `status == "COMPLETED"` — the extracted data is in the `resultJson` field. Read the raw output directly; no script-side parsing is required.

When saving to files with `>` redirection as shown in the parallel example, the full SSE stream is saved. Extract the JSON by looking for the last line containing `"COMPLETED"` and parsing the `resultJson` value from it.

---

## Example: Full Run for "Mixture of Experts"

```bash
# Step 1 — fire all three in parallel
tinyfish agent run --sync \
  --url "https://arxiv.org/search/?query=mixture+of+experts+transformer&searchtype=all&order=-announced_date_first" \
  "Extract top 15 results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"abstract_snippet\": str, \"arxiv_id\": str, \"url\": str}]" \
  > /tmp/moe_arxiv.json &

tinyfish agent run --sync \
  --url "https://www.semanticscholar.org/search?q=mixture+of+experts+transformer&sort=Relevance" \
  "Extract top 15 results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"citation_count\": str, \"venue\": str, \"abstract_snippet\": str, \"url\": str}]" \
  > /tmp/moe_s2.json &

tinyfish agent run --sync \
  --url "https://scholar.google.com/scholar?q=mixture+of+experts+LLM&as_sdt=0%2C5&hl=en" \
  "Extract top 15 results as JSON: [{\"title\": str, \"authors\": [str], \"year\": str, \"citation_count\": str, \"venue\": str, \"snippet\": str, \"url\": str}]" \
  > /tmp/moe_scholar.json &

wait

# Step 2 — synthesize
# Read /tmp/moe_arxiv.json, /tmp/moe_s2.json, /tmp/moe_scholar.json
# Deduplicate → cluster → produce landscape report
```
