# Research Sentry
**Live: https://cookbook-research-sentry.vercel.app/**

**Voice-first academic research co-pilot — AI agents scrape 8 live research portals in parallel and assemble verified paper metadata in real time.**

Speak or type a research query. Research Sentry parses your intent, dispatches one TinyFish browser agent per academic portal simultaneously, aggregates and deduplicates the results, and streams them back as each portal completes. Then ask follow-up questions, compare papers side-by-side, track citations, or export BibTeX.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (Client)                       │
│                                                             │
│  VoiceRecorder / SearchInterface → ResultsGrid              │
│  ConversationInterface → PaperComparison → CitationTracker  │
│  TinyFishAgentTerminal (live agent log)                     │
└──────────────────────────┬──────────────────────────────────┘
                           │
              ┌────────────┼─────────────┐
              ▼            ▼             ▼
    /api/search/text  /api/search/voice  /api/compare
    /api/summarize    /api/conversation  /api/citations/track
    /api/export/bibtex
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│                    lib/tinyfish.ts                          │
│                                                             │
│  runTinyFishAutomation(url, goal, stealth?)                 │
│  Throws TinyFishError with typed codes:                     │
│    MISSING_API_KEY | RUN_FAILED | TIMEOUT |                 │
│    STREAM_ERROR    | NO_RESULT                              │
│                                                             │
│  client.agent.stream({ url, goal, browser_profile })        │
│    onComplete → RunStatus.COMPLETED → return result         │
│              → RunStatus.FAILED    → throw RUN_FAILED       │
└──────────────────────────┬──────────────────────────────────┘
                           │ Promise.allSettled (x8 parallel)
         ┌─────────┬───────┼────────┬─────────┐
         ▼         ▼       ▼        ▼         ▼
      ArXiv    PubMed  Semantic  Google    IEEE
                       Scholar   Scholar   Xplore
         +  SSRN  +  CORE  +  DOAJ

Google Scholar + IEEE Xplore use browser_profile: 'stealth'
```

### OpenAI usage

```
lib/intent-parser.ts    → parse topic, keywords, sources from query
lib/summarizer.ts       → summarize individual papers
lib/comparator.ts       → structured methodology/results comparison
lib/conversation.ts     → conversational follow-up answers
lib/citation-tracker.ts → citation velocity and impact prediction
lib/whisper.ts          → speech-to-text via OpenAI's Whisper endpoint
```

## Key Features

- **Voice input** — record a question, OpenAI Whisper transcribes it into a search query
- **Multi-source search** — 8 portals scraped simultaneously: ArXiv, PubMed, Semantic Scholar, Google Scholar, IEEE Xplore, SSRN, CORE, DOAJ
- **Paper comparison** — structured methodology/results comparison across selected papers
- **Citation tracking** — monitor citation velocity and predicted impact
- **BibTeX export** — download selected papers as a `.bib` file
- **Conversational follow-ups** — ask the AI assistant questions about your results
- **Live agent terminal** — watch each TinyFish agent's progress in real time

## Scraping Flow

1. User speaks or types a research query
2. OpenAI (`intent-parser.ts`) extracts topic, keywords, and target sources
3. One TinyFish agent fires per portal — all in parallel via `Promise.allSettled`
4. Each agent navigates the portal's live DOM with a tight, focused goal prompt
5. Results stream back to the aggregator as each agent completes
6. `aggregator.ts` deduplicates and ranks by citation count
7. Results appear in the UI as portals finish — no waiting for the slowest one

## Setup

### Prerequisites

- Node.js 18+
- TinyFish API key
- OpenAI API key

### Environment Variables

```bash
cp .env.example .env.local
```

Then fill in:

```env
# TinyFish (required) — https://agent.tinyfish.ai/api-keys
TINYFISH_API_KEY=your-tinyfish-key-here

# OpenAI (required) — https://platform.openai.com/api-keys
OPENAI_API_KEY=your-openai-api-key
```

### Install & Run

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Project Structure

```
research-sentry/
├── app/
│   ├── layout.tsx
│   ├── page.tsx                          # Main UI
│   ├── globals.css
│   └── api/
│       ├── citations/track/route.ts      # Citation velocity analysis
│       ├── compare/route.ts              # Paper comparison
│       ├── conversation/route.ts         # Conversational follow-ups
│       ├── emails/extract/route.ts       # Author email extraction
│       ├── export/bibtex/route.ts        # BibTeX export
│       ├── health/route.ts               # Health check
│       ├── search/text/route.ts          # Text search
│       ├── search/voice/route.ts         # Voice search
│       └── summarize/route.ts            # Paper summarization
├── components/
│   ├── SearchInterface.tsx
│   ├── VoiceRecorder.tsx
│   ├── ResultsGrid.tsx
│   ├── PaperCard.tsx
│   ├── PaperComparison.tsx
│   ├── PaperSummary.tsx
│   ├── CitationTracker.tsx
│   ├── ConversationInterface.tsx
│   ├── CoPilotMode.tsx
│   ├── WorkflowSelector.tsx
│   ├── TinyFishAgentTerminal.tsx         # Live agent log display
│   ├── ErrorMessage.tsx
│   └── LoadingSpinner.tsx
├── hooks/
│   └── useVoiceCommands.ts
├── lib/
│   ├── tinyfish.ts                       # TinyFish agent client (typed errors)
│   ├── intent-parser.ts                  # OpenAI — query intent parsing
│   ├── summarizer.ts                     # OpenAI — paper summarization
│   ├── comparator.ts                     # OpenAI — paper comparison
│   ├── conversation.ts                   # OpenAI — conversational follow-ups
│   ├── citation-tracker.ts               # OpenAI — citation velocity
│   ├── whisper.ts                        # OpenAI Whisper — speech-to-text
│   ├── aggregator.ts                     # Deduplication & ranking
│   ├── search.ts                         # Multi-source search orchestration
│   ├── workflows.ts
│   ├── audio-utils.ts
│   ├── email-utils.ts
│   ├── pdf-utils.ts
│   └── types.ts
├── .env.example
└── package.json
```

## Constraint Checklist

| Constraint | Status |
|---|---|
| External database used? | NO (pure in-memory) |
| Scraping parallel? | YES (`Promise.allSettled` across 8 portals) |
| Bot-protected sites handled? | YES (Google Scholar + IEEE use `browser_profile: 'stealth'`) |
| SDK errors surfaced? | YES (typed `TinyFishError` with code — no silent `null` returns) |
| Voice input? | YES (OpenAI Whisper transcription) |
| BibTeX export? | YES |

## Tech Stack

- **Framework:** Next.js (App Router), TypeScript, Tailwind CSS
- **Browser Agents:** TinyFish SDK (`client.agent.stream`)
- **LLM:** OpenAI (gpt-4o-mini) + Speech-to-text: OpenAI Whisper
- **Icons:** Lucide React
- **Deployment:** Vercel
