# Product description

## Product name

Waifu Deal Sniper

## Summary

Waifu Deal Sniper is a Discord bot for anime figure collectors. Users message the bot in DMs (or mention it in a server) with natural-language queries. The bot searches retailer sites for listings, scores “deal” potential, and replies with rich embeds. Optional features include multi-site search, gacha-style random picks, lighthearted roast/copium modes, and a watchlist that DMs users when likely deals show up.

## What it does

- **Search**: Default search targets AmiAmi pre-owned listings; users can also target Mercari US, Solaris Japan, or all configured sites at once.
- **Presentation**: Discord embeds show price, condition hints, stock, and site-specific context.
- **Engagement**: Gacha, roast, and copium modes reuse the last search context where applicable.
- **Persistence**: A local SQLite database (via `sql.js`) stores users, watchlists, search history, and notification deduplication.

## How TinyFish is used

Figure searches do not call retailer HTTP APIs directly. The bot uses the **TinyFish JavaScript SDK** (`@tiny-fish/sdk`) with `TinyFish#agent.run({ url, goal })` for each scrape: the agent visits the search URL and returns structured data (titles, prices, links, images, etc.) according to a natural-language goal defined per site.

**Authentication:** set `TINYFISH_API_KEY` in the environment (see `README.md`). The SDK reads this variable; the bot also checks that it is set before starting.

**Note:** Behavior matches the previous “wait for completion” integration: each search awaits a full agent run result before parsing items.

## Technical stack

| Layer | Technology |
|--------|------------|
| Runtime | Node.js 18+ |
| Discord | `discord.js` v14 |
| Automation | `@tiny-fish/sdk` |
| Config | `dotenv` (`.env` + optional `.env.local`) |
| Storage | `sql.js` (SQLite file under `data/` by default) |

## Configuration (high level)

| Variable | Role |
|----------|------|
| `DISCORD_TOKEN` | Bot token |
| `TINYFISH_API_KEY` | TinyFish API key |
| `DATABASE_PATH` | Optional path to SQLite file (defaults documented in `README.md`) |

## Discord requirements

The bot reads message content to parse commands. In the Discord Developer Portal, **Privileged Gateway Intents → Message Content Intent** must be enabled for the application, or the connection will fail with “Used disallowed intents.”

## Repository layout

See `README.md` for install steps, command list, and architecture diagram.

## License

MIT (see repository `package.json`).
