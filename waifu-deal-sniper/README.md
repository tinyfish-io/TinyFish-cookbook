# 🎎 Waifu Deal Sniper

**Live Demo:** [https://discord.com/oauth2/authorize?client_id=1465346765611077871&permissions=277025508352&scope=bot]

A Discord bot that helps anime figure collectors find discounted pre-owned figures by scraping deals in real-time from multiple sites using the TinyFish Mino API.

---

## 🎯 What It Does

Waifu Deal Sniper lets users search for anime figures across **AmiAmi**, **Mercari US**, and **Solaris Japan** directly from Discord. The bot uses TinyFish's Mino API to scrape real-time pricing, condition grades, and availability — then presents results with a fun, personality-driven interface including gacha mode, roast mode, and copium dispensary.

**Where TinyFish API is used:** The Mino API powers all figure searches by scraping e-commerce sites with natural language goals, extracting structured data (prices, conditions, images, stock status) from pages that don't have public APIs.

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

## 📦 TinyFish API Integration

```javascript
const MINO_ENDPOINT = 'https://mino.ai/v1/automation/run-sse';

async function searchSite(siteKey, query, maxPrice = null) {
  const site = SITES[siteKey];
  const searchUrl = site.searchUrl(query);
  
  // Natural language goal for Mino
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

  const response = await fetch(MINO_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': process.env.MINO_API_KEY,
    },
    body: JSON.stringify({ url: searchUrl, goal }),
  });

  // Parse SSE response
  const text = await response.text();
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const event = JSON.parse(line.slice(6));
      if (event.type === 'COMPLETE') {
        return event.items || event.result;
      }
    }
  }
}
```

---

## 🚀 How to Run

### Prerequisites
- Node.js 18+
- Discord Bot Token
- TinyFish Mino API Key

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
export MINO_API_KEY=your_tinyfish_mino_api_key
```

Or create a `.env` file:
```env
DISCORD_TOKEN=your_discord_bot_token
MINO_API_KEY=your_tinyfish_mino_api_key
```

### 4. Run the bot
```bash
node bot.js
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
│                      TINYFISH MINO API                                  │
│                                                                         │
│   POST /v1/automation/run-sse                                           │
│   { url: "https://mercari.com/search?keyword=rem", goal: "..." }       │
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
| **Real-Time Scraping** | Live prices via Mino API |
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
├── bot.js          # Main bot logic (1,543 lines)
├── database.js     # SQLite database layer
├── templates.js    # 670+ personality responses
├── package.json    # Dependencies
└── README.md       # This file
```

---

## 🔧 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Discord bot token | ✅ |
| `MINO_API_KEY` | TinyFish Mino API key | ✅ |

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

Built with [TinyFish Mino API](https://tinyfish.io) for web scraping.

---

## 📄 License

MIT
