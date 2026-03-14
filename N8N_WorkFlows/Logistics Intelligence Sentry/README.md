# Logistics Intelligence Sentry (n8n Workflow) 

This repository/workflow lets you monitor **port congestion, carrier advisories, and operational risks** in real-time across your supply chain using:

- **n8n** for orchestration
- **OpenAI (GPT-4o)** for intelligent scout goal planning + risk synthesis
- **TinyFish Web Agent** for live browsing port and carrier websites
- **Optional exports:**
  - Google Sheets (log risk reports)
  - Google Drive (upload Markdown reports)
  - JSON file output

This guide assumes you have zero n8n experience.

---

## 1) What you will get

When you run the workflow, you'll input via a web form:

- **Origin port(s)** to monitor (e.g., Port of Los Angeles, Port of Rotterdam)
- **Carrier(s)** to monitor (e.g., Maersk, Evergreen)
- **Freight mode** (Sea Freight, Air Freight, Rail Freight, or Multi-modal)
- **Risk intelligence question** (e.g., "Are there any port congestion alerts or carrier service disruptions affecting West Coast shipments this week?")

The workflow will output:

- A **structured risk intelligence report** covering:
  - Executive Risk Summary (with overall risk level: LOW / MEDIUM / HIGH / CRITICAL)
  - Per-port intelligence (congestion alerts, vessel wait times, closures)
  - Per-carrier intelligence (service advisories, route suspensions, surcharges)
  - Risk comparison table
  - Recommended actions
- **Optional exports:**
  - Report row appended to Google Sheets
  - Markdown report uploaded to Google Drive
  - JSON intelligence payload saved locally

---

## 2) Prerequisites

### Accounts / keys you need

| Need | Purpose |
|------|---------|
| OpenAI API key | GPT-4o Plan Scout Goals and Synthesize Risk Report nodes |
| TinyFish API key | TinyFish Web Agent node (browses port/carrier sites) |
| Google account (optional) | Only if exporting to Google Sheets / Google Drive |

### Software

**n8n** (choose one):
- **n8n Desktop / local** (easiest to start)
- **Self-hosted** (Docker)
- **n8n Cloud** (paid)

> If you're not sure: start with local n8n. This guide uses examples for local n8n at `http://localhost:5678`.

### Required n8n community node

This workflow uses the **TinyFish Web Agent** community node (`n8n-nodes-tinyfish`). You must install it before importing the workflow:

1. In n8n, go to **Settings → Community Nodes**
2. Click **Install a community node**
3. Enter `n8n-nodes-tinyfish`
4. Click **Install**

---

## 3) Install & open n8n (beginner-friendly)

### Option A — n8n Desktop (easy)

1. [Install n8n Desktop](https://docs.n8n.io/hosting/desktop/)
2. Open it
3. You should see n8n running

### Option B — Docker (common)

Run:

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Then open: `http://localhost:5678`

---

## 4) Import the workflow JSON into n8n

1. In n8n, click **Workflows**
2. Click **Import from file**
3. Select `logistics-intelligence-sentry.json`
4. Click **Save**

You should now see a workflow canvas with nodes like:

- **Logistics Sentry Form** (web form trigger)
- **Parse Logistics Targets** (splits ports + carriers)
- **Build Target List** (consolidates targets for GPT)
- **Plan Scout Goals** (GPT-4o plans browsing goals per target)
- **Parse Scout Goals** (extracts structured goals)
- **Match Targets with Goals** (merges targets with goals)
- **Prepare TinyFish Goal** (builds agent instructions)
- **TinyFish Web Agent** (dispatches live browsing agents)
- **Get TinyFish Status** → **Evaluate Runs** → **Check If Complete** (polling loop)
- **Wait 3 Seconds** → poll again (if not done)
- **Normalize Logistics Runs** (structures raw results)
- **Build Intelligence Payload** (assembles data for synthesis)
- **Synthesize Risk Report** (GPT-4o deep analysis)
- **Extract Risk Report** (parses GPT output)
- **Merge Intelligence** → **Build Final Intelligence Output**
- **Prepare Report Row** → **Save as JSON** / **Append to Google Sheets** / **Create Markdown Report** → **Upload Report to Drive**

---

## 5) Set up credentials 

n8n nodes connect to external services using **Credentials**.

### 5.1 OpenAI credentials (required)

Used by **Plan Scout Goals** and **Synthesize Risk Report**.

1. Go to **Credentials**
2. Click **New**
3. Search for **OpenAI**
4. Paste your OpenAI API key
5. **Save**
6. Open the workflow and assign this credential to both GPT-4o nodes:
   - **Plan Scout Goals**
   - **Synthesize Risk Report**

### 5.2 TinyFish credentials 

Used by the **TinyFish Web Agent** node.

1. **Credentials → New → TinyFish API**
2. Paste your TinyFish API key
3. **Save**
4. Assign this credential to:
   - **TinyFish Web Agent**
   - **Get TinyFish Status**

### 5.3 Google Sheets credentials (optional)

Only if you want risk report logging to Google Sheets.

**If you use n8n Cloud**, Google auth is usually one-click:

1. Open the **Append to Google Sheets** node
2. Credentials → Create new → **Google Sheets OAuth2**
3. Click **Connect**
4. Log in to Google and approve
5. Done.

**If you use local/self-hosted n8n**, you must create a Google OAuth app — see **Section 6** below.

### 5.4 Google Drive credentials (optional)

Only if you want Markdown reports uploaded to Google Drive.

Same process as Google Sheets — create a **Google Drive OAuth2** credential and assign it to the **Upload Report to Drive** node.

---

## 6) Google OAuth setup (for local/self-hosted n8n)

This is needed for:

- Google Sheets export (log risk reports)
- Google Drive export (upload Markdown reports)

### Step A — Create OAuth credentials in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Go to **APIs & Services → Library**
4. Enable **Google Sheets API** and **Google Drive API**

### Step B — Configure OAuth consent screen

1. **APIs & Services → OAuth consent screen**
2. Choose **External** (typical)
3. Fill required fields (App name, email)
4. Set Publishing status to **Testing** (ok)
5. **Add yourself as a Test user:**
   - Add the Google email you'll sign in with
   - This prevents the "Access blocked" error

### Step C — Create OAuth client ID

1. **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth Client ID**
3. Type: **Web application**
4. Add **Authorized redirect URI:**

For local n8n:
```
http://localhost:5678/rest/oauth2-credential/callback
```

For hosted n8n:
```
https://YOUR_DOMAIN/rest/oauth2-credential/callback
```

5. Save, then copy your **Client ID** and **Client Secret**

### Step D — Add Google credentials in n8n

1. **n8n → Credentials → New**
2. Create **Google Sheets OAuth2** — paste Client ID / Secret, click **Connect**, approve
3. Create **Google Drive OAuth2** — paste Client ID / Secret, click **Connect**, approve
4. Assign to the appropriate nodes:
   - **Append to Google Sheets** → Google Sheets credential
   - **Upload Report to Drive** → Google Drive credential

---

## 7) Configure Google Sheets (optional)

Create a Google Sheet with one tab:

### Tab: Risk Reports (headers)

| risk_question | report_md | overall_risk | freight_mode | target_names | created_at | run_ids |
|---------------|-----------|--------------|--------------|--------------|------------|---------|

In n8n:

1. Open the **Append to Google Sheets** node
2. Set **Document** to your spreadsheet ID
3. Set **Sheet** to your tab name
4. Ensure the node uses the correct Google Sheets credential

---

## 8) Running the workflow

### Step 1 — Activate the workflow

Click the **Active** toggle to make the form always available.

### Step 2 — Open the form

The workflow uses a **Form Trigger**, so it has a built-in web form. Find the form URL from the **Logistics Sentry Form** node — it will look like:

```
http://localhost:5678/form/logistics-sentry-webhook-001
```

Open this URL in your browser to see the form.

### Step 3 — Fill out the form

1. **Origin Port(s):** Enter one port per line, with name and URL separated by ` — `
   ```
   Port of Los Angeles — https://www.portoflosangeles.org
   Port of Long Beach — https://polb.com
   ```

2. **Carrier(s):** Enter one carrier per line, same format
   ```
   Maersk — https://www.maersk.com
   Evergreen — https://www.evergreen-line.com
   ```

3. **Freight Mode:** Select from dropdown (Sea Freight, Air Freight, Rail Freight, Multi-modal)

4. **Risk Intelligence Question:** Your specific question, e.g.:
   > Are there any port congestion alerts, vessel backlogs, or carrier service suspensions affecting my shipments this week?

5. Click **Submit**

### Step 4 — Monitor progress

In n8n execution view, you'll see:

1. Form receives input
2. **Parse Logistics Targets** splits ports and carriers
3. **Build Target List** consolidates for GPT
4. **Plan Scout Goals** (GPT-4o creates specific browsing goals per target)
5. **Parse Scout Goals** extracts structured goals
6. **Match Targets with Goals** pairs each target with its goal
7. **Prepare TinyFish Goal** builds agent instructions
8. **TinyFish Web Agent** dispatches parallel browsing agents to each port/carrier site
9. **Polling loop** checks agent status every 3 seconds until all complete
10. **Normalize Logistics Runs** structures raw results with risk level detection
11. **Build Intelligence Payload** assembles all data
12. **Synthesize Risk Report** (GPT-4o produces a comprehensive risk analysis)
13. **Extract Risk Report** parses the report text
14. **Build Final Intelligence Output** combines everything
15. Outputs: JSON file + Google Sheets row + Markdown report uploaded to Drive

---

## 9) Output — Intelligence Report

The workflow produces a Markdown-formatted risk intelligence report with:

- **Executive Risk Summary** — 2-3 sentence overview with overall risk level (LOW / MEDIUM / HIGH / CRITICAL)
- **Port Intelligence** — per-port findings (congestion, vessel wait times, berth availability, closures, weather disruptions)
- **Carrier Intelligence** — per-carrier findings (service advisories, route suspensions, surcharges, booking alerts)
- **Risk Comparison Table** — side-by-side risk assessment
- **Recommended Actions** — actionable next steps
- **Source URLs** — evidence citations from scouted websites

### Output destinations

| Destination | Format | Node |
|-------------|--------|------|
| Local file | JSON (full intelligence payload) | Save as JSON |
| Google Sheets | Row with risk_question, report_md, overall_risk, freight_mode, target_names, created_at, run_ids | Append to Google Sheets |
| Google Drive | Markdown report file | Upload Report to Drive |

---

## 10) Troubleshooting 

### TinyFish agent errors

- Ensure the **TinyFish API** credential is assigned to both **TinyFish Web Agent** and **Get TinyFish Status** nodes
- Check that your TinyFish API key is valid and has available credits

### "Access blocked: ... app is currently being tested"

Your Google OAuth consent screen is in Testing and your account is not in Test users.

**Fix:** Google Cloud Console → OAuth consent screen → Test users → add your email.

### OpenAI errors

- Check OpenAI credential is assigned to both GPT-4o nodes (**Plan Scout Goals** and **Synthesize Risk Report**)
- Verify your OpenAI API key has GPT-4o access

### Form not loading

- Ensure the workflow is **activated** (toggle is on)
- Check the form URL matches the webhook ID in the Logistics Sentry Form node

### Empty or partial results

- Check that port/carrier URLs are valid and accessible
- TinyFish agents have a timeout — very slow sites may return partial data
- Review the **Normalize Logistics Runs** node output for error details

### Google Sheets rows missing / misaligned

- Ensure tab name matches exactly
- Ensure headers exist in the sheet matching: `risk_question`, `report_md`, `overall_risk`, `freight_mode`, `target_names`, `created_at`, `run_ids`
- Verify spreadsheet ID is set in the Sheets node

### Polling loop runs forever

- The **Evaluate Runs** node checks for terminal statuses (COMPLETED, FAILED, CANCELLED)
- If TinyFish agents stall, you may need to manually stop the execution
- Check TinyFish dashboard for stuck runs

---

## 11) Safety / cost controls

- **TinyFish browsing + OpenAI calls cost money** — test with 1 port + 1 carrier first
- Each run dispatches **one TinyFish agent per target** (port or carrier) — keep this in mind for API rate limits
- GPT-4o synthesis receives all scouting results; large target lists increase token usage
- The polling loop checks every **3 seconds** — runs typically complete within 60-120 seconds per agent
- The workflow has **no built-in timeout** on the polling loop — stop manually if needed

---

## 12) Customization ideas

- **Add more ports/carriers** — just add more lines in the form input
- **Add export targets:** Slack, Notion, email notifications for HIGH/CRITICAL risks
- **Add date range filtering** by modifying the Plan Scout Goals system prompt
- **Adjust risk detection keywords** in the Normalize Logistics Runs code node
- **Add scheduled monitoring** — replace the Form Trigger with a Cron/Schedule trigger to run daily
- **Add alerting thresholds** — route CRITICAL risks to Slack/email immediately
- **Track risk trends** — compare today's report against historical Sheets data
- **Add more freight-specific sources** (e.g., FreightWaves, Marine Traffic, FlightAware for air freight)

---

## 13) Quick checklist before first run

- [ ] Workflow imported (`logistics-intelligence-sentry.json`)
- [ ] TinyFish community node installed (`n8n-nodes-tinyfish`)
- [ ] OpenAI credential added + assigned to **Plan Scout Goals** and **Synthesize Risk Report**
- [ ] TinyFish credential added + assigned to **TinyFish Web Agent** and **Get TinyFish Status**
- [ ] (Optional) Google Sheets OAuth2 credential connected + assigned to **Append to Google Sheets**
- [ ] (Optional) Google Drive OAuth2 credential connected + assigned to **Upload Report to Drive**
- [ ] (Optional) Google Sheet created with correct headers
- [ ] Workflow activated or running in test mode
- [ ] Workflow runs successfully with a simple test (1 port + 1 carrier)

---

## 14) File reference

| File | Description |
|------|-------------|
| `logistics-intelligence-sentry.json` | n8n workflow to import |
| `README.md` | This guide |
