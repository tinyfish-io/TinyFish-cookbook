# Synapse — Universal Action API Developer Platform

Synapse gives your AI agents hands. It's a developer platform for defining, testing, monitoring, and managing web automation actions powered by the [TinyFish](https://tinyfish.io) execution engine.

## Try It Yourself

👉 **[Launch Synapse](https://agent-action-layer.lovable.app/)** — no setup required.

## What is Synapse?

Synapse turns complex, multi-step web interactions — navigating pages, clicking buttons, filling forms, extracting data — into a **single, unified API call** that any AI agent can use. Instead of your agent needing to understand browser automation, DOM structures, or anti-bot measures, it simply sends a JSON action definition to Synapse and gets clean, structured results back.

Under the hood, Synapse translates each action into a sequence of browser operations executed by the TinyFish engine with computer-vision resilience. The agent never touches a browser — it just calls one endpoint and gets the data it needs.

Synapse provides a visual control center where developers can:

- **Build actions** — Define multi-step web automations (navigate, click, type, extract data) using an interactive Playground
- **Test in real-time** — Execute actions against live websites via the TinyFish API and see step-by-step results
- **Manage a library** — Save, search, and organize reusable action definitions
- **Monitor executions** — Track action runs with status, duration, and detailed step logs

## How TinyFish Powers Synapse

[TinyFish](https://tinyfish.io) is the backend execution engine. When you hit "Run Action" in the Playground, Synapse sends your action definition to the TinyFish API, which:

1. Spins up a headless browser session
2. Executes each step (navigation, clicks, typing, data extraction)
3. Returns structured results and screenshots

## Tech Stack

- **Frontend:** React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend:** Lovable Cloud (database, auth, edge functions)
- **Execution Engine:** TinyFish API
- **UI Motion:** Framer Motion

## Getting Started

```sh
# Clone the repo
git clone <YOUR_GIT_URL>

# Install dependencies
npm install

# Start the dev server
npm run dev
```

## Project Structure

```
src/
├── pages/           # Route pages (Index, Playground, ActionLibrary, ExecutionMonitor, Settings)
├── components/      # Reusable UI components
├── lib/             # Utilities and mock data
├── types/           # TypeScript type definitions
└── integrations/    # Backend client configuration
```

## License

MIT
