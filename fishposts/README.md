# FishPosts — AI Meme & Content Generator

**Live Demo: https://fishposts.up.railway.app/**

An AI-powered meme and content generator wrapped in a full Windows 98 desktop experience. Paste a URL or type a hot take — a TinyFish web agent literally browses the internet, reads the content, and generates memes or text content based on what it finds.

TinyFish powers the core automation: the agent navigates to target URLs, reads page content, browses Imgflip for templates, fills in captions, and generates memes — all via the SSE streaming API. A secondary Groq LLM step turns raw observations into polished text content for non-meme modes.

## Demo

https://github.com/user-attachments/assets/placeholder

> Boot sequence -> Login -> Pick a mode from Start menu -> Paste URL -> Watch the fish work -> Get your meme

## 9 Content Modes

| Mode | Input | Output | TinyFish Role |
|------|-------|--------|---------------|
| Site Roast | URL | Meme | Visits site, reads content, generates meme on Imgflip |
| Trend Roast | None | Meme | Browses Hacker News, picks a target, makes meme |
| Chaos Mode | Text | Meme | Random template + tone + your input |
| Plot Twist | Text | Meme | Generates plot twist meme |
| Quote Dunks | Text | 3 text dunks | Researches topic, Groq writes responses |
| Fish Dispatches | URL | Text | Visits URL, writes first-person dispatches |
| Unhinged Threads | Text | Thread | Researches topic, writes escalating thread |
| Corporate BS | Text | Translation | Translates corporate speak to plain English |
| Excuse Gen | Text | Win98 Error | Generates a Win98 error dialog as your excuse |

## TinyFish Integration

The core TinyFish client (`src/lib/tinyfish.ts`):

```typescript
export async function runAutomation(
  url: string,
  goal: string,
  onEvent: (event: TinyFishEvent) => void | Promise<void>,
): Promise<TinyFishEvent | null> {
  const res = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, goal }),
  });

  // Stream SSE events back to the client in real-time
  const reader = res.body.getReader();
  // ... parse SSE lines, forward PROGRESS/COMPLETE/ERROR events
}
```

The generate API route (`src/app/api/generate/route.ts`) calls `runAutomation` with mode-specific prompts and streams progress events to the frontend via SSE.

## Architecture

```
+---------------------------------------------------+
|  Browser (Next.js Client)                         |
|  Win98 Desktop UI -> SSE stream -> live progress  |
+-------------------------+-------------------------+
                          | POST /api/generate
                          v
+---------------------------------------------------+
|  Next.js API Route                                |
|  - Rate limiter (5 req/min/IP)                    |
|  - SSE streaming to client                        |
+---------+-------------+-------------+-------------+
          |             |             |
          v             v             v
+------------------+ +------------+ +---------------+
| TinyFish Fetch   | | Groq LLM   | | Imgflip API   |
| (Page Reading)   | | (Creative) | | (Meme Gen)    |
| - Renders URL    | | - Picks    | | - Template +  |
| - Returns clean  | |   template | |   text -> JPG |
|   markdown       | | - Writes   | | - Instant     |
| - Fallback to    | |   meme text| |   (<1 sec)    |
|   TinyFish agent | | - No filter| | - 2-5 box     |
+------------------+ +------------+ +---------------+
```

**Pipeline:** Fetch API reads page (~4s) -> Groq picks template + writes text -> Imgflip API generates image (<1s). Total: ~5-10 seconds.

Previously blocked topics (OpenAI, political figures) now work because the LLM guard only applied to TinyFish agent prompts, and creative writing moved entirely to Groq.

## Setup

### Prerequisites

- Node.js >= 20.9.0
- TinyFish API key ([tinyfish.ai](https://tinyfish.ai))
- Groq API key ([console.groq.com](https://console.groq.com)) — for text modes
- Imgflip account ([imgflip.com/signup](https://imgflip.com/signup)) — free, for meme generation

### Environment Variables

Create `.env.local`:

```env
TINYFISH_API_KEY=your-tinyfish-api-key
GROQ_API_KEY=your-groq-api-key
IMGFLIP_USERNAME=your-imgflip-username
IMGFLIP_PASSWORD=your-imgflip-password
```

### Run Locally

```bash
cd fishposts
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll see the Win98 boot sequence, then the desktop.

### Deploy

Configured for Railway with `output: "standalone"` in Next.js config. Set the environment variables in your deployment platform.

## Tech Stack

- **Framework:** Next.js 16 / React 19 / TypeScript
- **AI Agent:** TinyFish Web Agent (SSE streaming API)
- **LLM:** Groq (for text content generation)
- **Styling:** Custom CSS Win98 design system (no Tailwind)
- **Deployment:** Railway
