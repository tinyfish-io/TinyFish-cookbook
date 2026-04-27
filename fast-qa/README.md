# Fast QA
**Live Demo:** _add URL after deploy_

**AI-powered QA test execution platform — describe tests in plain English, run them as parallel browser agents, and get structured pass/fail results with AI-generated summaries.**

Write test cases in plain English (e.g. "Go to the login page, enter valid credentials, verify the dashboard loads"). Groq parses them into structured steps, TinyFish browser agents execute them against your website in parallel, and Groq summarises the results with bullet-point explanations of what passed or failed.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  ProjectCard → TestCaseList → TestExecutionGrid             │
│  AITestGenerator → TestResultsTable → TestCaseDetail        │
│  (results stream in as agents finish)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │
     ┌─────────────────────┼──────────────────────┐
     ▼                     ▼                      ▼
/api/generate-tests   /api/parse-test      /api/execute-tests
/api/generate-report       │                      │
     │                     ▼                      ▼
     ▼              ┌─────────────┐    ┌──────────────────────┐
┌──────────┐        │  Groq LLM   │    │    TinyFish SDK       │
│ Groq LLM │        │             │    │                      │
│          │        │ Parse plain │    │ client.agent.stream  │
│ Generate │        │ English →   │    │ per test case        │
│ test     │        │ structured  │    │                      │
│ cases    │        │ steps       │    │ EventType.STREAMING  │
│ from raw │        └─────────────┘    │   _URL → live iframe │
│ text     │                           │ EventType.PROGRESS   │
│          │                           │   → step updates     │
│ Generate │                           │ EventType.COMPLETE   │
│ bug      │                           │ + RunStatus.COMPLETED│
│ reports  │                           │   → result → SSE     │
└──────────┘                           │                      │
                                       │ Promise.allSettled   │
                                       │ (batch parallel)     │
                                       └──────────────────────┘

No database. No cache. Pure in-memory — state managed in React context.
```

### TinyFish SDK event flow

```
client.agent.stream({ url, goal, browser_profile })
  │
  ├── EventType.STREAMING_URL → live iframe URL → SSE → client
  ├── EventType.PROGRESS      → step description → SSE → client
  └── EventType.COMPLETE
        └── RunStatus.COMPLETED
              // COMPLETED only means the browser ran without crashing
              // — always validate result content, not just the status
              → parse event.result → { success, reason, extractedData }
              → Groq generates bullet-point summary if no reason returned
              → test_complete → SSE → client
```

### Groq usage

```
groq-client.ts:
  parseTestDescription()     → plain English → structured test steps
  generateTestsFromText()    → raw requirements → test case list
  generateBugReport()        → failed test → structured bug report
  generateTestResultSummary() → test outcome → bullet-point explanation
```

## Features

- **Plain English tests** — describe what to test, Groq structures it into steps
- **Bulk generation** — paste requirements or feature descriptions, get a full test suite
- **Parallel execution** — configurable batch size (1–10 concurrent agents)
- **Live browser preview** — watch each agent navigate in real time via iframe
- **AI result summaries** — Groq explains why each test passed or failed
- **Bug report generation** — one-click structured bug reports for failed tests
- **PII sanitisation** — email, phone, and card numbers redacted before sending to Groq

## Setup

### Prerequisites

- Node.js 22.x
- TinyFish API key
- Groq API key

### Environment Variables

```bash
cp .env.example .env.local
```

Then fill in:

```env
# TinyFish Web Agent API key (server-side only)
# Get yours at: https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=

# Groq API key — used for test generation, parsing, and result summaries
# Get yours at: https://console.groq.com
GROQ_API_KEY=
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
fast-qa/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Main UI
│   ├── globals.css
│   └── api/
│       ├── generate-tests/route.ts       # POST — Groq: raw text → test cases
│       ├── parse-test/route.ts           # POST — Groq: plain English → steps
│       ├── execute-tests/route.ts        # POST — TinyFish SDK → SSE stream
│       └── generate-report/route.ts      # POST — Groq: failed test → bug report
├── components/
│   ├── qa/
│   │   ├── ai-test-generator.tsx         # Bulk test generation UI
│   │   ├── dashboard-layout.tsx          # App shell
│   │   ├── project-card.tsx              # Project summary card
│   │   ├── project-dialog.tsx            # Create/edit project
│   │   ├── settings-panel.tsx            # Browser profile, parallel limit, proxy
│   │   ├── test-case-detail.tsx          # Test case detail view
│   │   ├── test-case-editor.tsx          # Create/edit test case
│   │   ├── test-case-list.tsx            # Test case list
│   │   ├── test-execution-grid.tsx       # Live agent grid during execution
│   │   └── test-results-table.tsx        # Results table with bug report trigger
│   └── ui/                               # accordion, alert, alert-dialog, badge,
│                                         # button, card, checkbox, dialog,
│                                         # dropdown-menu, input, label, progress,
│                                         # select, skeleton, switch, table,
│                                         # textarea, tooltip
├── hooks/
│   └── hooks.ts                          # Custom hooks
├── lib/
│   ├── groq-client.ts                    # Groq LLM — test gen, parse, summaries
│   ├── qa-context.tsx                    # React context for QA state
│   └── utils.ts                          # Shared helpers
├── types/
│   └── index.ts                          # TypeScript definitions
├── .env.example
├── .gitignore
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory React context) |
| Raw SSE fetch? | NO (TinyFish SDK throughout) |
| OpenRouter / AI SDK? | NO (Groq SDK directly) |
| Test execution parallel? | YES (configurable batch size, `Promise.allSettled`) |
| Live browser preview? | YES (`EventType.STREAMING_URL` → iframe per agent) |
| Result validation? | YES (COMPLETED ≠ goal achieved — content always validated) |
| PII sanitisation? | YES (email, phone, card redacted before Groq calls) |

## Tech Stack

- **Framework:** Next.js 16 (App Router), TypeScript, Tailwind CSS 4
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **LLM:** Groq (`llama-3.3-70b-versatile`)
- **Icons:** Lucide React
- **Deployment:** Vercel
