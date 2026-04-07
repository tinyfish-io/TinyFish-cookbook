---
name: competitor-product-monitor
description: Monitor competitor product releases and new feature announcements. Use this skill when the user wants to track what competitors are shipping, find the latest product launches in their industry, or generate a competitor release report. Triggers include phrases like "track competitor releases", "what are my competitors launching", "monitor competitor products", "competitor product report", or any request to watch a rival company's product updates.
---

# Competitor Product Monitor

This skill walks the agent through a structured workflow to identify competitors, fetch their latest product release information using the TinyFish web agent, and generate a clean report for the user.

---

## Pre-flight: TinyFish Check (REQUIRED)

Before doing anything, verify TinyFish is available:

```bash
which tinyfish && tinyfish --version || echo "TINYFISH_CLI_NOT_INSTALLED"
tinyfish auth status
```

If not installed, stop and tell the user:
> Install the TinyFish CLI first: `npm install -g @tiny-fish/cli`
> Then authenticate: `tinyfish auth login`

Do NOT proceed until both checks pass.

---

## Workflow

### Step 1 — Ask the user for their product and field

Say:
> To get started, please tell me:
> 1. **Your industry or field** (e.g. "project management SaaS", "electric vehicles", "cloud storage")
> 2. **Your product or company name** (e.g. "Notion", "Tesla", "Dropbox")

Wait for the user's response before continuing.

---

### Step 2 — Identify competitors

Based on the user's field and product, suggest 3–5 direct competitors. For each competitor, find or infer their primary website URL.

Present them in a clear list, like:

> Here are the competitors I found for **[product]** in **[field]**:
>
> 1. **Asana** — https://asana.com
> 2. **Monday.com** — https://monday.com
> 3. **ClickUp** — https://clickup.com
>
> Does this look right? Feel free to remove any, or add others (with their website URLs if possible).

Wait for the user to confirm or modify the list before proceeding.

**Tips for finding competitor URLs:**
- Use the company's official homepage, not a blog or news page
- Prefer URLs like `https://companyname.com` over subdomains
- If the user provides a competitor name without a URL, infer the most likely homepage

---

### Step 3 — Fetch product release information with TinyFish

For each confirmed competitor, run a separate TinyFish command. Run them in parallel for speed.

Use this command pattern for each competitor:

```bash
tinyfish agent run --sync --url "<competitor_url>" \
  "Find the latest product release, new feature announcement, or product update on this website. Look at the blog, changelog, newsroom, or press release pages. Return JSON: {\"company\": str, \"latest_release\": str, \"release_date\": str, \"description\": str, \"source_url\": str}"
```

**Good pages to target** (append to the base URL if needed):
- `/blog`
- `/changelog`
- `/news`
- `/newsroom`
- `/releases`
- `/whats-new`

If the base URL does not surface release info, retry with one of the above paths appended.

**Parallel execution example** (run all at once):

```bash
tinyfish agent run --sync --url "https://asana.com/product" \
  "Find the latest product release or feature announcement. Return JSON: {\"company\": str, \"latest_release\": str, \"release_date\": str, \"description\": str, \"source_url\": str}"

tinyfish agent run --sync --url "https://monday.com/blog" \
  "Find the latest product release or feature announcement. Return JSON: {\"company\": str, \"latest_release\": str, \"release_date\": str, \"description\": str, \"source_url\": str}"

tinyfish agent run --sync --url "https://clickup.com/blog" \
  "Find the latest product release or feature announcement. Return JSON: {\"company\": str, \"latest_release\": str, \"release_date\": str, \"description\": str, \"source_url\": str}"
```

Collect the `resultJson` field from each `COMPLETE` event in the TinyFish output.

---

### Step 4 — Generate the competitor release report

Once all TinyFish results are collected, compile and present the report to the user in this format:

---

**Competitor Product Release Report**
*Field: [field] | Your product: [product] | Generated: [date]*

---

**[Company Name]**
Release: [latest_release]
Date: [release_date]
[description]
Source: [source_url]

---

**[Company Name]**
...

---

After the report, ask the user:
> Would you like to monitor these competitors periodically for new releases? If yes, let me know how often (e.g. weekly, daily) and how you'd like to be notified (e.g. email, Slack).

---

## Output JSON Schema

Each TinyFish result should conform to:

```json
{
  "company": "string — competitor company name",
  "latest_release": "string — name or title of the release/announcement",
  "release_date": "string — date as found on the page, or 'Unknown'",
  "description": "string — 1-3 sentence summary of what was released",
  "source_url": "string — direct URL to the announcement or changelog page"
}
```

If a field cannot be found, set it to `"Not found"` rather than omitting it.

---

## Handling Failures

| Problem | Action |
|---|---|
| TinyFish returns no result | Retry with a more specific URL (e.g. append `/changelog` or `/blog`) |
| Page is bot-protected | Note it in the report as "Could not fetch — site may require login" |
| Release date missing | Use `"Date not found"` and still include the release info |
| Company has no public changelog | Search their blog or press page instead |

---

## Example Full Run

**User:** I work in the task management space. My product is Todoist.

**Agent finds competitors:** Asana, Notion, TickTick, Any.do, Microsoft To Do

**Agent runs (in parallel):**
```bash
tinyfish agent run --sync --url "https://asana.com/product" "..."
tinyfish agent run --sync --url "https://notion.so/blog" "..."
tinyfish agent run --sync --url "https://ticktick.com/blog" "..."
tinyfish agent run --sync --url "https://any.do/blog" "..."
tinyfish agent run --sync --url "https://todo.microsoft.com" "..."
```

**Agent presents:**

> **Competitor Product Release Report**
> Field: task management | Your product: Todoist | Generated: 2026-04-06
>
> **Asana**
> Release: Asana AI Studio — custom workflow automation
> Date: March 2026
> Asana launched AI Studio, allowing teams to build no-code AI workflows...
> Source: https://asana.com/product/ai-studio
>
> ...

---

## Notes

- Always run one TinyFish command per competitor — do not combine multiple sites into one goal.
- Use `--sync` flag so results are fully returned before generating the report.
- The report should list competitors in order of most recent release date first, if dates are available.
- If the user adds a competitor mid-workflow, fetch only that new competitor and append to the existing report.
