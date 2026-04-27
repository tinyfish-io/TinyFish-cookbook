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

Figure searches do not call retailer HTTP APIs directly. The bot uses the **TinyFish JavaScript SDK** (`@tiny-fish/sdk`) with `client.agent.stream({ url, goal })` and waits for the final **COMPLETE** SSE event before parsing items (same end-to-end behavior as the legacy `run-sse` HTTP integration). The synchronous `agent.run()` endpoint can return before the scrape finishes with an empty `result`, which is why searches use the stream API.

**Authentication:** set `TINYFISH_API_KEY` in the environment (see `README.md`). The SDK reads this variable; the bot also checks that it is set before starting.

**Note:** Each search waits until the run reports `COMPLETED` on the stream, then extracts the structured payload from `event.result`.

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
