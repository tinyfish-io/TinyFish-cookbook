# File Architecture

High‑level map of the project and what each file is for.

```
.
├─ app/
│  ├─ api/
│  │  └─ research/
│  │     └─ route.ts          # API route: orchestrates OpenAI + Tinyfish runs
│  ├─ globals.css             # Global styles and Tailwind theme tokens
│  ├─ layout.tsx              # Root layout, fonts, metadata
│  └─ page.tsx                # Main UI page (competitors, query, results)
├─ cli/
│  └─ scout.mjs                # CLI entrypoint and commands
├─ components/
│  ├─ cli-preview.tsx          # CLI preview + rolling log panel in GUI
│  ├─ competitor-panel.tsx     # Add/remove competitor form + list
│  ├─ event-log.tsx            # Streaming event log UI
│  ├─ query-input.tsx          # Research question input UI
│  └─ report-view.tsx          # Summary + comparison report UI
├─ lib/
│  ├─ env.ts                   # Local env loader for dev
│  ├─ openai-client.ts         # OpenAI planning + summarization + report
│  ├─ tinyfish.ts              # Tinyfish/Mino API client
│  ├─ types.ts                 # Shared TypeScript types
│  └─ utils.ts                 # Shared utilities (className helpers, etc.)
├─ public/
│  ├─ v0-logo-dark.svg         # Logo asset
│  └─ v0-logo-light.svg        # Logo asset
├─ .env.example                # Env template (no secrets)
├─ .gitignore                  # Git ignore rules (includes env + run output)
├─ .vscode/settings.json       # Local editor settings
├─ next-env.d.ts               # Next.js TypeScript declarations
├─ next.config.mjs             # Next.js config
├─ package.json                # App metadata + scripts + dependencies
├─ package-lock.json           # npm lockfile
├─ pnpm-lock.yaml              # pnpm lockfile (if you use pnpm)
├─ postcss.config.mjs          # PostCSS config (Tailwind v4)
├─ PRODUCT.md                  # Product brief + PRD content
├─ README.md                   # Setup + usage guide
└─ tsconfig.json               # TypeScript config
```

Notes
- Runtime‑generated files like `.env.local`, `.scout.json`, and `.scout-runs.json` are ignored by git.
