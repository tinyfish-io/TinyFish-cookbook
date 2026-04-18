# 🎎 Waifu Deal Sniper

**Live Demo:** [https://discord.com/oauth2/authorize?client_id=1465346765611077871&permissions=277025508352&scope=bot]

A Discord bot that helps anime figure collectors find discounted pre-owned figures by scraping deals in real-time from multiple sites using the **TinyFish agent SDK** (`@tiny-fish/sdk`).

---

## 🎯 What It Does

Waifu Deal Sniper lets users search for anime figures across **AmiAmi**, **Mercari US**, and **Solaris Japan** directly from Discord. The bot uses the TinyFish agent to scrape real-time pricing, condition grades, and availability — then presents results with a fun, personality-driven interface including gacha mode, roast mode, and copium dispensary.

**Where TinyFish is used:** All figure searches use `client.agent.stream({ url, goal })` and read the final `COMPLETE` event (same wait-for-completion behavior as the old direct `run-sse` call). Natural-language goals are defined per site to extract prices, conditions, images, and stock status from pages that do not expose public APIs.

---

## 🎬 Demo

https://github.com/user-attachments/assets/demo.mp4

**Commands examples:**
- `rem bunny` - Search AmiAmi for Rem bunny figures
- `mercari miku` - Search Mercari US for Miku figures
- `all makima` - Search all 3 sites simultaneously
- `gacha rem` - Random figure gacha with rarity scoring
- `roast` - Get roasted for your figure taste

---

## 📦 TinyFish SDK Integration

The bot uses `@tiny-fish/sdk` (see `package.json`). Set `TINYFISH_API_KEY` in your environment; the SDK reads it automatically.

```javascript
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

const client = new TinyFish();

async function searchSite(siteKey, query, maxPrice = null) {
  const site = SITES[siteKey];
  const searchUrl = site.searchUrl(query);

  const goal = `Scrape pre-owned figure listings from this page.
    For each product (max 8), extract:
    - raw_title: Full product title
    - price: Price (number only)
    - url: Product link
    - image: Image URL
    - in_stock: true/false
    - condition: Item condition
    - manufacturer: Company name
    Return JSON array.`;

  const stream = await client.agent.stream({ url: searchUrl, goal });
  for await (const event of stream) {
    if (event.type === EventType.COMPLETE && event.status === RunStatus.COMPLETED) {
      return event.result;
    }
  }
}
```

This repository’s `bot.js` uses the same pattern from CommonJS via dynamic `import()` of `@tiny-fish/sdk`.

---

## 🚀 How to Run

### Prerequisites
- Node.js 18+
- Discord bot token
- TinyFish API key (`TINYFISH_API_KEY`)
- In the Discord Developer Portal, enable **Bot → Privileged Gateway Intents → Message Content Intent** (required so the bot can read message text for commands)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_USERNAME/TinyFish-cookbook.git
cd TinyFish-cookbook/waifu-deal-sniper
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set environment variables
```bash
export DISCORD_TOKEN=your_discord_bot_token
export TINYFISH_API_KEY=your_tinyfish_api_key
```

Or create a `.env` file in this directory (loaded on startup). Optional: add `.env.local` for machine-specific overrides (loaded after `.env`).

```env
DISCORD_TOKEN=your_discord_bot_token
TINYFISH_API_KEY=your_tinyfish_api_key
```

Optional:

```env
DATABASE_PATH=./data/waifu.db
```

### 4. Run the bot
```bash
npm start
```

### 5. Invite the bot to your server
```
https://discord.com/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=277025508352&scope=bot
```

---

## 🏗️ Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                            DISCORD USER                                  │
│                                                                         │
│                         "mercari rem bunny"                             │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         DISCORD BOT (Node.js)                           │
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌────────────────────────┐   │
│  │   Message    │───▶│    Intent    │───▶│    Site Router         │   │
│  │   Parser     │    │    Router    │    │  (amiami/mercari/all)  │   │
│  └──────────────┘    └──────────────┘    └───────────┬────────────┘   │
│                                                       │                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────▼────────────┐   │
│  │   SQLite     │◀──▶│   Rate       │◀──▶│   Search Handler      │   │
│  │   Database   │    │   Limiter    │    │   + Rarity Scoring    │   │
│  └──────────────┘    └──────────────┘    └───────────┬────────────┘   │
│                                                       │                 │
└───────────────────────────────────────────────────────┼─────────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      TINYFISH AGENT (@tiny-fish/sdk)                     │
│                                                                         │
│   client.agent.stream({ url: "...", goal: "..." }) → COMPLETE event       │
│                                                                         │
│   ┌─────────────────────────────────────────────────────────────────┐  │
│   │  Headless Browser → Navigate → Extract → Return Structured JSON │  │
│   └─────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
              ┌──────────┐ ┌──────────┐ ┌──────────┐
              │ 🇯🇵       │ │ 🇺🇸       │ │ ☀️       │
              │ AmiAmi   │ │ Mercari  │ │ Solaris  │
              │ (JPY)    │ │ (USD)    │ │ (USD)    │
              └──────────┘ └──────────┘ └──────────┘
```

---

## 📋 Features

| Feature | Description |
|---------|-------------|
| **Multi-Site Search** | AmiAmi, Mercari US, Solaris Japan |
| **Real-Time Scraping** | Live prices via TinyFish agent (`agent.stream` → `COMPLETE`) |
| **Rarity Scoring** | SSR/SR/R/N based on scale, manufacturer, exclusivity |
| **Gacha Mode** | Random figure picks with dramatic reveals |
| **Roast Mode** | Get roasted for your waifu choices |
| **Copium Mode** | Consolation when figures are sold out |
| **Watchlist** | DM alerts when deals appear |
| **Rate Limiting** | Prevents API abuse |

---

## 📁 Project Structure

```
waifu-deal-sniper/
├── bot.js          # Main bot logic
├── database.js     # SQLite database layer (sql.js)
├── templates.js    # Personality responses
├── package.json    # Dependencies (@tiny-fish/sdk, discord.js, …)
├── product.md      # Product / PRD-style overview
└── README.md       # This file
```

---

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | ✅ |
| `TINYFISH_API_KEY` | TinyFish API key (used by `@tiny-fish/sdk`) | ✅ |
| `DATABASE_PATH` | SQLite file path (default: `./data/waifu.db`) | ❌ |

---

## 📜 Commands

| Command | Description |
|---------|-------------|
| `rem` | Search AmiAmi (default) |
| `mercari rem` | Search Mercari US |
| `solaris rem` | Search Solaris Japan |
| `all rem` | Search all sites |
| `gacha rem` | Random gacha pick |
| `roll` | Reroll gacha |
| `roast` | Get roasted |
| `copium` | Dispense cope |
| `watch rem under 15000` | Set price alert |
| `watchlist` | View alerts |
| `stats` | Your stats |
| `help` | Help message |

---

## 🙏 Credits

Built with [TinyFish](https://tinyfish.ai) and the [`@tiny-fish/sdk`](https://www.npmjs.com/package/@tiny-fish/sdk) agent SDK.

---

## 📄 License

MIT
