# Anime Watch Hub — TinyFish integration

This document describes how **Anime Watch Hub** uses the **TinyFish TypeScript SDK** (`@tiny-fish/sdk`) for parallel per-platform checks. The SDK’s `agent.stream()` call exposes the same **SSE event model** as the HTTP endpoint documented in [Run browser automation with SSE streaming](https://docs.tinyfish.ai/api-reference/automation/run-browser-automation-with-sse-streaming). The Next.js route forwards each event to the browser as `data: {...}\n\n`.

## Product Architecture Overview

Anime Watch Hub is an application that helps users find where a specific anime is available to stream across multiple platforms. The system uses a two-stage API orchestration pattern:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INPUT                                      │
│                         "Attack on Titan"                                    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                        STAGE 1: PLATFORM DISCOVERY                           │
│                           (OpenAI API - 1 call)                              │
│                                                                              │
│  Input: Anime title                                                          │
│  Output: Array of platform search URLs                                       │
│  Example: [                                                                  │
│    { id: "crunchyroll", searchUrl: "https://crunchyroll.com/search?q=..." } │
│    { id: "netflix", searchUrl: "https://netflix.com/search?q=..." }         │
│    ...6-8 platforms                                                          │
│  ]                                                                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    STAGE 2: PARALLEL AVAILABILITY CHECK                      │
│                (TinyFish SDK/Agent - 6-8 concurrent calls)                   │
│                                                                              │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌──────────────┐ │
│  │ TinyFish       │ │ TinyFish       │ │ TinyFish       │ │ TinyFish     │ │
│  │ Agent 1        │ │ Agent 2        │ │ Agent 3        │ │ Agent N      │ │
│  │ Crunchyroll    │ │ Netflix        │ │ Prime Video    │ │ ...          │ │
│  └────────────────┘ └────────────────┘ └────────────────┘ └──────────────┘ │
│         │                │                │                │                 │
│         ▼                ▼                ▼                ▼                 │
│      SSE Stream       SSE Stream       SSE Stream       SSE Stream           │
│         │                │                │                │                 │
└─────────│────────────────│────────────────│────────────────│─────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          AGGREGATED RESULTS                                  │
│                                                                              │
│  Platform        │ Available │ Watch URL                                     │
│  ────────────────│───────────│─────────────────────────────────────────────  │
│  Crunchyroll     │    ✓      │ https://crunchyroll.com/attack-on-titan      │
│  Netflix         │    ✓      │ https://netflix.com/title/12345              │
│  Prime Video     │    ✗      │ -                                            │
│  Hulu            │    ✓      │ https://hulu.com/series/attack-on-titan      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Call Summary

| Stage | API | Calls Per Search | Purpose |
|-------|-----|------------------|---------|
| 1 | OpenAI API | 1 | Generate platform-specific search URLs |
| 2 | TinyFish (SDK) | 6-8 (parallel) | Browse each platform and verify availability |

**Total API calls per search: 7-9 calls** (1 OpenAI + 6-8 TinyFish)

---

## API Relationships

### 1. OpenAI API (Platform Discovery)
- **When called**: Once at the start of each search
- **Purpose**: Generates intelligent search URLs for each streaming platform
- **Output feeds into**: TinyFish checks (provides URLs for browser automation)

### 2. TinyFish (Browser Automation)
- **When called**: Once per platform, all in parallel
- **Purpose**: Spawns browser agents that navigate to search URLs and verify anime availability
- **Depends on**: OpenAI API output (search URLs)
- **Returns**: Real-time SSE stream with browsing progress and final availability result

---

## Code Snippets

### TypeScript/Next.js Implementation

#### 1. Platform Discovery Route (`/api/discover-platforms`)

```typescript
// POST /api/discover-platforms
// Body: { animeTitle: "Attack on Titan" }

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const { animeTitle } = await request.json();
  const apiKey = process.env.OPENAI_API_KEY;

  const prompt = `For the anime titled "${animeTitle}", provide streaming platform URLs...`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Return only valid JSON." },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  const data = await response.json();
  const platforms = JSON.parse(data.choices[0].message.content);

  return NextResponse.json({ platforms });
}
```

#### 2. TinyFish Browser Automation Route (`/api/check-platform`)

```typescript
// POST /api/check-platform
// Body: { animeTitle, platformName, searchUrl }
// Returns: Server-Sent Events (SSE) stream

import { NextRequest } from 'next/server';
import { TinyFish } from '@tiny-fish/sdk';

export async function POST(request: NextRequest) {
  const { animeTitle, platformName, searchUrl } = await request.json();
  const apiKey = process.env.TINYFISH_API_KEY;

  const goal = `You are checking if the anime "${animeTitle}" is available to stream on ${platformName}.

STEP 1 - HANDLE POPUPS/MODALS:
If there are any cookie consent banners, login prompts, or promotional popups, dismiss them by clicking "Accept", "Close", "X", or "Continue".

STEP 2 - SEARCH FOR THE ANIME:
The page should already be on a search results page or the search has been initiated.
If there's a search box visible, search for: "${animeTitle}"

STEP 3 - ANALYZE SEARCH RESULTS:
Look at the search results carefully:
- Check if "${animeTitle}" or a very close match appears in the results
- Look for anime thumbnails, titles, and descriptions
- Verify it's the anime series, not just related content

STEP 4 - RETURN RESULT:
Return a JSON object with these fields:
{
  "available": true/false,
  "watchUrl": "URL to watch the anime if found",
  "subscriptionRequired": true/false,
  "message": "Brief description of what you found"
}

If the anime is NOT found or not available, set available to false and explain why in the message.`;

  const client = new TinyFish({ apiKey });

  const stream = await client.agent.stream({ url: searchUrl, goal });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
        }
      } catch (e) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: 'ERROR', message: 'Stream interrupted' })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

#### 3. Client-Side Orchestration

```typescript
// Orchestrate parallel TinyFish calls from the client
async function searchAnime(animeTitle: string) {
  // Step 1: Get platform URLs from OpenAI (GPT-4o Mini)
  const discoverResponse = await fetch('/api/discover-platforms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ animeTitle }),
  });

  const { platforms } = await discoverResponse.json();

  // Step 2: Check all platforms in parallel with TinyFish
  await Promise.all(
    platforms.map((platform) => checkPlatformWithSSE(animeTitle, platform))
  );
}

async function checkPlatformWithSSE(
  animeTitle: string,
  platform: { id: string; name: string; searchUrl: string }
) {
  const response = await fetch('/api/check-platform', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      animeTitle,
      platformName: platform.name,
      searchUrl: platform.searchUrl,
    }),
  });

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = JSON.parse(line.slice(6));

      if (data.type === 'STREAMING_URL' && data.streaming_url) {
        console.log('Live view:', data.streaming_url);
      }
      if (data.type === 'PROGRESS' && data.purpose) {
        console.log('Progress:', data.purpose);
      }
      if (data.type === 'COMPLETE' && data.status === 'COMPLETED') {
        console.log('Result:', data.result);
      }
    }
  }
}
```

### cURL Examples

#### 1. Discover Platforms (OpenAI)

```bash
curl -X POST https://your-app.vercel.app/api/discover-platforms \
  -H "Content-Type: application/json" \
  -d '{"animeTitle": "Attack on Titan"}'
```

#### 2. Check Single Platform (TinyFish)

```bash
curl -X POST https://your-app.vercel.app/api/check-platform \
  -H "Content-Type: application/json" \
  -d '{
    "animeTitle": "Attack on Titan",
    "platformName": "Crunchyroll",
    "searchUrl": "https://www.crunchyroll.com/search?q=attack+on+titan"
  }'
```

#### 3. Direct TinyFish API Call (Alternative to SDK)

```bash
curl -X POST https://agent.tinyfish.ai/v1/automation/run-sse \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_TINYFISH_API_KEY" \
  -d '{
    "url": "https://www.crunchyroll.com/search?q=attack+on+titan",
    "goal": "Check if Attack on Titan is available on this platform..."
  }'
```

---

## Goal (Prompt)

The following is the exact natural language prompt sent to TinyFish browser automation for each platform check:

```
You are checking if the anime "${animeTitle}" is available to stream on ${platformName}.

STEP 1 - HANDLE POPUPS/MODALS:
If there are any cookie consent banners, login prompts, or promotional popups, dismiss them by clicking "Accept", "Close", "X", or "Continue".

STEP 2 - SEARCH FOR THE ANIME:
The page should already be on a search results page or the search has been initiated.
If there's a search box visible, search for: "${animeTitle}"

STEP 3 - ANALYZE SEARCH RESULTS:
Look at the search results carefully:
- Check if "${animeTitle}" or a very close match appears in the results
- Look for anime thumbnails, titles, and descriptions
- Verify it's the anime series, not just related content

STEP 4 - RETURN RESULT:
Return a JSON object with these fields:
{
  "available": true/false,
  "watchUrl": "URL to watch the anime if found",
  "subscriptionRequired": true/false,
  "message": "Brief description of what you found"
}

If the anime is NOT found or not available, set available to false and explain why in the message.
If you encounter a geo-restriction or region block, mention that in the message.
```

**Prompt Variables:**
- `${animeTitle}` - The anime being searched (e.g., "Attack on Titan")
- `${platformName}` - The streaming platform name (e.g., "Crunchyroll")

---

## Sample Output

### OpenAI API Response (Platform Discovery)

```json
{
  "platforms": [
    {
      "id": "crunchyroll",
      "name": "Crunchyroll",
      "searchUrl": "https://www.crunchyroll.com/search?q=attack+on+titan"
    },
    {
      "id": "netflix",
      "name": "Netflix",
      "searchUrl": "https://www.netflix.com/search?q=attack%20on%20titan"
    },
    {
      "id": "prime",
      "name": "Prime Video",
      "searchUrl": "https://www.amazon.com/s?k=attack+on+titan&i=instant-video"
    },
    {
      "id": "hulu",
      "name": "Hulu",
      "searchUrl": "https://www.hulu.com/search?q=attack+on+titan"
    },
    {
      "id": "funimation",
      "name": "Funimation",
      "searchUrl": "https://www.funimation.com/search/?q=attack+on+titan"
    },
    {
      "id": "hidive",
      "name": "HIDIVE",
      "searchUrl": "https://www.hidive.com/search?q=attack+on+titan"
    }
  ]
}
```

### TinyFish SSE stream (via SDK or `/v1/automation/run-sse`)

Events are JSON objects with a `type` field. Typical order: `STARTED` → optional `STREAMING_URL` → repeated `PROGRESS` → `COMPLETE`. See the [official SSE reference](https://docs.tinyfish.ai/api-reference/automation/run-browser-automation-with-sse-streaming).

Example sequence (simplified):

```
data: {"type":"STARTED","run_id":"run_123","timestamp":"..."}

data: {"type":"STREAMING_URL","run_id":"run_123","streaming_url":"https://...","timestamp":"..."}

data: {"type":"PROGRESS","run_id":"run_123","purpose":"Dismissing cookie banner...","timestamp":"..."}

data: {"type":"COMPLETE","run_id":"run_123","status":"COMPLETED","result":{"available":true,"watchUrl":"https://www.crunchyroll.com/series/attack-on-titan","subscriptionRequired":true,"message":"..."},"timestamp":"..."}
```

### Parsed final result (inside `COMPLETE`)

The UI reads `data.result` when `type === "COMPLETE"` and `status === "COMPLETED"`:

```json
{
  "available": true,
  "watchUrl": "https://www.crunchyroll.com/series/attack-on-titan",
  "subscriptionRequired": true,
  "message": "Attack on Titan is available on Crunchyroll."
}
```

### Failure example

```
data: {"type":"COMPLETE","run_id":"run_456","status":"FAILED","error":"...","timestamp":"..."}
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `OPENAI_API_KEY` | OpenAI API key for platform URL discovery (gpt-4o-mini) |
| `TINYFISH_API_KEY` | TinyFish API key for browser automation |

---

## Error Handling

### OpenAI API Errors
- **429 Rate Limit**: Implements retry with exponential backoff and model fallback (gpt-4o-mini with exponential backoff)
- **Invalid JSON**: Attempts to extract and repair truncated JSON responses

### TinyFish / SDK errors
- **Stream errors**: The route catches failures and emits `{ type: "ERROR", message: "..." }` when the stream cannot complete; the client maps that to an error state.
- **Per-platform isolation**: One platform failing does not cancel the others (`Promise.all` still resolves; failed agents show `error` status).
- **Reference**: [Run browser automation with SSE streaming](https://docs.tinyfish.ai/api-reference/automation/run-browser-automation-with-sse-streaming)

---

## TypeScript types (app)

`TinyFishAgentState` lives in `lib/types.ts` and drives the per-platform cards. Platform rows from OpenAI are shaped as `{ id, name, searchUrl }` in `hooks/use-anime-search.ts` (not exported from `lib/types`).

```typescript
interface TinyFishAgentState {
  platformId: string;
  platformName: string;
  url: string;
  status: 'idle' | 'connecting' | 'browsing' | 'complete' | 'error';
  streamingUrl?: string;
  statusMessage?: string;
  result?: {
    available: boolean;
    watchUrl?: string;
    subscriptionRequired?: boolean;
    region?: string;
    message?: string;
  };
}
```
