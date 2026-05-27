# DataScout

**Live:** [https://dataset-finder.vercel.app](https://dataset-finder.vercel.app)

DataScout is an AI-powered dataset discovery tool that helps researchers, data scientists, and developers find the right datasets for their projects. Enter a topic or problem domain, and DataScout dispatches parallel web agents — one per dataset source — that navigate documentation pages, GitHub repos, HuggingFace cards, and data portals to extract structured metadata cards with accessibility ratings, data specifications, and usability assessments.

## Demo

https://github.com/user-attachments/assets/aad6bbe9-2cc1-4ddf-b520-044c9018b0e9

## TinyFish API Usage

The app uses Google Gemini to discover relevant datasets, then calls the TinyFish SDK once per dataset in parallel. Each agent navigates to the dataset's source page, inspects documentation, and returns a structured JSON metadata card:

```typescript
import { TinyFish } from "@tiny-fish/sdk";

const client = new TinyFish(); // Reads TINYFISH_API_KEY from environment

const stream = await client.agent.stream({
  url: "https://huggingface.co/datasets/imdb",
  goal: `You are extracting user-facing metadata for the dataset "IMDB Reviews"
         to help users decide if this dataset is right for them.

         GOAL: Create a simple, factual dataset card.

         INSPECTION RULES:
         - Use the FIRST accessible authoritative source, then STOP.
         - If blocked (CAPTCHA, login wall, 403), try next source.
         - Report ONLY what you can directly observe on the page.

         EXTRACT: description, best_for, data_type, source, access method,
         columns, coverage, frequency, size, notes, status, usability_risk.

         Return as structured JSON.`,
});

for await (const event of stream) {
  // Events include:
  // • streaming_url → live browser preview (iframe)
  // • STATUS       → agent progress updates
  // • COMPLETE     → structured dataset metadata JSON
  // • ERROR        → failure message
  console.log(event);
}
```

Each agent streams SSE events including a `streaming_url` for live browser preview and a final result with the extracted dataset card JSON.

## How to Run

### Prerequisites

- Node.js 18+
- A TinyFish API key ([get one here](https://tinyfish.ai))
- A Google Gemini API key ([get one here](https://aistudio.google.com/apikey))

### Setup

1. Install dependencies:

```bash
cd dataset-finder
pnpm install
```

2. Create a `.env.local` file with your API keys:

```
TINYFISH_API_KEY=your_tinyfish_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

3. Start the dev server:

```bash
pnpm dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      User (Browser)                          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │     Next.js Frontend (Tailwind + shadcn/ui)            │  │
│  │                                                        │  │
│  │  1. Enter topic (e.g., "stock prices", "DNA seq")      │  │
│  │  2. Select use case (ML, Research, Viz, General)       │  │
│  │  3. Click "Run Scan"                                   │  │
│  │  4. Watch live browser previews as agents research     │  │
│  │  5. View sorted dataset cards with metadata            │  │
│  └──────────┬─────────────────────┬───────────────────────┘  │
└─────────────┼─────────────────────┼──────────────────────────┘
              │                     │
   POST /api/discover-datasets      │  POST /api/analyze-dataset (x N, parallel)
              │                     │
              ▼                     ▼
┌──────────────────────┐  ┌────────────────────────────────────┐
│   Google Gemini API  │  │   TinyFish SDK (agent.stream())    │
│                      │  │                                    │
│  Receives topic +    │  │  Receives dataset URL + goal       │
│  use case            │  │  Spins up a web agent per dataset  │
│                      │  │                                    │
│  Returns 6-8 dataset │  │  SSE Stream Events:                │
│  suggestions with    │  │   • streaming_url → live preview   │
│  source URLs         │  │   • STATUS → progress updates      │
│                      │  │   • COMPLETE → dataset card JSON   │
│                      │  │   • ERROR → failure message        │
└──────────────────────┘  └────┬──────────┬──────────┬─────────┘
                               │          │          │
                               ▼          ▼          ▼
                         ┌──────────┐ ┌──────────┐ ┌──────────┐
                         │ HuggingFace│ │  GitHub  │ │   UCI    │ ... (6-8 sources)
                         │ Dataset  │ │  README  │ │  Portal  │
                         │ Card     │ │          │ │          │
                         └──────────┘ └──────────┘ └──────────┘
```

## Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS 4, shadcn/ui
- **AI Discovery:** Google Gemini API (dataset suggestions)
- **Web Agents:** TinyFish SDK (parallel dataset inspection)
- **Deployment:** Vercel
