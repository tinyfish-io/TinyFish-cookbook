# Mino API Integration Documentation

## Product Architecture Overview

This application is a **Manga/Webtoon Finder** that uses AI-powered browser automation to search for manga availability across multiple websites simultaneously.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Client (React)                                  │
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
│  │  (Called: 1x)          │         │         (Called: 6x parallel)      │  │
│  │                        │         │                                    │  │
│  │  Gemini API → Get URLs │         │  Mino API → Browser Automation     │  │
│  │  (with fallback sites) │         │  (SSE Streaming)                   │  │
│  └────────────────────────┘         └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                            External APIs                                     │
│                                                                             │
│  ┌────────────────────────┐         ┌────────────────────────────────────┐  │
│  │      Gemini API        │         │           Mino API                 │  │
│  │  (Site Discovery)      │         │    (Browser Automation + SSE)      │  │
│  └────────────────────────┘         └────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Call Summary

| API | Purpose | Calls per Search | Response Type |
|-----|---------|------------------|---------------|
| Gemini API | Discover manga reading sites | 1x | JSON |
| Mino API | Automate browser search on each site | 5-6x (parallel) | SSE Stream |

### Orchestration Flow

1. **User enters manga title** → Client triggers `useMangaSearch.search(title)`
2. **Site Discovery** → `discover-manga-sites` edge function calls Gemini API (or uses fallback)
3. **Agent Initialization** → Client creates 5-6 agent cards in "idle" state
4. **Parallel Browser Automation** → `search-manga` edge function called for each site simultaneously
5. **Real-time Updates** → Mino SSE stream provides live browser preview URL + final result
6. **Results Display** → Each agent card updates independently as results arrive

---

## Code Snippets

### 1. Calling the Mino API (Edge Function)

```typescript
// supabase/functions/search-manga/index.ts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { url, mangaTitle } = await req.json();
  const MINO_API_KEY = Deno.env.get("MINO_API_KEY");

  // Define the automation goal (see Goal section below)
  const goal = `You are searching for a manga/webtoon called "${mangaTitle}"...`;

  // Call Mino API with SSE streaming
  const response = await fetch("https://mino.ai/v1/automation/run-sse", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": MINO_API_KEY,
    },
    body: JSON.stringify({
      url,           // Starting URL (e.g., mangadex.org/search?q=One+Piece)
      goal,          // Natural language instruction for the browser agent
      timeout: 60000 // Maximum execution time in milliseconds
    }),
  });

  // Stream SSE events back to client
  // ... (see full implementation below)
});
```

### 2. Client-Side SSE Consumption

```typescript
// src/hooks/useMangaSearch.ts

const searchSite = async (agent: SiteAgent, title: string) => {
  const response = await fetch(`${supabaseUrl}/functions/v1/search-manga`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseKey}`,
      "apikey": supabaseKey,
    },
    body: JSON.stringify({ url: agent.siteUrl, mangaTitle: title }),
  });

  // Handle SSE stream
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");

    for (const line of lines) {
      if (line.startsWith("data: ")) {
        const data = JSON.parse(line.slice(6));

        // Handle streaming URL for live preview
        if (data.type === "stream" && data.streamingUrl) {
          updateAgent(agent.id, { 
            streamingUrl: data.streamingUrl,
            statusMessage: "Agent browsing..." 
          });
        }

        // Handle completion
        if (data.type === "complete") {
          updateAgent(agent.id, {
            status: data.found ? "found" : "not_found",
            statusMessage: data.found 
              ? "Manga found on this site!" 
              : "Not available on this site",
          });
        }
      }
    }
  }
};
```

### 3. cURL Example

```bash
curl -X POST "https://mino.ai/v1/automation/run-sse" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_MINO_API_KEY" \
  -d '{
    "url": "https://mangadex.org/search?q=One%20Piece",
    "goal": "You are searching for a manga/webtoon called \"One Piece\" on this website...",
    "timeout": 60000
  }'
```

---

## Goal (Prompt)

The following natural language prompt is sent to the Mino API to instruct the browser automation agent:

```
You are searching for a manga/webtoon called "${mangaTitle}" on this website.

STEP 1 - NAVIGATION:
If there's a search bar or search input, enter "${mangaTitle}" and submit the search.
If there's no search bar visible, look for a search icon or link to a search page.

STEP 2 - ANALYZE RESULTS:
Look at the search results or page content carefully.
Check if "${mangaTitle}" appears in the results (exact match or very close match).

STEP 3 - RETURN RESULT:
Return a JSON object:
{
  "found": true or false,
  "manga_title": "${mangaTitle}",
  "site_url": "current page URL",
  "match_confidence": "high" or "medium" or "low",
  "notes": "brief explanation of what you found or didn't find"
}

IMPORTANT: Only return "found": true if you see a clear match for "${mangaTitle}" in the results.
```

### Prompt Design Principles

| Principle | Application |
|-----------|-------------|
| **Structured Steps** | Breaks down the task into clear navigation → analysis → output phases |
| **Fallback Handling** | Accounts for sites without visible search bars |
| **Strict Matching** | Prevents false positives by requiring exact/close matches |
| **JSON Output** | Ensures machine-parseable response for automation |

---

## Sample Output

### SSE Stream Events

The Mino API returns Server-Sent Events (SSE) during execution. Here's the sequence:

#### Event 1: Streaming URL (Immediate)

```json
data: {
  "type": "STREAM_URL",
  "streamingUrl": "https://stream.mino.ai/session/abc123xyz"
}
```

This URL can be embedded in an iframe to show **live browser automation** in real-time.

#### Event 2: Progress Updates (During Execution)

```json
data: {
  "type": "PROGRESS",
  "step": "Entering search query...",
  "screenshot": "base64_encoded_screenshot_data"
}
```

```json
data: {
  "type": "PROGRESS", 
  "step": "Analyzing search results...",
  "screenshot": "base64_encoded_screenshot_data"
}
```

#### Event 3: Completion (Final Result)

```json
data: {
  "type": "COMPLETE",
  "resultJson": {
    "found": true,
    "manga_title": "One Piece",
    "site_url": "https://mangadex.org/title/a1c7c817-4e59-43b7-9365-09675a149a6f/one-piece",
    "match_confidence": "high",
    "notes": "Found 'One Piece' by Eiichiro Oda with 1100+ chapters available"
  },
  "duration": 12453
}
```

### Processed Client Events

The edge function transforms Mino events into simplified client events:

```json
// Live preview available
data: {"type": "stream", "streamingUrl": "https://stream.mino.ai/session/abc123xyz"}

// Search complete - manga found
data: {"type": "complete", "found": true}

// Search complete - manga not found
data: {"type": "complete", "found": false}

// Error occurred
data: {"type": "error", "error": "Search failed"}
```

---

## Error Handling

### Rate Limiting (Gemini API)

When Gemini API returns `429 Too Many Requests`, the system falls back to predefined sites:

```typescript
const defaultSites = [
  { name: "MangaDex", url: `https://mangadex.org/search?q=${encodedTitle}` },
  { name: "MangaKakalot", url: `https://mangakakalot.com/search/story/${encodedTitle}` },
  { name: "MangaReader", url: `https://mangareader.to/search?keyword=${encodedTitle}` },
  { name: "Webtoon", url: `https://www.webtoons.com/en/search?keyword=${encodedTitle}` },
  { name: "Manganato", url: `https://manganato.com/search/story/${encodedTitle}` },
  { name: "Tapas", url: `https://tapas.io/search?q=${encodedTitle}` },
];
```

### Mino API Errors

```typescript
if (data.type === "ERROR") {
  const event = `data: ${JSON.stringify({ 
    type: "error", 
    error: data.message || "Search failed" 
  })}\n\n`;
  controller.enqueue(encoder.encode(event));
}
```

---

## Environment Variables

| Variable | Purpose | Where Used |
|----------|---------|------------|
| `MINO_API_KEY` | Authenticate with Mino API | `search-manga` edge function |
| `GEMINI_API_KEY` | Authenticate with Gemini API | `discover-manga-sites` edge function |

---

## Quick Start

1. **Set up secrets** in your Supabase/Lovable Cloud project:
   - `MINO_API_KEY` - Get from [mino.ai](https://mino.ai)
   - `GEMINI_API_KEY` - Get from [Google AI Studio](https://makersuite.google.com)

2. **Deploy edge functions** (automatic in Lovable)

3. **Test the flow**:
   ```typescript
   import { useMangaSearch } from "@/hooks/useMangaSearch";
   
   const { search, agents, isSearching } = useMangaSearch();
   
   // Trigger search
   search("One Piece");
   
   // agents array updates in real-time with status and streamingUrl
   ```

---

## Architecture Diagram (Mermaid)

```mermaid
sequenceDiagram
    participant User
    participant Client as React Client
    participant Discover as discover-manga-sites
    participant Search as search-manga (x6)
    participant Gemini as Gemini API
    participant Mino as Mino API

    User->>Client: Enter "One Piece"
    Client->>Discover: POST /discover-manga-sites
    Discover->>Gemini: Generate site URLs
    Gemini-->>Discover: [MangaDex, MangaKakalot, ...]
    Discover-->>Client: { sites: [...] }
    
    par Parallel searches
        Client->>Search: POST /search-manga (MangaDex)
        Search->>Mino: run-sse (MangaDex URL)
        Mino-->>Search: SSE: streamingUrl
        Search-->>Client: SSE: {type: "stream", streamingUrl}
        Mino-->>Search: SSE: COMPLETE
        Search-->>Client: SSE: {type: "complete", found: true}
    and
        Client->>Search: POST /search-manga (MangaKakalot)
        Search->>Mino: run-sse (MangaKakalot URL)
        Mino-->>Search: SSE: streamingUrl
        Search-->>Client: SSE: {type: "stream", streamingUrl}
        Mino-->>Search: SSE: COMPLETE
        Search-->>Client: SSE: {type: "complete", found: false}
    end
    
    Client->>User: Display results with live previews
```
