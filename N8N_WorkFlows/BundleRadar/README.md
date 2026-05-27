# BundleRadar (n8n Workflow) — Setup & Run Guide

Paste a URL. BundleRadar uses TinyFish (a smart browser agent) to load the site, read what's on the page — scripts, DOM, source — and reconstruct its full frontend tech stack from production runtime signals.

- **n8n** for orchestration
- **OpenAI** for extraction goal planning + tech stack synthesis
- **TinyFish Web Agent** for live page scraping across 5 extraction phases
- **Optional exports:**
  - Google Sheets (log scan results per domain)
  - Google Drive (upload a Markdown tech stack report)

---

## 1) What You Get

When you run the workflow, you input:

- One or more target URLs (one per line)
- An optional scan label / project name
- Optional focus areas (e.g. analytics stack, auth provider, security posture)

The workflow outputs a **per-domain tech stack report** including:

| Output | Detail |
|---|---|
| Framework | e.g. Next.js 14, Vue 3, Nuxt, Astro — with confidence level |
| UI Library | Tailwind, MUI, Radix, shadcn/ui |
| Build Tool | Webpack, Vite, Turbopack |
| State Management | Redux, Zustand, Apollo, Relay |
| Analytics | GA4, Segment, Amplitude, PostHog, Mixpanel, Hotjar |
| Monitoring | Sentry, Datadog RUM, LogRocket, FullStory |
| Feature Flags | LaunchDarkly, Statsig, Split.io, Optimizely |
| Auth | Auth0, Clerk, Firebase Auth, Supabase |
| Payments | Stripe, PayPal |
| CDN / Hosting | Vercel, Netlify, Cloudflare, AWS CloudFront |
| CMS | Webflow, WordPress |
| Third-party Tools | Intercom, Drift, HubSpot, Zendesk |
| Security Posture | CSP, HSTS, source map exposure, leaked secrets |
| Architecture Summary | 2–3 sentence narrative of the inferred stack |
| Architecture Diagram | ASCII diagram of the tech layers |
| Competitive Insights | 3–5 actionable intelligence bullets |

Optional exports:
- A row appended to Google Sheets
- A `.md` report uploaded to Google Drive
- A raw `.json` scan file

---

## 2) Prerequisites

### Accounts / Keys

- OpenAI API key
- TinyFish API key — from [agent.tinyfish.ai](https://agent.tinyfish.ai)
- Google account (only if exporting to Sheets / Drive)

### Software

- **n8n** (choose one):
  - n8n Desktop / local
  - Self-hosted (Docker)
  - n8n Cloud (paid)

If unsure, start with local n8n at `http://localhost:5678`.

---

## 3) Install & Open n8n

### Option A — n8n Desktop

Install n8n Desktop from the [official n8n docs](https://docs.n8n.io/), then open it — n8n should be running at `http://localhost:5678`.

### Option B — Docker

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

Then open `http://localhost:5678`.

---

## 4) Import the Workflow JSON

1. In n8n, click **Workflows**
2. Click **Import from file**
3. Select `bundleradar_workflow.json` from this project
4. Click **Save**

You should see a workflow canvas with nodes including:

- `BundleRadar Scan Form` (Form Trigger)
- `Parse Target URLs`
- `Build URL List`
- `Plan Extraction Goals` (OpenAI)
- `Parse Extraction Goals`
- `Match URLs with Goals`
- `Prepare TinyFish Goal`
- `TinyFish Web Agent`
- `Get TinyFish Status`
- `Evaluate Runs` / Polling Loop
- `Normalize TinyFish Runs`
- `Explode Domain Runs`
- `Synthesize Tech Stack` (OpenAI)
- `Extract Stack Report`
- `Merge Report Data` / `Combine Report`
- `Prepare Report Row`
- Export nodes (Sheets / Drive / JSON)

---

## 5) Install the TinyFish Community Node

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

Assign this credential to:
- `Plan Extraction Goals` node
- `Synthesize Tech Stack` node

### 6.2 TinyFish Credentials

1. **Credentials → New**
2. Search for **TinyFish Web Agent** (or similar)
3. Paste your TinyFish API key
4. Save

Assign to:
- `TinyFish Web Agent` node
- `Get TinyFish Status` node

### 6.3 Google Sheets + Google Drive Credentials (Optional)

Required only if you want to export results to Sheets / Drive.

You may see: *"Access blocked: … app is currently being tested …"* — see the **Google OAuth** section below.

---

## 7) Google OAuth Setup

Needed for:
- Google Sheets export (append scan rows per domain)
- Google Drive upload (Markdown tech stack report)

### n8n Cloud

1. Open a Google Sheets node
2. **Credentials → Create new → Google Sheets OAuth2**
3. Click **Connect** and approve
4. Done.

### Local / Self-Hosted n8n

You need to create a Google OAuth app.

#### Step A — Create OAuth Credentials in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create or select a project
3. Go to **APIs & Services → Library**
4. Enable:
   - Google Sheets API
   - Google Drive API

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
4. Add **Authorized redirect URI**:
   - Local: `http://localhost:5678/rest/oauth2-credential/callback`
   - Hosted: `https://YOUR_DOMAIN/rest/oauth2-credential/callback`
5. Copy the **Client ID** and **Client Secret**

#### Step D — Add Google Credentials in n8n

1. **Credentials → New**
2. Create:
   - Google Sheets OAuth2
   - Google Drive OAuth2
3. Paste Client ID / Secret from Google Cloud
4. Click **Connect** and approve permissions

---

## 8) Configure Exports

### 8.1 Google Sheets

Create a Google Sheet with a single tab and these column headers:

| scanned_at | scan_label | domains_scanned | full_report_json | run_ids | warnings |
|---|---|---|---|---|---|

In n8n:

1. Open the **Append to Google Sheets** node
2. Replace `YOUR_GOOGLE_SHEET_ID_HERE` with your actual spreadsheet ID
3. Select the correct tab
4. Assign your Google Sheets credential

### 8.2 Google Drive Upload

In the **Upload Report to Google Drive** node:

1. Assign your Google Drive credential
2. Optionally choose a destination folder

The workflow automatically creates a `.md` file with a timestamped filename (e.g. `bundleradar-report-notion-linear-1234567890.md`) and uploads it.

---

## 9) Running the Workflow

### Step 1 — Activate (Optional)

Toggle **Active** if you want the form always available at its public URL.

### Step 2 — Execute in Test Mode (Recommended First)

1. Open the workflow
2. Click **Execute workflow**
3. The scan form opens

### Step 3 — Fill the Form

**Target URLs (one per line):**
```
https://www.notion.so
https://linear.app
https://vercel.com
```

**Scan Label:** `Q2 Competitor Audit`

**Focus Areas:** `analytics stack, auth provider, feature flags` *(optional)*

Submit.

### Step 4 — Monitor Progress

In the n8n execution view you'll see:

1. OpenAI plans 5 extraction goals per URL
2. TinyFish agents browse each URL across 5 phases:
   - Phase 1: Bundle Intelligence (scripts, globals, framework DOM)
   - Phase 2: Page-visible Resources (script/link URLs, third-party domains)
   - Phase 3: Infrastructure Signals (hosting, CDN, response headers)
   - Phase 4: Runtime Config (analytics, feature flags, chat widgets, auth)
   - Phase 5: Security Signals (CSP, HSTS, source maps, leaked secrets)
3. Polling loop runs until all TinyFish scans complete
4. OpenAI synthesizes findings into a structured tech stack report
5. Reports exported to Sheets, Drive, and JSON

---

## 10) How the 5-Phase Extraction Works

BundleRadar mirrors how a developer would manually inspect a site — but automated across every phase simultaneously.

| Phase | Focus | Feeds Into |
|---|---|---|
| 1. Bundle Intelligence | Script tags, global variables (`window.__*`, `__next*`, `__nuxt*`), framework DOM signatures, meta tags, inline scripts | Framework, build tool, UI library detection |
| 2. Page-visible Resources | Script/link `src`/`href` URLs, third-party domains from those URLs, prefetch/preload links | Third-party tool detection, endpoint hints |
| 3. Infrastructure Signals | Visible response headers (`server`, `x-powered-by`, `cf-ray`, `via`), hosting/CDN clues from URLs or DOM | CDN, hosting platform, deployment detection |
| 4. Runtime Config | Analytics IDs in globals or script sources, feature flag config snippets, A/B test setup, chat widget scripts, auth provider scripts | Analytics, feature flags, auth, monitoring detection |
| 5. Security Signals | CSP and HSTS headers if visible, source map URLs (`.map` files in script `src`), exposed API keys or tokens in page source | Security posture assessment |

TinyFish does not use DevTools or the Network tab. All signals are extracted from what a real user sees: DOM, script tags, page source, and observable headers.

---

## 11) Troubleshooting

### "Access blocked: n8n has not completed verification"

Your Google OAuth consent screen is in Testing and your account is not listed under Test users.

**Fix:** Google Cloud Console → OAuth consent screen → Test users → add your email.

### runId becomes undefined during polling

The workflow loops an aggregated item back into a node expecting per-run items.

**Fix:** The workflow includes a **Rehydrate RunIds for Next Poll** node that handles this. If you've modified the workflow, ensure this node is still connected between the "not done" branch and the **Wait 3 Seconds** node.

### Phases returning no data

TinyFish may not be able to read certain headers or globals on some sites.

**Fix:** This is expected. Failed phases are recorded in `failed_phases` and `warnings` in the report. The synthesis node falls back to URL/DOM inference for infra and security when headers are not visible.

### Google Sheets rows missing or misaligned

- Ensure column headers match exactly
- Use **Auto-map input data** in the Sheets node
- Verify the correct tab is selected

### Drive upload shows as binary file

- Ensure filename ends with `.md`
- Ensure MIME type is `text/markdown`
- The **Convert to Binary** node handles this automatically — do not bypass it

---

## 12) Cost Controls

- Start with 1–2 URLs to validate the setup before scanning larger lists
- Each URL triggers **5 TinyFish browsing sessions** (one per phase) + 2 OpenAI calls — keep URL count reasonable (5 or fewer per run for first tests)
- Large raw results from many phases can hit OpenAI token limits; the synthesis prompt is tuned for typical TinyFish output
- TinyFish runs are async and parallelised — total wall-clock time depends on site load speed, not phase count

---

## 13) Customization Ideas

- **Add Slack alerts** for domains using competitor analytics or auth providers you want to track
- **Tune the synthesis prompt** in `Synthesize Tech Stack` to focus on specific categories (e.g. only analytics and payments)
- **Add more URLs** from a Google Sheet trigger instead of the form — useful for bulk competitive audits
- **Build a dashboard** from the Google Sheets data to compare tech stacks across multiple competitors at a glance
- **Schedule recurring scans** using n8n's Schedule Trigger to detect stack changes over time
- **Add a Slack or email node** after the report row to notify your team when a scan completes

---

## 14) Pre-Run Checklist

- [ ] Workflow imported into n8n
- [ ] TinyFish community node installed (`n8n-nodes-tinyfish`)
- [ ] OpenAI credential added + assigned to `Plan Extraction Goals` and `Synthesize Tech Stack` nodes
- [ ] TinyFish credential added + assigned to `TinyFish Web Agent` and `Get TinyFish Status` nodes
- [ ] *(Optional)* Google Sheets credential connected + spreadsheet ID set in `Append to Google Sheets` node
- [ ] *(Optional)* Google Drive credential connected in `Upload Report to Google Drive` node
- [ ] Workflow runs successfully with a single test URL
