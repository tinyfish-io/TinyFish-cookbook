# Competitor Scout

Teams waste time manually checking competitor sites as their product evolves. **Competitor Scout** is a **CLI** and **Next.js** UI that lets you set competitors once and ask natural-language questions about their features and positioning. It uses **OpenAI** to plan research and **Tinyfish** ([Search](https://docs.tinyfish.ai/search-api), [Fetch](https://docs.tinyfish.ai/fetch-api), and [Web Agent](https://docs.tinyfish.ai/agent-api/index.md) via `@tiny-fish/sdk`) to gather evidence, then produces structured summaries and a comparison report.

## Requirements

- Node.js 18+
- npm
- OpenAI API key
- Tinyfish API key (`TINYFISH_API_KEY`)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Environment:

   ```bash
   cp .env.example .env.local
   ```

   Set:

   - `OPENAI_API_KEY=...`
   - `TINYFISH_API_KEY=...`

## Run the web UI (Next.js)

- Dev server:

  ```bash
  npm run dev
  ```

- Open [http://localhost:3000](http://localhost:3000).

The research API (`POST /api/research`) uses a **hybrid** pipeline per competitor: **Tinyfish Search** → **Tinyfish Fetch** (batched URLs) → **OpenAI** checks whether the evidence is enough and returns structured JSON + sources; if not, it **falls back** to the **Tinyfish Web Agent** (async run + poll).

## Run the CLI

The CLI lives at `cli/scout.mjs`. It uses the **Tinyfish SDK** for **Agent** runs only (`agent.queue` + polling + cancel), not Search/Fetch.

Examples:

```bash
node cli/scout.mjs init
node cli/scout.mjs add --name "Notion" --url "https://www.notion.com"
node cli/scout.mjs list
node cli/scout.mjs research "What sign-in methods do my competitors support?"
node cli/scout.mjs runs
node cli/scout.mjs cancel
```

## Help

Use straight quotes in the terminal. Smart quotes (like “ ”) can cause `dquote>` prompts.

```bash
node cli/scout.mjs
```

Commands:

- `init` — create `.scout.json`
- `add` — add a competitor (`--name`, `--url`)
- `list` — list competitors (alias: `ls`)
- `remove` — remove a competitor by name (alias: `rm`)
- `clear` — remove all competitors (alias: `rm-all`)
- `research` — run research (alias: `ask`)
- `runs` — list recorded runs
- `cancel` — cancel latest or `--run` by id
- `reset` — delete `.scout.json` and `.scout-runs.json`

## Project layout

See [FILE_ARCHITECTURE.md](./FILE_ARCHITECTURE.md) for a file map. Product and architecture notes: [PRODUCT.md](./PRODUCT.md).

## Notes

- `.env.local` is gitignored.
- CLI reports and JSON outputs are written to the current working directory.
- Run history is stored in `.scout-runs.json` next to your config.

## Package name

The npm package name is **`competitor-scout-cli`** (see `package.json`).
