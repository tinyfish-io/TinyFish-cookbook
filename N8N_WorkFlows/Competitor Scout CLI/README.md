````markdown
# Competitor Scout (n8n Workflow) — Beginner Setup & Run Guide

This repository/workflow lets you research competitor feature decisions (e.g., “What sign-in methods do my competitors use?”) using:

- **n8n** for orchestration
- **OpenAI** for planning + report generation
- **Tinyfish Web Agent** for web browsing/evidence collection
- Optional exports:
  - **Google Sheets** (log results)
  - **Google Drive** (upload a Markdown report)

This guide assumes you have **zero n8n experience**.

---

## 1) What you will get

When you run the workflow, you’ll input:

- A list of competitors (one per line, `Name — URL`)
- A research question

The workflow will output:

- A **Markdown comparison report** (from OpenAI)
- Raw Tinyfish run results (evidence, sources)
- Optional exports:
  - A row appended to Google Sheets
  - A `.md` file uploaded to Google Drive

---

## 2) Prerequisites

### Accounts / keys you need
1) **OpenAI API key**
2) **Tinyfish API key**
3) **Google account** (only if exporting to Google Sheets/Drive)

### Software
- n8n (choose one)
  - **n8n Desktop / local** (easiest to start)
  - **Self-hosted** (Docker)
  - **n8n Cloud** (paid)

> If you’re not sure: start with **local n8n**. This guide uses examples for local n8n at `http://localhost:5678`.

---

## 3) Install & open n8n (beginner-friendly)

### Option A — n8n Desktop (easy)
1) Install n8n Desktop (from n8n docs)
2) Open it
3) You should see n8n running

### Option B — Docker (common)
Run:

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
````

Then open:

* `http://localhost:5678`

---

## 4) Import the workflow JSON into n8n

1. In n8n, click **Workflows**
2. Click **Import from file**
3. Select the workflow JSON provided with this project
4. Click **Save**

You should now see a workflow canvas with nodes like:

* Form Trigger
* Parse Competitors
* OpenAI planning/report nodes
* Tinyfish nodes
* Export nodes (Sheets/Drive)

---

## 5) Install the Tinyfish community node (if required)

If your workflow uses a community Tinyfish node (recommended):

1. In n8n, go to **Settings → Community Nodes**
2. Click **Install**
3. Enter the Tinyfish node package name (example):

   * `n8n-nodes-tinyfish`
4. Install
5. Restart n8n if prompted

> After installation, you should be able to add nodes named like **TinyFish Web Agent**.

---

## 6) Set up credentials (the most important part)

n8n nodes connect to external services using **Credentials**.

### 6.1 OpenAI credentials

1. Go to **Credentials**
2. Click **New**
3. Search for **OpenAI**
4. Paste your OpenAI API key
5. Save
6. Open the workflow and assign this credential to every OpenAI node

---

### 6.2 Tinyfish credentials

If using the Tinyfish node:

1. **Credentials → New**
2. Search for **TinyFish Web Agent** (or similar)
3. Paste your Tinyfish API key
4. Save
5. Assign to:

   * `TinyFish Web Agent (runAsync)`
   * `TinyFish Get Run / Status` (if present)

---

### 6.3 Google Sheets + Google Drive credentials (optional exports)

If you want exports, you must set up Google OAuth.

#### You may see an error:

**“Access blocked: … app is currently being tested … only developer-approved testers”**

Fix: Add your email as a Test User (see below).

---

## 7) Google OAuth setup (for beginners)

This is needed for:

* Google Sheets export (append rows)
* Google Drive upload (upload markdown report)

### If you use n8n Cloud

Google auth is usually one-click:

1. Open a Google Sheets node
2. Credentials → Create new → **Google Sheets OAuth2**
3. Click **Connect**
4. Log in to Google and approve

Done.

---

### If you use local/self-hosted n8n (most common)

You must create a Google OAuth app.

#### Step A — Create OAuth credentials in Google Cloud

1. Go to Google Cloud Console: `https://console.cloud.google.com/`
2. Create/select a project
3. Go to **APIs & Services → Library**
4. Enable:

   * **Google Sheets API**
   * **Google Drive API** (if uploading markdown to Drive)

#### Step B — Configure OAuth consent screen

1. **APIs & Services → OAuth consent screen**
2. Choose **External** (typical)
3. Fill required fields (App name, email)
4. Set Publishing status to **Testing** (ok)
5. Add yourself as a **Test user**:

   * Add the Google email you’ll sign in with

✅ This prevents the “Access blocked” error.

#### Step C — Create OAuth client ID

1. **APIs & Services → Credentials**
2. Click **Create Credentials → OAuth Client ID**
3. Type: **Web application**
4. Add Authorized redirect URI:

For local n8n:

* `http://localhost:5678/rest/oauth2-credential/callback`

For hosted n8n:

* `https://YOUR_DOMAIN/rest/oauth2-credential/callback`

5. Save, then copy:

* **Client ID**
* **Client Secret**

---

### Step D — Add Google credentials in n8n

1. n8n → **Credentials → New**
2. Create:

   * **Google Sheets OAuth2**
   * **Google Drive OAuth2**
3. Paste the Client ID/Secret from Google Cloud
4. Click **Connect**
5. Approve permissions in Google

✅ Done.

---

## 8) Configure exports (Sheets + Drive)

### 8.1 Google Sheets

Create a Google Sheet with two tabs:

#### Tab 1: `Reports` (headers)

* `generatedAt`
* `question`
* `competitorNames`
* `competitorCount`
* `runCount`
* `allDone`
* `reportMarkdown`

#### Tab 2: `Runs` (headers)

* `generatedAt`
* `question`
* `run_id`
* `status`
* `goal`
* `started_at`
* `finished_at`
* `sources_json`
* `result_json`

In n8n:

* Open the **Append Reports** node and select your spreadsheet + tab
* Open the **Append Runs** node and select your spreadsheet + tab
* Ensure both nodes use the correct Google Sheets credential

---

### 8.2 Google Drive upload (Markdown report)

In the workflow, the Drive upload chain should look like:

* Build Clean MD (creates `mdContent`)
* Convert MD to binary (with filename + MIME)
* Upload to Google Drive

Open **Upload MD to Drive** node:

* Select Drive credential
* Choose destination folder (optional)

---

## 9) Running the workflow

### Step 1 — Activate workflow (optional)

If you want it always available, click **Active** toggle.

### Step 2 — Run in test mode (recommended first run)

1. Open the workflow
2. Click **Execute workflow**
3. A form page opens

### Step 3 — Fill the form

Competitors (one per line):

```
Notion — https://www.notion.com
ServiceNow — https://www.servicenow.com
```

Question:

```
What sign-in methods do my competitors use?
```

Submit.

### Step 4 — Monitor progress

In n8n execution view, you’ll see:

* OpenAI planning
* Tinyfish runs
* Polling loop until completion
* OpenAI report generation
* Exports (Sheets + Drive)

---

## 10) Troubleshooting (common)

### “Access blocked: n8n has not completed verification”

Your Google OAuth consent screen is in **Testing** and your account is not in **Test users**.

Fix:

* Google Cloud Console → OAuth consent screen → **Test users** → add your email

### “runId becomes undefined during polling”

This happens if the workflow loops an aggregated item back into a node expecting per-run items.

Fix:

* Ensure your loop includes a “rehydrate runIds” step before re-polling.

### Google Sheets rows missing / misaligned

* Ensure tab names match exactly (`Reports`, `Runs`)
* Ensure headers exist
* Use Auto-map input data, or map manually

### Drive upload becomes “binary file”

Fix:

* Ensure filename ends with `.md`
* Ensure MIME is `text/markdown` or `text/plain`
* Upload using `$binary.data.fileName`

---

## 11) Safety / cost controls

* Keep competitor count small (e.g., ≤10)
* Tinyfish browsing + OpenAI calls cost money; test with 1–2 competitors first
* Avoid sending extremely large raw results to OpenAI if you hit token limits

---

## 12) Customization ideas

* Add more export targets: Slack, Notion, email
* Add a “depth” or “strictness” setting to planning prompts
* Add schema extraction (e.g., normalize sign-in methods into a boolean table)

---

## 13) Quick “Checklist” before first run

* [ ] Workflow imported
* [ ] OpenAI credential added + assigned
* [ ] Tinyfish credential added + assigned
* [ ] (Optional) Google Sheets credential connected
* [ ] (Optional) Google Drive credential connected
* [ ] Sheets tabs created (`Reports`, `Runs`)
* [ ] Workflow runs successfully with 1 competitor test

---

```
```
