# 🔍 Webtoon/Manga Availability Finder

**Live Demo:** [webtoonhunter.lovable.app](https://webtoonhunter.lovable.app)

---

## What is this?

Webtoon/Manga Availability Finder is an AI-powered manga/webtoon availability checker that searches multiple reading platforms simultaneously. It uses the TinyFish Web Agent API for real-time browser automation, deploying parallel browser agents to search and verify availability across multiple platforms.

---

## Demo

<!-- Replace with your demo gif/video -->

https://github.com/user-attachments/assets/7b3ef9be-d4ba-43be-b3b5-ed9ea246c591

---

## Code Snippet

```typescript
// Call TinyFish Web Agent API with SSE streaming for real-time browser automation

const response = await fetch("https://mino.ai/v1/automation/run-sse", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": process.env.MINO_API_KEY,
  },
  body: JSON.stringify({
    url,  // e.g., "https://mangadex.org/search?q=One+Piece"
    goal: `You are searching for a manga/webtoon called "${mangaTitle}"...
           STEP 1: Find and use the search bar to enter the title
           STEP 2: Analyze the search results for matches
           STEP 3: Return JSON with { found: boolean, match_confidence: string }`,
    stream: true,
  }),
});

// Stream SSE events back to client for live preview
const reader = response.body?.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  // Forward streamingUrl + completion events to frontend
}
```

---

## How to Run

### Prerequisites
- Node.js 18+
- Lovable Cloud account (or Supabase project)

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MINO_API_KEY` | TinyFish Web Agent [API key](https://mino.ai) | ✅ |
| `GEMINI_API_KEY` | API key from [Google AI Studio](https://makersuite.google.com) | ✅ |

### Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd webtoon-hunter

# 2. Install dependencies
npm install

# 3. Add secrets to your Lovable Cloud / Supabase project
# Navigate to Settings → Secrets and add:
#   - TinyFish Web Agent AI KEY
#   - GEMINI_API_KEY

# 4. Start development server
npm run dev
```

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User Interface                                  │
│                                                                             │
│  ┌─────────────┐    ┌──────────────────┐    ┌─────────────────────────────┐ │
│  │ SearchHero  │───▶│  useMangaSearch  │───▶│  AgentCard (x6 parallel)   │ │
│  │  Component  │    │      Hook        │    │  with Live Stream Preview   │ │
│  └─────────────┘    └──────────────────┘    └─────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Edge Functions (Supabase)                            │
│                                                                             │
│  ┌────────────────────────┐         ┌────────────────────────────────────┐  │
│  │  discover-manga-sites  │         │         search-manga (x6)          │  │
│  │  (1x per search)       │         │     (parallel browser agents)      │  │
│  │                        │         │                                    │  │
│  │  Gemini → Get site URLs│         │  TinyFish API → Browser Automation |  |
│  │  (+ fallback sites)    │         │  (SSE real-time streaming)         │  │
│  └────────────────────────┘         └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            External APIs                                     │
│                                                                             │
│  ┌────────────────────────┐         ┌────────────────────────────────────┐  │
│  │      Gemini API        │         │      TinyFish Web Agent API        │  │
│  │   (Site Discovery)     │         │    (Browser Automation + SSE)      │  │
│  │      Called: 1x        │         │       Called: 5-6x parallel        │  │
│  └────────────────────────┘         └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Flow Summary

1. **User enters manga title** → Client triggers search
2. **Gemini API** discovers 5-6 relevant manga site URLs (with fallback if rate-limited)
3. **TinyFish Web Agent API** deploys parallel browser agents to each site
4. **SSE Streaming** provides live browser preview URLs + real-time status updates
5. **Results** display which sites have the manga available

---

## Tech Stack

- **Frontend:** React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Supabase Edge Functions (Deno)
- **APIs:** TinyFish Web Agent (browser automation), Gemini (site discovery)
- **Streaming:** Server-Sent Events (SSE)

---

## License

MIT
