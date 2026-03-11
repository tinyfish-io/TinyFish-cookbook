# Daily Product Hunt Tracker (n8n Workflow) — Setup & Run Guide

Get a daily Telegram message with the top 5 trending products on Product Hunt, automatically scraped and formatted by AI.

No APIs to parse, no brittle selectors — just tell TinyFish what you want in plain English, and an LLM formats it into a clean report.

---

## What you get

Every day at 6 PM, a message like this lands in your Telegram:

```
🏆 Daily Product Hunt Trending Report
━━━━━━━━━━━━━━━━━━━━━━━

🥇 CoolApp  (842 upvotes)
AI-powered workflow builder for teams
🏷 Productivity, AI, No-Code
🔗 https://www.producthunt.com/posts/coolapp

🥈 FastDB  (631 upvotes)
The database that scales itself
🏷 Developer Tools, Database, Infrastructure
🔗 https://www.producthunt.com/posts/fastdb

...

━━━━━━━━━━━━━━━━━━━━━━━
📅 2026-03-11
```

---

## How it works

```
Schedule Trigger (daily at 6 PM)
  |
  v
TinyFish Extract (scrapes Product Hunt homepage, stealth + SSE)
  |
  v
IF Node (checks if data was returned)
  |
  v
Format Report (OpenRouter LLM formats raw data into Telegram message)
  |
  v
Telegram (sends the formatted report to your chat)
```

1. **Schedule Trigger** fires daily at 6 PM (configurable)
2. **TinyFish** visits `producthunt.com` in stealth mode and extracts the top 5 products — name, tagline, upvotes, tags, and URL
3. **IF node** checks the scrape returned data (skips if empty)
4. **OpenRouter LLM** takes the raw JSON and formats it into a clean, emoji-rich Telegram message
5. **Telegram node** sends the message to your chat or group

---

## Prerequisites

### API keys you need

| Service | What for | Get it at |
|---------|----------|-----------|
| **TinyFish** | Web scraping | [agent.tinyfish.ai/api-keys](https://agent.tinyfish.ai/api-keys) |
| **OpenRouter** | LLM formatting | [openrouter.ai/keys](https://openrouter.ai/keys) |
| **Telegram** | Message delivery | Talk to [@BotFather](https://t.me/BotFather) on Telegram |

### Software

- **n8n** (Desktop, Docker, or Cloud)
- **n8n-nodes-tinyfish** community node

---

## 1) Install & open n8n

### Option A — n8n Desktop

1. Download and install n8n Desktop
2. Open it — runs at `http://localhost:5678`

### Option B — Docker

```bash
docker run -it --rm \
  -p 5678:5678 \
  -v ~/.n8n:/home/node/.n8n \
  n8nio/n8n
```

---

## 2) Install the TinyFish community node

1. In n8n, go to **Settings > Community Nodes**
2. Click **Install**
3. Enter: `n8n-nodes-tinyfish`
4. Install and restart n8n if prompted

---

## 3) Import the workflow

1. In n8n, click **Workflows > Import from file**
2. Select `Daily Product Hunt Tracker via Tinyfish.json`
3. Click **Save**

You should see these nodes on the canvas:
- **Schedule Trigger**
- **TinyFish Extract**
- **If** (data check)
- **Format Report** (LLM chain) + **OpenRouter Chat Model**
- **Telegram**

---

## 4) Set up credentials

### 4.1 TinyFish

1. **Credentials > New > TinyFish Web Agent**
2. Paste your TinyFish API key
3. Save and assign to the **TinyFish Extract** node

### 4.2 OpenRouter

1. **Credentials > New > OpenRouter**
2. Paste your OpenRouter API key
3. Save and assign to the **OpenRouter Chat Model** node

### 4.3 Telegram Bot

#### Create a bot

1. Open Telegram and search for **@BotFather**
2. Send `/newbot` and follow the prompts
3. Copy the **bot token** BotFather gives you

#### Get your Chat ID

1. Start a chat with your new bot (send it any message)
2. Visit `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates` in your browser
3. Find `"chat":{"id":123456789}` — that number is your Chat ID

> For group chats: add the bot to the group, send a message, then check `getUpdates`. Group chat IDs are negative numbers.

#### Configure in n8n

1. **Credentials > New > Telegram API**
2. Paste your bot token
3. Save and assign to the **Telegram** node
4. Open the **Telegram** node and replace `YOUR_CHAT_ID` with your actual Chat ID

---

## 5) Running the workflow

### Test run (immediate)

1. Open the workflow
2. Click **Execute workflow**
3. Watch TinyFish scrape Product Hunt, the LLM format the data, and Telegram send the message
4. Check your Telegram — you should have a report

### Activate for daily runs

1. Toggle the **Active** switch in the top right
2. The workflow will now run automatically every day at 6 PM

> To change the time: open the **Schedule Trigger** node and adjust `triggerAtHour`.

---

## Customization ideas

- **Change the schedule**: Run every 12 hours, every Monday, or on a cron expression
- **Scrape a different site**: Change the URL and goal in TinyFish — works with any website
- **Swap the output**: Replace Telegram with Discord (webhook), Slack, email, Notion, or Google Sheets
- **Track more products**: Change the goal to "top 10" instead of "top 5"
- **Add filtering**: Add a Code node after TinyFish to filter by category, minimum upvotes, etc.
- **Change the LLM**: Swap the OpenRouter model — any model works for formatting

---

## Troubleshooting

### No Telegram message received

- Make sure you started a conversation with the bot first (send it any message)
- Verify the Chat ID is correct — revisit the `getUpdates` URL
- For group chats, make sure the bot has permission to send messages

### TinyFish returns empty data

- Product Hunt may have changed their layout — try adjusting the goal text
- Check your TinyFish API key and remaining credits
- Try running manually to see the raw output

### LLM formatting looks wrong

- The AI system prompt defines the exact format — edit it in the **OpenRouter Chat Model** node
- If products are out of order, add "ranked by upvotes, highest first" to the prompt

### Schedule not firing

- Make sure the workflow is toggled **Active**
- Check that your n8n instance is running at the scheduled time (Docker containers that stop won't trigger)

---

## Quick checklist before first run

- [ ] Workflow imported
- [ ] TinyFish credential added and assigned
- [ ] OpenRouter credential added and assigned
- [ ] Telegram bot created via @BotFather
- [ ] Chat ID obtained and set in the Telegram node
- [ ] Test execution succeeds
- [ ] Workflow toggled Active for daily runs
