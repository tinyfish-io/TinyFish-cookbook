# Revault - The Autonomous Watchdog for Resellers

A 24/7 price watchdog powered by [TinyFish](https://tinyfish.ai) browser agents. Add items you want to flip, set your target margin and max buy price, and ResaleRadar monitors reseller platforms every 5 minutes — alerting you on Discord the moment a deal hits your target.

Built for the [TinyFish Take-Home Challenge] *"The Autonomous Watchdog"*

## How It Works

1. **Add an item** to your Watchdog List (e.g., "Louis Vuitton Neverfull MM")
2. **Set your target** — max buy price + target margin %
3. **TinyFish agents** scrape reseller platforms every 15 minutes
4. **Discord alert** fires instantly when a listing meets your criteria and then after every 15 minutes.

## Categories Supported

| Category | Platforms Scraped |
|----------|-------------------|
| Watches | Chrono24, WatchBox, Bob's Watches, eBay |
| Bags | Fashionphile, Vestiaire, Rebag, GoogleShopping |
| Trading Cards | TCGPlayer, eBay, StockX, PWCC |
| Sports & Fan Gear | Fanatics, eBay Sports, PWCC, Goldin, StockX, SidelineSwap |
| Sneakers | StockX, GOAT, eBay, Alias |

## Setup — Run Your Own Instance

### 1. Clone and install

```bash
git clone <your-repo-url>
cd revault-reseller-watchdog
npm install
```

### 2. Get your API keys

- **TinyFish API Key**: Sign up at [tinyfish.ai](https://tinyfish.ai), go to Dashboard → Settings → API Keys
- **Discord Webhook URL**: In your Discord server, go to Server Settings → Integrations → Webhooks → New Webhook → Copy URL

### 3. Configure

Create a `.env` file in the project root:

```env
VITE_TINYFISH_API_KEY=sk-tinyfish-your-key-here
VITE_DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/your-webhook-here
```

Or edit `src/config.js` directly with your keys.

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy 


Set the environment variables in Vercel Dashboard → Project Settings → Environment Variables.

## Architecture

```
User adds item → TinyFish browser agents scrape reseller sites
                         ↓
              Extract: price, condition, listing URL
                         ↓
              Compare to user's max buy price + target margin
                         ↓
              If target hit → Discord webhook alert
              If not → update watchlist, check again in 5 min
```

## Tech Stack

- **Frontend**: React + Vite
- **Scraping**: TinyFish Web Agent API (handles anti-bot, JS-heavy sites)
- **Notifications**: Discord Webhooks
- **Hosting**: Vercel
