# SiliconSignal (n8n Workflow) — Setup & Run Guide

This workflow tracks semiconductor supply chain risk by scanning distributor pages for part lifecycle status, lead times, stock levels, and pricing — then generates a structured risk assessment report.

- **n8n** for orchestration
- **OpenAI** for scan planning + risk assessment
- **Tinyfish Web Agent** for live distributor page scraping (DigiKey, Mouser, etc.)
- Optional exports:
  - **Google Sheets** (log scan results)
  - **Google Drive** (upload a Markdown risk report)

---

## 1) What You Get

When you run the workflow, you input:

- A list of semiconductor part numbers (one per line, `Part Number — Manufacturer`)
- A lead time alert threshold (in weeks)
- Optional notes/context

The workflow outputs:

- A **per-part risk assessment** with lifecycle status, lead time, stock, pricing, and a 0–100 risk score
- An **executive summary** of overall supply chain posture
- A **prioritized action list** for high/critical risk parts
- Optional exports:
  - A row appended to Google Sheets
  - A `.md` report uploaded to Google Drive
  - A raw `.json` scan file

---

## 2) Prerequisites

### Accounts / Keys
1. **OpenAI API key**
2. **Tinyfish API key**
3. **Google account** (only if exporting to Sheets/Drive)

### Software
- n8n (choose one):
  - **n8n Desktop / local**
  - **Self-hosted** (Docker)
  - **n8n Cloud** (paid)

> If unsure, start with **local n8n** at `http://localhost:5678`.

---

## 3) Install & Open n8n

### Option A — n8n Desktop
1. Install n8n Desktop from the official n8n docs
2. Open it — n8n should be running

### Option B — Docker
Run:

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Then open `http://localhost:5678`

---

## 4) Import the Workflow JSON

1. In n8n, click **Workflows**
2. Click **Import from file**
3. Select `silicon_signal.json` from this project
4. Click **Save**

You should see a workflow canvas with nodes like:

- SiliconSignal Scan Form (Form Trigger)
- Parse Part Numbers
- Plan Scan Goals (OpenAI)
- TinyFish Web Agent
- Evaluate Runs / Polling Loop
- Assess Logistics Risk (OpenAI)
- Export nodes (Sheets / Drive / JSON)

---

## 5) Install the Tinyfish Community Node

1. In n8n, go to **Settings → Community Nodes**
2. Click **Install**
3. Enter the package name: `n8n-nodes-tinyfish`
4. Install and restart n8n if prompted

After installation, TinyFish nodes should resolve correctly in the workflow.

---

## 6) Set Up Credentials

### 6.1 OpenAI Credentials

1. Go to **Credentials → New**
2. Search for **OpenAI**
3. Paste your OpenAI API key
4. Save
5. Open the workflow and assign this credential to:
   - **Plan Scan Goals** node
   - **Assess Logistics Risk** node

---

### 6.2 Tinyfish Credentials

1. **Credentials → New**
2. Search for **TinyFish Web Agent** (or similar)
3. Paste your Tinyfish API key
4. Save
5. Assign to:
   - **TinyFish Web Agent** node
   - **Get TinyFish Status** node

---

### 6.3 Google Sheets + Google Drive Credentials (Optional)

Required only if you want to export results to Sheets/Drive.

> You may see: **"Access blocked: … app is currently being tested …"** — see the Google OAuth section below.

---

## 7) Google OAuth Setup

Needed for:
- Google Sheets export (append scan rows)
- Google Drive upload (Markdown risk report)

### n8n Cloud

1. Open a Google Sheets node
2. Credentials → Create new → **Google Sheets OAuth2**
3. Click **Connect** and approve

Done.

---

### Local / Self-Hosted n8n

You need to create a Google OAuth app.

#### Step A — Create OAuth Credentials in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create or select a project
3. Go to **APIs & Services → Library**
4. Enable:
   - **Google Sheets API**
   - **Google Drive API**

#### Step B — Configure OAuth Consent Screen

1. **APIs & Services → OAuth consent screen**
2. Choose **External**
3. Fill required fields (App name, email)
4. Set publishing status to **Testing**
5. Add yourself as a **Test user** (use the Google email you'll sign in with)

This prevents the "Access blocked" error.

#### Step C — Create OAuth Client ID

1. **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth Client ID**
3. Type: **Web application**
4. Add Authorized redirect URI:
   - Local: `http://localhost:5678/rest/oauth2-credential/callback`
   - Hosted: `https://YOUR_DOMAIN/rest/oauth2-credential/callback`
5. Copy the **Client ID** and **Client Secret**

#### Step D — Add Google Credentials in n8n

1. **Credentials → New**
2. Create:
   - **Google Sheets OAuth2**
   - **Google Drive OAuth2**
3. Paste Client ID / Secret from Google Cloud
4. Click **Connect** and approve permissions

---

## 8) Configure Exports

### 8.1 Google Sheets

Create a Google Sheet with a single tab and these column headers:

| scanned_at | parts_scanned | executive_summary | high_risk_parts | action_items | full_report_json | run_ids |
|---|---|---|---|---|---|---|

In n8n:
- Open the **Append to Google Sheets** node
- Replace `YOUR_GOOGLE_SHEET_ID_HERE` with your actual spreadsheet ID
- Select the correct tab
- Assign your Google Sheets credential

### 8.2 Google Drive Upload

In the **Upload Report to Google Drive** node:
- Assign your Google Drive credential
- Optionally choose a destination folder

The workflow automatically creates a `.md` file with a timestamped filename and uploads it.

---

## 9) Running the Workflow

### Step 1 — Activate (Optional)

Toggle **Active** if you want the form always available.

### Step 2 — Execute in Test Mode (Recommended First)

1. Open the workflow
2. Click **Execute workflow**
3. The scan form opens

### Step 3 — Fill the Form

**Part Numbers** (one per line):

```
STM32F407VGT6 — STMicroelectronics
ATmega328P — Microchip
NE555 — Texas Instruments
```

**Alert Threshold:** `12` (weeks)

**Notes:** *(optional context about volumes, alternates, etc.)*

Submit.

### Step 4 — Monitor Progress

In the n8n execution view you'll see:

1. OpenAI plans scan goals per part
2. TinyFish agents browse distributor pages
3. Polling loop until all scans complete
4. OpenAI assesses risk from raw results
5. Reports exported (Sheets + Drive + JSON)

---

## 10) Troubleshooting

### "Access blocked: n8n has not completed verification"

Your Google OAuth consent screen is in **Testing** and your account is not listed under **Test users**.

**Fix:** Google Cloud Console → OAuth consent screen → Test users → add your email.

### runId becomes undefined during polling

The workflow loops an aggregated item back into a node expecting per-run items.

**Fix:** The workflow includes a **Rehydrate RunIds for Next Poll** node that handles this. If you've modified the workflow, ensure this node is still connected between the "not done" branch and the Wait node.

### Google Sheets rows missing or misaligned

- Ensure column headers match exactly
- Use Auto-map input data in the Sheets node
- Verify the correct tab is selected

### Drive upload shows as binary file

- Ensure filename ends with `.md`
- Ensure MIME type is `text/markdown`
- The **Convert to Binary** node handles this automatically — don't bypass it

---

## 11) Cost Controls

- Start with 1–2 parts to validate the setup before scanning larger lists
- Each part triggers a TinyFish browsing session + OpenAI calls — keep part count reasonable (10 or fewer per run)
- Large raw results can hit OpenAI token limits; the risk assessment prompt is tuned for typical distributor page output

---

## 12) Customization Ideas

- Add more export targets: Slack alerts for critical-risk parts, email digests, Notion database
- Tune the risk scoring thresholds in the **Assess Logistics Risk** system prompt
- Add alternate distributor sources (Arrow, Newark, LCSC) to scan goals
- Build a dashboard from the Google Sheets data to track part risk over time
- Add schema extraction to normalize results into a structured comparison table

---

## 13) Pre-Run Checklist

- [ ] Workflow imported into n8n
- [ ] Tinyfish community node installed
- [ ] OpenAI credential added + assigned to both OpenAI nodes
- [ ] Tinyfish credential added + assigned to TinyFish + Status nodes
- [ ] *(Optional)* Google Sheets credential connected + spreadsheet ID set
- [ ] *(Optional)* Google Drive credential connected
- [ ] Workflow runs successfully with a single test part
