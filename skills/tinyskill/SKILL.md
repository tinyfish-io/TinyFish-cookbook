---
name: self-improve-with-tinyfish
description: Enables Hermes to create new reusable skills for itself by researching live web sources with TinyFish Search and Fetch, analyzing source coverage, writing SKILL.md files, and installing them into Hermes memory. Use when the user asks Hermes to learn, teach itself, upgrade itself, or save a reusable capability.
---

# Self-Improve With TinyFish

## When To Use

Use this skill when the user asks Hermes to:

- Learn a new tool, API, framework, workflow, or domain for future tasks.
- Create, install, or improve a reusable Hermes skill.
- Research official docs and examples before writing procedural memory.
- "Teach yourself," "upgrade yourself," or "make a skill for this."

Do not use this skill for ordinary one-off answers unless the user explicitly wants a saved skill.

## Pre-flight Check (REQUIRED)

Before making any TinyFish call, determine which mode to use.

**1. Check for CLI:**
```bash
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_FOUND"
```

**2. If CLI is found, check auth:**
```bash
tinyfish auth status
```

If authenticated, use **CLI mode** for all searches and fetches below.

**3. If CLI is not found, check for API key:**
```bash
test -n "$TINYFISH_API_KEY" && echo "API_KEY_AVAILABLE" || echo "TINYFISH_API_KEY is not set"
```

If the API key is available, use **API mode** for all searches and fetches below.

**4. If neither CLI nor API key is available**, stop and tell the user:
> Install the TinyFish CLI: `npm install -g @tiny-fish/cli`
> Then authenticate: `tinyfish auth login`
>
> Or set `TINYFISH_API_KEY` in your environment. Get a key at: https://agent.tinyfish.ai/api-keys

Do NOT proceed until one mode is confirmed.

---

## Core Workflow

1. Acknowledge the learning request.
   - Send a short progress update: `I'll research this with TinyFish and create a reusable skill.`
   - Extract a clean skill topic from the user request.
   - Preserve constraints such as "check official docs," "cover all endpoints," "focus on errors," or "make it production-ready."

2. Search with TinyFish.
   - Use the CLI or API (whichever passed pre-flight).
   - Run multiple targeted searches.
   - Prefer official docs and authoritative examples first.
   - Do not invent URLs.

3. Analyze search results.
   - Review titles, snippets, URLs, site names, and ranks.
   - Decide if the current sources cover setup, main workflow, edge cases, and validation.
   - If coverage is weak, run follow-up searches before fetching.

4. Fetch selected URLs.
   - Use TinyFish Fetch for known URLs.
   - Fetch 3-8 strong sources by default.
   - Prefer markdown output.
   - Continue if one URL fails; replace critical failed sources with another search result.

5. Write the new skill.
   - Create a focused `SKILL.md`.
   - Make it procedural and reusable.
   - Include gotchas, defaults, validation, and references.
   - Do not dump raw docs.

6. Install and verify.
   - Save the generated skill using Hermes skill management.
   - Verify with `skill_view` or `skills list`.
   - Tell the user only the skill name and that it can be used going forward.

---

## Search Pattern

Use TinyFish Search when you need ranked web results, snippets, and URLs.

### CLI mode

```bash
tinyfish search query "{topic} official documentation" --pretty
```

Run multiple searches:

```bash
tinyfish search query "{topic} official documentation"
tinyfish search query "{topic} API reference"
tinyfish search query "{topic} quickstart examples"
tinyfish search query "site:github.com {topic} examples issues"
tinyfish search query "{topic} common errors best practices"
```

For API skills, add:

```bash
tinyfish search query "{topic} authentication"
tinyfish search query "{topic} SDK reference"
tinyfish search query "{topic} rate limits errors"
```

For framework skills, add:

```bash
tinyfish search query "{topic} production best practices"
tinyfish search query "{topic} testing debugging deployment"
```

### API mode (fallback)

```bash
python3 - <<'PY'
import json
import os
import urllib.parse
import urllib.request

query = "Remotion official docs best practices"
api_key = os.environ["TINYFISH_API_KEY"]
url = "https://api.search.tinyfish.ai?query=" + urllib.parse.quote(query)

req = urllib.request.Request(url, headers={"X-API-Key": api_key})
with urllib.request.urlopen(req, timeout=15) as res:
    data = json.load(res)

for r in data.get("results", [])[:10]:
    print(json.dumps({
        "position": r.get("position"),
        "site_name": r.get("site_name"),
        "title": r.get("title"),
        "url": r.get("url"),
        "snippet": r.get("snippet"),
    }, ensure_ascii=False))
PY
```

Run the same query variations listed in CLI mode above, substituting the `query` variable each time.

---

## Search Analysis Loop

After each search pass, decide:

- Do I have at least one official source?
- Do I have setup or authentication covered?
- Do I have the main workflow covered?
- Do I have enough code or command examples?
- Do I have likely mistakes and validation checks?
- Are there duplicate or low-value sources I should ignore?

If no, send a short user update and run targeted follow-up searches.

Example update:

```text
I found the official docs and examples. I'm checking for pitfalls and validation guidance before writing the skill.
```

---

## Source Selection Rules

Prefer sources in this order:

1. Official docs, API references, quickstarts.
2. Official examples, cookbook repos, templates.
3. GitHub issues/discussions with concrete failure modes.
4. Stack Overflow answers for specific errors.
5. High-quality technical blog posts that fill real gaps.

Reject:

- Marketing pages without implementation detail.
- Duplicate docs pages.
- Outdated sources when official docs exist.
- Shallow posts that only repeat generic concepts.

Default to 3-8 fetched URLs total.

---

## Fetch Pattern

Use TinyFish Fetch when you already know the URLs and need clean extracted content.

### CLI mode

```bash
tinyfish fetch content get --format markdown "https://example.com/docs" "https://example.com/quickstart"
```

- Accepts multiple URLs in a single call — they are fetched in parallel server-side.
- `--format markdown` (default) returns clean readable text.
- Add `--links` to include extracted links from each page.

```bash
tinyfish fetch content get --format markdown --links \
  "https://example.com/docs" \
  "https://example.com/quickstart" \
  "https://example.com/api-reference"
```

### API mode (fallback)

Fetch up to 10 URLs per request:

```bash
python3 - <<'PY'
import json
import os
import urllib.request

api_key = os.environ["TINYFISH_API_KEY"]
urls = [
    "https://example.com/docs",
    "https://example.com/quickstart",
]

body = json.dumps({
    "urls": urls,
    "format": "markdown",
}).encode()

req = urllib.request.Request(
    "https://api.fetch.tinyfish.ai",
    data=body,
    headers={
        "X-API-Key": api_key,
        "Content-Type": "application/json",
    },
    method="POST",
)

with urllib.request.urlopen(req, timeout=150) as res:
    data = json.load(res)

for page in data.get("results", []):
    print("\n---SOURCE---")
    print("URL:", page.get("url"))
    print("FINAL:", page.get("final_url"))
    print("TITLE:", page.get("title"))
    print("TEXT:")
    print((page.get("text") or "")[:12000])

for err in data.get("errors", []):
    print("\n---FETCH ERROR---")
    print(err)
PY
```

Fetch returns per-URL errors in `errors[]`. Do not fail the whole run because one source failed.

---

## Writing The Generated Skill

The generated skill must be raw Markdown beginning with frontmatter:

```markdown
---
name: concise-kebab-case-name
description: Third-person description of what the skill does and when to use it.
---
```

The description must include:

- What the skill does.
- When Hermes should use it.

Use this structure unless the topic requires a better one:

```markdown
# Skill Title

## When To Use

## Core Workflow

## Defaults

## Key Patterns

## Gotchas

## Validation

## References
```

Write for future Hermes behavior, not for a human tutorial.

Include:

- Exact commands or code only when they change execution.
- Defaults and decision rules.
- Gotchas that Hermes is likely to miss.
- Validation checks before finishing.
- Source URLs in References.

Avoid:

- Raw search dumps.
- Long copied docs sections.
- Generic "best practices" filler.
- Unverified claims.
- Menus of options without a recommended default.

## Installing The Skill

After writing the skill:

1. Save it using Hermes skill management.
2. Verify the skill exists with `skill_view` or equivalent.
3. If verification fails, repair the frontmatter or skill path.
4. Send the user a concise completion message.

Completion message:

```text
Done, I added the <skill-name> skill and can use it going forward.
```

Do not send the full `SKILL.md` unless the user asks.

## User Progress Updates

During long runs, send concise updates:

```text
I'll research this with TinyFish and create a reusable skill.
Searching official docs and examples...
I found 6 candidate sources and am checking coverage.
Fetching the best sources...
Writing the skill...
Installing and verifying it...
Done, I added the skill and can use it going forward.
```

Do not expose raw JSON, terminal logs, or full source text in chat.

## Validation Checklist

Before finalizing, confirm:

- Pre-flight check passed (CLI or API key available).
- Search results included at least one authoritative source.
- Fetched content was actually used.
- Frontmatter has `name` and `description`.
- Skill name is kebab-case.
- Skill includes workflow, defaults, gotchas, validation, and references.
- The saved skill can be viewed by Hermes.

## References

- https://docs.tinyfish.ai/search-api
- https://docs.tinyfish.ai/fetch-api
- https://docs.tinyfish.ai/for-coding-agents
