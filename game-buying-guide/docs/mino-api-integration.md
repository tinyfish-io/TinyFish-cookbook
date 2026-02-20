# GamePulse - Mino API Integration Documentation

## Product Architecture Overview

GamePulse is a game purchase decision tool that helps users determine whether to buy a game now or wait for a better deal. The system analyzes pricing across 10 gaming platforms in parallel using Mino autonomous browser agents.

### System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                  │
│                         (Next.js React Frontend)                            │
│                                                                             │
│   ┌──────────────┐                           ┌─────────────────────────┐   │
│   │ Search Form  │ ────── Game Title ──────► │    Agent Grid View      │   │
│   │              │                           │  (10 Live Agent Cards)  │   │
│   └──────────────┘                           └─────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      NEXT.JS API ROUTES (Internal)                          │
│                                                                             │
│   ┌────────────────────────────┐    ┌────────────────────────────────────┐ │
│   │  /api/discover-platforms   │    │     /api/analyze-platform          │ │
│   │                            │    │                                    │ │
│   │  - Receives game title     │    │  - Receives platform + URL         │ │
│   │  - Uses CURATED LIST of    │    │  - Calls Mino API (SSE)            │ │
│   │    10 gaming platforms     │    │  - Streams live browser preview    │ │
│   │  - Generates search URLs   │    │  - Returns structured analysis     │ │
│   │  - NO external API calls   │    │                                    │ │
│   │                            │    │  Called: 10x per search (parallel) │ │
│   │  Called: 1x per search     │    │                                    │ │
│   └────────────────────────────┘    └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                                        │
                                                        ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL API (Mino Only)                                 │
│                                                                             │
│   ┌─────────────────────────────────────────────────────────────────────┐  │
│   │                         MINO API                                     │  │
│   │                                                                      │  │
│   │   Endpoint: POST https://mino.ai/v1/automation/run-sse              │  │
│   │   Auth: X-API-Key header                                            │  │
│   │   Response: Server-Sent Events (SSE) stream                         │  │
│   │                                                                      │  │
│   │   Provides:                                                          │  │
│   │   - Live browser session URL for real-time preview                  │  │
│   │   - Status updates as agent navigates                               │  │
│   │   - Final structured JSON result with pricing analysis              │  │
│   └─────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Call Summary

| API | Purpose | Calls per Search | External? |
|-----|---------|------------------|-----------|
| `/api/discover-platforms` | Generate platform URLs from curated list | 1 | No (internal logic) |
| `/api/analyze-platform` | Proxy to Mino API | 10 (parallel) | Yes (Mino) |
| `mino.ai/v1/automation/run-sse` | Browser automation | 10 (parallel) | Yes |

**Note:** The only external API used is **Mino**. Platform discovery uses a hardcoded curated list of trusted gaming stores - no AI/LLM API is called for this step.

### Curated Platform List

The following 10 platforms are checked for every game search:

1. **Steam** - `store.steampowered.com`
2. **Epic Games Store** - `store.epicgames.com`
3. **GOG** - `gog.com`
4. **PlayStation Store** - `store.playstation.com`
5. **Xbox Store** - `xbox.com`
6. **Nintendo eShop** - `nintendo.com`
7. **Humble Bundle** - `humblebundle.com`
8. **Green Man Gaming** - `greenmangaming.com`
9. **Fanatical** - `fanatical.com`
10. **CDKeys** - `cdkeys.com`

### Orchestration Flow

1. **User submits game title** (e.g., "Elden Ring")
2. **Platform URL Generation**: Internal API generates 10 search URLs from curated platform list (no external API call)
3. **Parallel Mino Agent Launch**: Frontend simultaneously calls `/api/analyze-platform` for all 10 platforms
4. **Mino SSE Streaming**: Each API route opens an SSE connection to Mino, forwarding:
   - `STREAMING_URL` - Live browser preview URL
   - `STATUS` - Navigation progress updates
   - `COMPLETE` - Final analysis result
5. **Live UI Updates**: Agent cards display real-time browser previews and status
6. **Results Dashboard**: Aggregated recommendations shown when all agents complete

---

## Code Snippets

### cURL Example

```bash
# Call the Mino API directly
curl -X POST "https://mino.ai/v1/automation/run-sse" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_MINO_API_KEY" \
  -d '{
    "url": "https://store.steampowered.com/search/?term=Elden%20Ring",
    "goal": "Analyze this game store page and return pricing information as JSON...",
    "timeout": 300000
  }'
```

### TypeScript Implementation (Next.js API Route)

```typescript
// /app/api/analyze-platform/route.ts
import { NextResponse } from 'next/server'

export const maxDuration = 300 // Allow 5 minute streaming responses

export async function POST(request: Request) {
  const { platformName, url, gameTitle } = await request.json()
  const MINO_API_KEY = process.env.MINO_API_KEY

  // Construct the goal prompt (see Goal section below)
  const goal = buildAnalysisGoal(platformName, url, gameTitle)

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const abortController = new AbortController()
      const timeoutId = setTimeout(() => abortController.abort(), 300000)

      try {
        // Call Mino API with SSE streaming
        const response = await fetch('https://mino.ai/v1/automation/run-sse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': MINO_API_KEY,
          },
          body: JSON.stringify({
            url,
            goal,
            timeout: 300000,
          }),
          signal: abortController.signal,
        })

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = JSON.parse(line.slice(6))

              // Forward streaming URL for live preview
              if (data.streamingUrl) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: 'STREAMING_URL', 
                    streamingUrl: data.streamingUrl 
                  })}\n\n`)
                )
              }

              // Forward status updates
              if (data.message) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: 'STATUS', 
                    message: data.message 
                  })}\n\n`)
                )
              }

              // Forward completion with result
              if (data.type === 'COMPLETE' && data.result) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ 
                    type: 'COMPLETE', 
                    result: data.result 
                  })}\n\n`)
                )
              }
            }
          }
        }

        clearTimeout(timeoutId)
        controller.close()
      } catch (error) {
        clearTimeout(timeoutId)
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ 
            type: 'ERROR', 
            error: error.message 
          })}\n\n`)
        )
        controller.close()
      }
    },
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
```

### Python Example

```python
import requests
import json
import sseclient

MINO_API_KEY = "your_api_key_here"

def analyze_platform(platform_name: str, url: str, game_title: str):
    """
    Launch a Mino browser agent to analyze a game store page.
    Streams results via Server-Sent Events.
    """
    
    goal = f'''You are analyzing a game store page to help a user decide 
whether to buy "{game_title}" now or wait.

Navigate to the store page and observe:
- Current price displayed
- Any sale/discount indicators
- User ratings and review scores

Return a JSON object with:
{{
  "platform_name": "{platform_name}",
  "current_price": "$XX.XX",
  "is_on_sale": true/false,
  "discount_percentage": "XX%" or null,
  "recommendation": "buy_now" | "wait" | "consider",
  "reasoning": "Brief explanation"
}}'''

    response = requests.post(
        "https://mino.ai/v1/automation/run-sse",
        headers={
            "Content-Type": "application/json",
            "X-API-Key": MINO_API_KEY,
        },
        json={
            "url": url,
            "goal": goal,
            "timeout": 300000,
        },
        stream=True,
    )

    client = sseclient.SSEClient(response)
    
    for event in client.events():
        data = json.loads(event.data)
        
        if data.get("streamingUrl"):
            print(f"Live preview: {data['streamingUrl']}")
        
        if data.get("message"):
            print(f"Status: {data['message']}")
        
        if data.get("type") == "COMPLETE":
            return data.get("result")
    
    return None


# Usage
result = analyze_platform(
    platform_name="Steam",
    url="https://store.steampowered.com/search/?term=Elden%20Ring",
    game_title="Elden Ring"
)
print(json.dumps(result, indent=2))
```

---

## Goal (Prompt)

The following natural language prompt is sent to the Mino API to instruct the browser agent:

```
You are analyzing a game store page to help a user decide whether to buy "Elden Ring" now or wait.

CURRENT DATE: Monday, January 27, 2026

STEP 1 - NAVIGATE & OBSERVE:
Navigate to the store page and observe:
- Current price displayed
- Any sale/discount indicators
- Original price (if on sale)
- User ratings and review scores
- Any visible sale end dates or timers
- Bundle options or editions available

STEP 2 - ANALYZE PURCHASE TIMING:
Consider these factors:
- Is there an active discount? How significant?
- Are there any visible sale patterns (seasonal sales, etc.)?
- What do user reviews say about the game's value?
- Are there any upcoming DLCs or editions that might affect price?

STEP 3 - RETURN STRUCTURED ANALYSIS:
Return a JSON object with this exact format:
{
  "platform_name": "Steam",
  "store_url": "https://store.steampowered.com/search/?term=Elden%20Ring",
  "current_price": "$XX.XX or regional equivalent",
  "original_price": "$XX.XX if on sale, null otherwise",
  "discount_percentage": "XX%" if on sale, null otherwise",
  "is_on_sale": true/false,
  "sale_ends": "Date/time if visible, null otherwise",
  "user_rating": "Rating score if available (e.g., '9/10', '95%', '4.5/5')",
  "review_count": "Number of reviews if visible",
  "recommendation": "buy_now" | "wait" | "consider",
  "reasoning": "2-3 sentence explanation of your recommendation",
  "pros": ["Up to 3 reasons to buy from this platform"],
  "cons": ["Up to 3 potential drawbacks or reasons to wait"]
}

RECOMMENDATION GUIDELINES:
- "buy_now": Significant discount (30%+), historic low price, or sale ending soon
- "wait": Full price with known upcoming sales, or better deals elsewhere
- "consider": Moderate discount, decent value, user's preference matters

Be accurate with prices and factual with observations. If you cannot find certain information, use null for that field.
```

---

## Sample Output

### SSE Stream Events (Simulated)

```
event: message
data: {"streamingUrl": "https://live.mino.ai/session/abc123"}

event: message
data: {"message": "Navigating to Steam store page..."}

event: message
data: {"message": "Page loaded, searching for Elden Ring..."}

event: message
data: {"message": "Found game listing, extracting pricing information..."}

event: message
data: {"message": "Analyzing user reviews and ratings..."}

event: message
data: {"message": "Checking for active discounts..."}

event: message
data: {"type": "COMPLETE", "result": {...}}
```

### Final Result JSON

```json
{
  "platform_name": "Steam",
  "store_url": "https://store.steampowered.com/app/1245620/ELDEN_RING/",
  "current_price": "$41.99",
  "original_price": "$59.99",
  "discount_percentage": "30%",
  "is_on_sale": true,
  "sale_ends": "February 3, 2026",
  "user_rating": "Overwhelmingly Positive (94%)",
  "review_count": "687,432",
  "recommendation": "buy_now",
  "reasoning": "Elden Ring is currently 30% off on Steam, which is a significant discount for this critically acclaimed title. The sale ends in about a week, and the game maintains an Overwhelmingly Positive rating with nearly 700K reviews. This is a great time to purchase.",
  "pros": [
    "30% discount - best price in 6 months",
    "Steam Workshop support for mods",
    "Steam Deck verified for portable play"
  ],
  "cons": [
    "Sale ends February 3rd - limited time",
    "DLC Shadow of the Erdtree sold separately",
    "May see deeper discounts during Summer Sale"
  ]
}
```

### TypeScript Type Definition

```typescript
interface PlatformAnalysis {
  platform_name: string
  store_url: string
  current_price: string
  original_price?: string
  discount_percentage?: string
  is_on_sale: boolean
  sale_ends?: string
  user_rating?: string
  review_count?: string
  recommendation: 'buy_now' | 'wait' | 'consider'
  reasoning: string
  pros: string[]
  cons: string[]
}
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MINO_API_KEY` | Your Mino API key for browser automation | Yes |

**Note:** No other API keys are required. Platform discovery is handled internally without external AI services.

---

## Rate Limits & Timeouts

- **Request timeout**: 5 minutes (300,000ms)
- **Max concurrent agents**: No limit (10 launched per search)
- **Mino API endpoint**: `https://mino.ai/v1/automation/run-sse`

---

This documentation provides a complete overview of how GamePulse integrates with the Mino API to perform parallel browser automation for game price analysis across multiple platforms.
