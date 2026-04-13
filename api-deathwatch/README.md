# API Deathwatch

A GitHub App that silently monitors every API and hosted service in your `package.json` — and opens a GitHub Issue in your repo before something breaks in production.

APIs don't die overnight. They decay slowly. Free tiers quietly shrink. GitHub issues pile up unanswered. Developers ask for alternatives on HN. None of that crashes your app, but together it's a reliable signal — weeks or months before you're doing an emergency migration at 2am.

**API Deathwatch gives each service a health score out of 10 and tells you exactly what to do.**

---

## How it works

1. Install the app on your repo
2. It reads your `package.json` and identifies hosted services (Stripe, Supabase, Twilio, etc.)
3. TinyFish agents run in parallel checking 4 signals per service: status page, changelog/deprecation notices, Hacker News sentiment, pricing page
4. Results are posted as a GitHub Issue in your repo with scores, warnings, and recommended actions
5. Re-runs every 7 days automatically

---

## Example issue output

```
## Summary

| Service    | Score  | Status          | Action                        |
|------------|--------|-----------------|-------------------------------|
| heroku     | 3.2/10 | 🔴 Critical     | Begin migration planning now  |
| mailchimp  | 5.8/10 | 🟠 Concern      | Start evaluating alternatives |
| stripe     | 9.1/10 | ✅ Healthy      | No action needed              |
```

---

## TinyFish API Usage

The app uses `@tiny-fish/sdk` with `client.agent.run()` — the synchronous endpoint — since this is a background Node.js process with no frontend to stream to. Four agents run in parallel per service:

```javascript
const { TinyFish, RunStatus } = require("@tiny-fish/sdk");

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });

const run = await client.agent.run({
  url,
  goal,
  browser_profile: "stealth",
});

if (run.status === RunStatus.COMPLETED) {
  return run.result; // structured JSON from the agent
}
```

Each service gets 4 agents running in parallel via `Promise.allSettled`:
- **Status page** — navigates to the service's status page, reads current status and recent incidents
- **Deprecation signals** — scans Google for shutdown notices, price increases, EOL announcements
- **HN sentiment** — reads Hacker News Algolia for complaints, alternatives threads, shutdown rumours
- **Pricing page** — checks if free tier still exists and looks for pricing change signals

---

## Setup (self-hosted)

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/api-deathwatch
cd api-deathwatch
npm install
```

### 2. Create the GitHub App

Go to **github.com → Settings → Developer Settings → GitHub Apps → New GitHub App**

Fill in:
- **Name**: API Deathwatch (or anything you want)
- **Homepage URL**: your server URL or `https://github.com/YOUR_USERNAME/api-deathwatch`
- **Webhook URL**: `https://YOUR_SERVER/api/webhook` (use smee.io for local dev — see below)
- **Webhook secret**: generate a random string and save it
- **Permissions**:
  - Repository contents: **Read**
  - Issues: **Read & Write**
- **Subscribe to events**: Installation, Repository

Click **Create GitHub App**, then:
- Note the **App ID** shown at the top
- Scroll down and click **Generate a private key** — save the `.pem` file in the project root

### 3. Configure environment

```bash
cp .env.example .env
```

Fill in `.env`:
```
GITHUB_APP_ID=<your app id>
GITHUB_WEBHOOK_SECRET=<your webhook secret>
GITHUB_PRIVATE_KEY_PATH=./private-key.pem
TINYFISH_API_KEY=<your tinyfish key>
```

Get a TinyFish key at https://agent.tinyfish.ai/api-keys

### 4. Run locally with webhook tunnel

GitHub needs to reach your local server. Use smee.io:

```bash
# Terminal 1 — start the tunnel
npx smee -u https://smee.io/YOUR_CHANNEL --path /api/webhook --port 3000

# Terminal 2 — start the app
npm run dev
```

Go back to your GitHub App settings and set the **Webhook URL** to your smee.io URL.

### 5. Install on a repo

Go to your GitHub App's page → **Install App** → choose your repo.

The app will immediately:
1. Read your `package.json`
2. Run health checks via TinyFish agents
3. Open a GitHub Issue with the results

### 6. Deploy to production

Deploy to [Railway](https://railway.app), [Render](https://render.com), or any Node.js host. Set the environment variables in your host's dashboard, upload your `private-key.pem` (as an env var or secret file), and update the **Webhook URL** in your GitHub App settings to your live server URL.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js + Express |
| GitHub integration | Octokit Webhooks (GitHub Apps API) |
| Web agents | TinyFish Agent API (`@tiny-fish/sdk`) |
| Scheduling | node-cron (7-day schedule) |

---

## Environment Variables

| Variable | Description |
|---|---|
| `GITHUB_APP_ID` | Numeric App ID from GitHub App settings |
| `GITHUB_WEBHOOK_SECRET` | Secret set when creating the webhook |
| `GITHUB_PRIVATE_KEY_PATH` | Path to the `.pem` private key file |
| `TINYFISH_API_KEY` | TinyFish API key — get one at [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |
| `PORT` | Server port (default: 3000) |
