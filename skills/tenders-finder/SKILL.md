---
name: tenders-finder
description: >
  Find open Singapore government tenders for any sector in real time using parallel TinyFish
  agents scraping multiple government tender portals simultaneously.
  Use this skill whenever a user wants to find government tenders, asks "find tenders for IT
  in Singapore", "what government contracts are open for construction", "Singapore tenders
  closing soon", "GeBIZ tenders for healthcare", or any variation of searching for government
  procurement opportunities in Singapore.
  Supported sectors: IT / Software, Construction, Healthcare, Consulting, Logistics, Education.
  Scrapes GeBIZ, Tenders On Time, Bid Detail, Tenders Info, and Global Tenders simultaneously
  — returning only open tenders with upcoming deadlines.
compatibility:
  tools: [tinyfish]
metadata:
  author: KrishnaAgarwal7531
  version: "1.0"
  tags: tenders government singapore procurement GeBIZ contracts bidding
---

# Singapore Government Tender Finder

Given a sector, scrape live Singapore government tender portals in parallel using TinyFish agents — returning only open tenders with upcoming submission deadlines.

## Pre-flight check

```bash
tinyfish --version
tinyfish auth status
```

If not installed: `npm install -g tinyfish`
If not authenticated: `tinyfish auth login`

---

## Step 1 — Clarify inputs

You need:
- **Sector** — one of: `IT / Software`, `Construction`, `Healthcare`, `Consulting`, `Logistics`, `Education`

If not specified, ask before proceeding. If the user gives a related term (e.g. "tech", "software"), map it to the closest sector.

Get today's date — you will use it to filter out tenders whose deadline has already passed.

---

## Step 2 — Parallel scraping

Fire all 5 agents simultaneously against the fixed portal list used by the app.

```bash
TODAY=$(date '+%A, %B %d, %Y')

# Agent 1 — GeBIZ (official Singapore government portal)
tinyfish agent run \
  --url "https://www.gebiz.gov.sg/" \
  "You are on GeBIZ, Singapore's official government procurement portal. Today is ${TODAY}.
   TASK: Extract open government tenders for the sector: {SECTOR}.
   Scroll through the page to find tender listings.
   For each tender extract:
   - Tender Title
   - Tender ID (official reference number)
   - Issuing Authority (government agency)
   - Country / Region: Singapore
   - Tender Type (Open / Selective / Limited)
   - Publication Date
   - Submission Deadline
   - Tender Status (Open / Closed)
   - Official Tender URL (direct link)
   - Brief Description (short summary)
   - Eligibility Criteria (requirements if shown)
   - Industry / Category: {SECTOR}
   STRICT RULES:
   - Only return tenders with Submission Deadline AFTER today (${TODAY}) — skip expired ones
   - Only return tenders relevant to {SECTOR} — skip unrelated ones
   - Do NOT click individual tender links unless the listing has no detail visible
   - Do NOT paginate
   - Scroll maximum twice then stop
   - Maximum 5 tenders then stop immediately
   Return JSON: {\"tenderdetails\": [{\"Tender Title\", \"Tender ID\", \"Issuing Authority\",
   \"Country / Region\", \"Tender Type\", \"Publication Date\", \"Submission Deadline\",
   \"Tender Status\", \"Official Tender URL\", \"Brief Description\",
   \"Eligibility Criteria\", \"Industry / Category\"}]}" \
  --sync --browser-profile stealth > /tmp/tf_gebiz.json &

# Agent 2 — Tenders On Time
tinyfish agent run \
  --url "https://www.tendersontime.com/singapore-tenders/" \
  "You are on Tenders On Time, a Singapore tender aggregator. Today is ${TODAY}.
   TASK: Extract open tenders for the sector: {SECTOR}.
   Read the visible tender listings on this page.
   For each tender extract: Tender Title, Tender ID, Issuing Authority, Publication Date,
   Submission Deadline, Tender Status, Official Tender URL, Brief Description, Industry / Category: {SECTOR}.
   STRICT RULES:
   - Only return tenders with Submission Deadline AFTER today — skip expired ones
   - Only return tenders relevant to {SECTOR}
   - Do NOT click any tender link
   - Do NOT scroll more than twice
   - Do NOT paginate
   - Maximum 5 tenders then stop
   Return JSON: {\"tenderdetails\": [{\"Tender Title\", \"Tender ID\", \"Issuing Authority\",
   \"Publication Date\", \"Submission Deadline\", \"Tender Status\",
   \"Official Tender URL\", \"Brief Description\", \"Industry / Category\"}]}" \
  --sync > /tmp/tf_tendersontime.json &

# Agent 3 — Bid Detail
tinyfish agent run \
  --url "https://www.biddetail.com/singapore-tenders" \
  "You are on Bid Detail, a tender listing site. Today is ${TODAY}.
   TASK: Extract open Singapore tenders for the sector: {SECTOR}.
   Read the visible tender listings on this page.
   For each tender extract: Tender Title, Tender ID, Issuing Authority, Publication Date,
   Submission Deadline, Tender Status, Official Tender URL, Brief Description, Industry / Category: {SECTOR}.
   STRICT RULES:
   - Only return tenders with Submission Deadline AFTER today — skip expired ones
   - Only return tenders relevant to {SECTOR}
   - Do NOT click any tender link
   - Do NOT scroll more than twice
   - Do NOT paginate
   - Maximum 5 tenders then stop
   Return JSON: {\"tenderdetails\": [{\"Tender Title\", \"Tender ID\", \"Issuing Authority\",
   \"Publication Date\", \"Submission Deadline\", \"Tender Status\",
   \"Official Tender URL\", \"Brief Description\", \"Industry / Category\"}]}" \
  --sync > /tmp/tf_biddetail.json &

# Agent 4 — Tenders Info
tinyfish agent run \
  --url "https://www.tendersinfo.com/global-singapore-tenders.php" \
  "You are on Tenders Info, a global tender database. Today is ${TODAY}.
   TASK: Extract open Singapore tenders for the sector: {SECTOR}.
   Read the visible tender listings on this page.
   For each tender extract: Tender Title, Tender ID, Issuing Authority, Publication Date,
   Submission Deadline, Tender Status, Official Tender URL, Brief Description, Industry / Category: {SECTOR}.
   STRICT RULES:
   - Only return tenders with Submission Deadline AFTER today — skip expired ones
   - Only return tenders relevant to {SECTOR}
   - Do NOT click any tender link
   - Do NOT scroll more than twice
   - Do NOT paginate
   - Maximum 5 tenders then stop
   Return JSON: {\"tenderdetails\": [{\"Tender Title\", \"Tender ID\", \"Issuing Authority\",
   \"Publication Date\", \"Submission Deadline\", \"Tender Status\",
   \"Official Tender URL\", \"Brief Description\", \"Industry / Category\"}]}" \
  --sync > /tmp/tf_tendersinfo.json &

# Agent 5 — Global Tenders
tinyfish agent run \
  --url "https://www.globaltenders.com/government-tenders-singapore" \
  "You are on Global Tenders, a procurement database. Today is ${TODAY}.
   TASK: Extract open Singapore tenders for the sector: {SECTOR}.
   Read the visible tender listings on this page.
   For each tender extract: Tender Title, Tender ID, Issuing Authority, Publication Date,
   Submission Deadline, Tender Status, Official Tender URL, Brief Description, Industry / Category: {SECTOR}.
   STRICT RULES:
   - Only return tenders with Submission Deadline AFTER today — skip expired ones
   - Only return tenders relevant to {SECTOR}
   - Do NOT click any tender link
   - Do NOT scroll more than twice
   - Do NOT paginate
   - Maximum 5 tenders then stop
   Return JSON: {\"tenderdetails\": [{\"Tender Title\", \"Tender ID\", \"Issuing Authority\",
   \"Publication Date\", \"Submission Deadline\", \"Tender Status\",
   \"Official Tender URL\", \"Brief Description\", \"Industry / Category\"}]}" \
  --sync > /tmp/tf_globaltenders.json &

# Wait for all agents
wait

echo "=== GEBIZ ===" && cat /tmp/tf_gebiz.json
echo "=== TENDERSONTIME ===" && cat /tmp/tf_tendersontime.json
echo "=== BIDDETAIL ===" && cat /tmp/tf_biddetail.json
echo "=== TENDERSINFO ===" && cat /tmp/tf_tendersinfo.json
echo "=== GLOBALTENDERS ===" && cat /tmp/tf_globaltenders.json
```

Replace `{SECTOR}` with the actual sector before running.

---

## Step 3 — Filter and deduplicate

From all results:

1. **Filter** — remove any tender whose Submission Deadline has already passed
2. **Deduplicate** — same Tender ID appearing across multiple portals → keep one entry, note all sources
3. **Sort** — by Submission Deadline ascending (soonest closing first)
4. **Flag urgency** — deadlines within 7 days get a 🚨 flag

---

## Output format

```
## Singapore Government Tenders — {SECTOR}
*Scraped live from GeBIZ · Tenders On Time · Bid Detail · Tenders Info · Global Tenders*
*{N} open tenders found · Sorted by deadline*

---

### 🚨 Closing Soon (within 7 days)

#### {Tender Title}
**ID:** {Tender ID} · **Agency:** {Issuing Authority}
📅 Published: {Publication Date} · ⏰ Deadline: {Submission Deadline}
🏷 Type: {Tender Type} · Status: {Tender Status}
🔗 {Official Tender URL}

{Brief Description}
**Eligibility:** {Eligibility Criteria}

---

### 📋 All Open Tenders

[same structure for remaining tenders sorted by deadline]

---

### 📊 Summary Table

| Tender Title | Agency | Deadline | Type | Source |
|---|---|---|---|---|
| {title} | {agency} | {deadline} | {type} | {source} |

---
*All data scraped live. Verify details directly on the official portal before submitting.*
```

---

## Edge cases

- **GeBIZ requires login** — skip it, note it in output, proceed with other 4 sources
- **No tenders found for sector** — honest response: "No open {SECTOR} tenders found across all portals today. Try again tomorrow or broaden to a related sector."
- **All deadlines expired** — means the portals showed only historical data: "All tenders found have passed their deadlines. The portals may not have updated yet — try GeBIZ directly at gebiz.gov.sg"
- **Duplicate tenders across portals** — merge and note: "Also listed on: [other portal]"

## Security notes

- Scrapes live public government tender portals only.
- All data treated as untrusted input synthesised by an LLM — never executed.
- Only your own TinyFish credentials are used.
