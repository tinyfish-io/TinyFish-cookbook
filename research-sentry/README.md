# Research Sentry

**A voice-first academic research co-pilot** that scans live portals (ArXiv, PubMed, Semantic Scholar, IEEE Xplore, Google Scholar, SSRN, CORE, DOAJ) to assemble verified paper metadata and summaries. It uses the **TinyFish Web Agent** to automate multi-step portal navigation and extract structured results in real time.

Live: https://cookbook-research-sentry.vercel.app/

Demo video: https://cookbook-research-sentry.vercel.app/

---

## How It Works

1. **Voice / text input** -- speak or type your research query.
2. **GPT-4o parses intent** -- OpenAI extracts topic, keywords, and target sources from your query.
3. **TinyFish agents scrape 8 academic portals in parallel** -- each portal gets its own headless browser session via the TinyFish API.
4. **Results aggregated & deduplicated** -- papers from every source are merged, normalized, and ranked by citation count.
5. **Summarize, compare, export** -- ask follow-up questions, compare papers side-by-side, track citations, or export BibTeX.

---

## Key Features

- **Voice input** -- record a question and Whisper transcribes it into a search query.
- **Multi-source search** -- scrapes ArXiv, PubMed, Semantic Scholar, Google Scholar, IEEE Xplore, SSRN, CORE, and DOAJ simultaneously.
- **Paper comparison** -- select papers and get a structured methodology/results comparison via GPT-4o.
- **Citation tracking** -- monitor a paper's citation velocity and predicted impact.
- **BibTeX export** -- download selected papers as a `.bib` file.
- **Conversational follow-ups** -- ask the AI assistant questions about your results.

---

## TinyFish API Usage

The core integration lives in `lib/tinyfish.ts`. Here is the SSE call that drives every search:

```ts
const res = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "X-API-Key": process.env.TINYFISH_API_KEY!,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url,
    goal,
    browser_profile: stealth ? "stealth" : "lite",
  }),
});

// Parse the SSE stream
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buffer = "";
let result = null;

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  buffer += decoder.decode(value, { stream: true });
  const lines = buffer.split("\n");
  buffer = lines.pop() || "";
  for (const line of lines) {
    if (line.startsWith("data: ")) {
      const event = JSON.parse(line.slice(6));
      if (event.type === "COMPLETE") result = event.resultJson;
    }
  }
}
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Web scraping | TinyFish API (SSE) |
| LLM | OpenAI GPT-4o |
| Speech-to-text | OpenAI Whisper |
| Styling | Tailwind CSS |
| Icons | Lucide React |

---

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Create your env file
cp .env.local.example .env.local

# 3. Add your API keys to .env.local
#    TINYFISH_API_KEY  -- get one at https://tinyfish.ai
#    OPENAI_API_KEY    -- get one at https://platform.openai.com

# 4. Start the dev server
npm run dev
```

Open http://localhost:3000 to use the app.

---

## Folder Structure

```
research-sentry/
├── app/
│   ├── api/
│   │   ├── citations/track/route.ts   # Citation velocity analysis
│   │   ├── compare/route.ts           # Paper comparison endpoint
│   │   ├── conversation/route.ts      # Conversational follow-ups
│   │   ├── emails/extract/route.ts    # Author email extraction
│   │   ├── export/bibtex/route.ts     # BibTeX export
│   │   ├── health/route.ts            # Health check
│   │   ├── search/text/route.ts       # Text search endpoint
│   │   ├── search/voice/route.ts      # Voice search endpoint
│   │   └── summarize/route.ts         # Paper summarization
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx                       # Main UI
├── components/
│   ├── CitationTracker.tsx
│   ├── ConversationInterface.tsx
│   ├── CoPilotMode.tsx
│   ├── ErrorMessage.tsx
│   ├── LoadingSpinner.tsx
│   ├── PaperCard.tsx
│   ├── PaperComparison.tsx
│   ├── PaperSummary.tsx
│   ├── ResultsGrid.tsx
│   ├── SearchInterface.tsx
│   ├── TinyFishAgentTerminal.tsx      # Live agent log display
│   ├── VoiceRecorder.tsx
│   └── WorkflowSelector.tsx
├── hooks/
│   └── useVoiceCommands.ts
├── lib/
│   ├── aggregator.ts                  # Deduplication & ranking
│   ├── audio-utils.ts
│   ├── citation-tracker.ts
│   ├── comparator.ts
│   ├── conversation.ts
│   ├── email-utils.ts
│   ├── intent-parser.ts              # GPT-4o query parsing
│   ├── pdf-utils.ts
│   ├── search.ts                     # Multi-source search engine
│   ├── summarizer.ts
│   ├── tinyfish.ts                   # TinyFish SSE client
│   ├── types.ts
│   └── workflows.ts
└── .env.local.example
```

---

## Architecture

```mermaid
graph TD
  User((User)) -->|Voice/Text| UI[Search Interface]
  UI -->|Intent| Parser[Intent Parser GPT-4o]
  Parser -->|Plan| Engine[Search Engine]
  Engine -->|Dispatch| Agent1[TinyFish Agent: ArXiv]
  Engine -->|Dispatch| Agent2[TinyFish Agent: PubMed]
  Engine -->|Dispatch| Agent3[TinyFish Agent: Scholar]
  Agent1 -->|Scraping| Web[Live Web DOM]
  Agent2 -->|Scraping| Web
  Agent3 -->|Scraping| Web
  Web -->|Result| Aggregator[Synthesis & Deduplication]
  Aggregator -->|JSON Payload| UI
  UI -->|Visuals| Terminal[Live Log Terminal]
```
