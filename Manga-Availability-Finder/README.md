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
// Supabase Edge Function uses TinyFish SDK streaming under the hood
// and forwards a simplified SSE stream to the frontend:
//   - { type: "stream", streamingUrl }
//   - { type: "complete", found }
//   - { type: "error", error }

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
| `TINYFISH_API_KEY` | TinyFish API key from `agent.tinyfish.ai/api-keys` | ✅ |
| `GEMINI_API_KEY` | API key from [Google AI Studio](https://makersuite.google.com) | ⚠️ (fallback sites used if missing) |
| `PORT` | Local API server port (default: 8787) | ❌ |

### Setup

```bash
# 1. Clone the repository
git clone <your-repo-url>
cd webtoon-hunter

# 2. Install dependencies
npm install

# 3. Create Manga-Availability-Finder/.env.local
# Copy Manga-Availability-Finder/.env.example and fill in keys:
#   - TINYFISH_API_KEY
#   - (optional) GEMINI_API_KEY

# 4. Start development server (runs both the Vite app + local API)
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
