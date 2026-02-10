# Mino API Developer Documentation: Area Research Use Case

> **Purpose:** This document provides a complete technical reference for developers integrating the Mino browser automation API for intelligent hotel area research.

---

## Table of Contents

1. [Product Architecture Overview](#product-architecture-overview)
2. [API Relationships](#api-relationships)
3. [API Call Frequency](#api-call-frequency)
4. [Orchestration Flow](#orchestration-flow)
5. [Code Examples](#code-examples)
6. [Goal Prompt Reference](#goal-prompt-reference)
7. [Sample Streaming Output](#sample-streaming-output)
8. [Error Handling](#error-handling)

---

## Product Architecture Overview

This system helps travelers decide **where to stay** by combining AI-powered area discovery with live browser research. It uses a two-stage pipeline:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           USER INPUT                                         │
│  City: "Bangalore" | Purpose: "Business trip" | Dates: optional             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     STAGE 1: AREA DISCOVERY (Gemini)                         │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │  Edge Function: discover-areas                                       │    │
│  │  API: Google Gemini 2.0 Flash                                        │    │
│  │  Output: 3-6 neighborhood recommendations                            │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   STAGE 2: PARALLEL RESEARCH (Mino)                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ research-   │  │ research-   │  │ research-   │  │ research-   │        │
│  │ area        │  │ area        │  │ area        │  │ area        │        │
│  │ (Area 1)    │  │ (Area 2)    │  │ (Area 3)    │  │ (Area N)    │        │
│  │             │  │             │  │             │  │             │        │
│  │ Mino Agent  │  │ Mino Agent  │  │ Mino Agent  │  │ Mino Agent  │        │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘        │
│         │               │               │               │                   │
│         └───────────────┴───────────────┴───────────────┘                   │
│                                 │                                            │
│                    SSE Streams (real-time updates)                           │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND DISPLAY                                    │
│  • Live browser screenshots via streamingUrl                                 │
│  • Real-time status updates                                                  │
│  • Final analysis with pros/cons/risks/top hotels                           │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Frontend | React + TypeScript | User interface, SSE consumption |
| `discover-areas` | Supabase Edge Function | Calls Gemini to suggest neighborhoods |
| `research-area` | Supabase Edge Function | Calls Mino to research each area |
| Gemini API | Google AI | Natural language area recommendations |
| Mino API | Browser Automation | Live web research with screenshots |

---

## API Relationships

### Dependency Chain

```
User Request
    │
    ├──► discover-areas (Gemini)
    │         │
    │         └──► Returns: AreaSuggestion[]
    │
    └──► research-area × N (Mino) [PARALLEL]
              │
              └──► Returns: SSE Stream → AreaResearchResult
```

### API Details

| API | Endpoint | Auth | Rate Limits |
|-----|----------|------|-------------|
| Gemini | `generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent` | API Key | Standard Gemini limits |
| Mino | `agent.tinyfish.ai/v1/automation/run-sse` | X-API-Key header | Per-account limits |

---

## API Call Frequency

For a typical search request:

| Stage | API | Calls | Notes |
|-------|-----|-------|-------|
| Discovery | Gemini | **1** | Single call to get area suggestions |
| Research | Mino | **3-6** | One per discovered area (parallel) |

**Total per search:** 1 Gemini call + 3-6 Mino calls

---

## Orchestration Flow

### Sequence Diagram

```
┌──────────┐     ┌──────────────┐     ┌─────────────────┐     ┌────────┐     ┌──────┐
│  React   │     │ useAreaSearch│     │ discover-areas  │     │ Gemini │     │ Mino │
│  UI      │     │    Hook      │     │ Edge Function   │     │  API   │     │ API  │
└────┬─────┘     └──────┬───────┘     └────────┬────────┘     └───┬────┘     └──┬───┘
     │                  │                      │                   │            │
     │ search(params)   │                      │                   │            │
     │─────────────────►│                      │                   │            │
     │                  │                      │                   │            │
     │                  │ POST /discover-areas │                   │            │
     │                  │─────────────────────►│                   │            │
     │                  │                      │                   │            │
     │                  │                      │ generateContent   │            │
     │                  │                      │──────────────────►│            │
     │                  │                      │                   │            │
     │                  │                      │ ◄─────────────────│            │
     │                  │                      │   areas[]         │            │
     │                  │ ◄────────────────────│                   │            │
     │                  │   areas[]            │                   │            │
     │                  │                      │                   │            │
     │ setResults       │                      │                   │            │
     │◄─────────────────│                      │                   │            │
     │ (pending cards)  │                      │                   │            │
     │                  │                      │                   │            │
     │                  │ ┌─────────────── PARALLEL LOOP ─────────────────┐    │
     │                  │ │ For each area:                                │    │
     │                  │ │                                               │    │
     │                  │ │ POST /research-area (SSE)                     │    │
     │                  │ │───────────────────────────────────────────────│────►
     │                  │ │                                               │    │
     │                  │ │ ◄──────────────────────────────────────────────────│
     │                  │ │   SSE: STATUS, SCREENSHOT, COMPLETE           │    │
     │                  │ │                                               │    │
     │ onStatus/        │ │                                               │    │
     │ onComplete       │ │                                               │    │
     │◄─────────────────│─┘                                               │    │
     │                  │                                                 │    │
     │                  │                                                 │    │
```

### React Hook Orchestration

```typescript
// useAreaSearch.ts - Simplified flow
const search = async (params: SearchParams) => {
  // Stage 1: Discover areas (single Gemini call)
  const areas = await discoverAreas(params);
  
  // Initialize UI with pending cards
  setResults(areas.map(a => ({ ...a, status: 'pending' })));
  
  // Stage 2: Research in parallel (multiple Mino calls)
  const promises = areas.map(area => {
    return new Promise((resolve) => {
      researchArea(
        area,
        params,
        onStatus,   // Live updates
        onComplete, // Final result
        onError     // Error handling
      );
    });
  });
  
  await Promise.all(promises);
};
```

---

## Code Examples

### cURL: Discover Areas (Gemini)

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/discover-areas' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "city": "Bangalore",
    "purpose": "business",
    "checkIn": "2024-03-15",
    "checkOut": "2024-03-18"
  }'
```

**Response:**
```json
{
  "areas": [
    {
      "id": "whitefield",
      "name": "Whitefield",
      "type": "neighborhood",
      "description": "Major IT hub in East Bangalore",
      "whyRecommended": "Home to major tech parks, excellent for business travelers with corporate hotels",
      "keyLocations": ["ITPL", "Phoenix Marketcity", "VR Mall"]
    },
    {
      "id": "mg-road",
      "name": "MG Road",
      "type": "neighborhood",
      "description": "Central business and shopping district",
      "whyRecommended": "Well-connected metro access, walking distance to key business addresses",
      "keyLocations": ["UB City", "Cubbon Park", "Brigade Road"]
    }
  ]
}
```

### cURL: Research Area (Mino SSE)

```bash
curl -X POST 'https://YOUR_PROJECT.supabase.co/functions/v1/research-area' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -d '{
    "area": {
      "id": "whitefield",
      "name": "Whitefield",
      "type": "neighborhood",
      "description": "Major IT hub",
      "whyRecommended": "Close to tech parks"
    },
    "params": {
      "city": "Bangalore",
      "purpose": "business"
    }
  }'
```

### TypeScript: Full Integration

```typescript
import { AreaSuggestion, AreaResearchResult, SearchParams } from './types';

const API_BASE = 'https://YOUR_PROJECT.supabase.co';

// Stage 1: Discover areas via Gemini
async function discoverAreas(params: SearchParams): Promise<AreaSuggestion[]> {
  const response = await fetch(`${API_BASE}/functions/v1/discover-areas`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
    },
    body: JSON.stringify(params),
  });

  const data = await response.json();
  return data.areas;
}

// Stage 2: Research each area via Mino (SSE)
function researchArea(
  area: AreaSuggestion,
  params: SearchParams,
  onStatus: (update: Partial<AreaResearchResult>) => void,
  onComplete: (result: AreaResearchResult) => void,
  onError: (error: string) => void
): AbortController {
  const controller = new AbortController();

  const fetchStream = async () => {
    const response = await fetch(`${API_BASE}/functions/v1/research-area`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify({ area, params }),
      signal: controller.signal,
    });

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === '[DONE]') continue;

        const event = JSON.parse(jsonStr);

        switch (event.type) {
          case 'STATUS':
            onStatus({ currentAction: event.message });
            break;
          case 'SCREENSHOT':
            onStatus({ streamingUrl: event.data.streamingUrl });
            break;
          case 'COMPLETE':
            onComplete({
              areaId: area.id,
              areaName: area.name,
              status: 'complete',
              analysis: event.data.analysis,
            });
            break;
          case 'ERROR':
            onError(event.message);
            break;
        }
      }
    }
  };

  fetchStream();
  return controller;
}

// Usage: Orchestrate the full flow
async function searchHotelAreas(city: string, purpose: string) {
  const params = { city, purpose };
  
  // Stage 1
  const areas = await discoverAreas(params);
  console.log(`Discovered ${areas.length} areas`);

  // Stage 2 (parallel)
  const results = await Promise.all(
    areas.map(area => 
      new Promise<AreaResearchResult>((resolve) => {
        researchArea(
          area,
          params,
          (update) => console.log(`[${area.name}] Status:`, update),
          (result) => resolve(result),
          (error) => resolve({ areaId: area.id, areaName: area.name, status: 'error', error })
        );
      })
    )
  );

  return results;
}
```

### Python: Mino API Call

```python
import requests
import json

MINO_API_URL = "https://agent.tinyfish.ai/v1/automation/run-sse"
TINYFISH_API_KEY = "your-mino-api-key"

def research_area_with_mino(area_name: str, city: str, purpose: str):
    """
    Call Mino API to research a hotel area with browser automation.
    Returns a generator that yields SSE events.
    """
    
    goal = f'''You are researching "{area_name}" in {city} to help a traveler decide if it's a good place to stay.

TRAVELER'S PURPOSE: {purpose}

RESEARCH TASKS (do these quickly, ~45 seconds total):

1. GOOGLE MAPS SEARCH: 
   - Search for "hotels in {area_name}, {city}" on Google Maps
   - Note the general location, nearby landmarks, and transport options

2. FIND TOP HOTELS:
   - Look for 3-5 best rated hotels in this specific area
   - Note their names, ratings, and a brief description

3. CONTEXTUAL ANALYSIS:
   Based on what you see, evaluate:
   - Is this area suitable for: {purpose}?
   - What are the pros of staying here?
   - What are the cons or potential issues?

RETURN JSON ONLY:
{{
  "suitability": "excellent|good|moderate|poor",
  "suitabilityScore": 1-10,
  "summary": "2-3 sentence summary",
  "pros": ["pro1", "pro2"],
  "cons": ["con1", "con2"],
  "topHotels": [
    {{"name": "Hotel Name", "rating": "4.5", "description": "Brief description"}}
  ]
}}'''

    search_url = f"https://www.google.com/maps/search/{area_name}, {city}"

    response = requests.post(
        MINO_API_URL,
        headers={
            "X-API-Key": TINYFISH_API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "url": search_url,
            "goal": goal,
        },
        stream=True
    )

    for line in response.iter_lines():
        if line:
            line_str = line.decode('utf-8')
            if line_str.startswith('data: '):
                json_str = line_str[6:].strip()
                if json_str and json_str != '[DONE]':
                    try:
                        event = json.loads(json_str)
                        yield event
                    except json.JSONDecodeError:
                        pass


# Usage
if __name__ == "__main__":
    for event in research_area_with_mino("Whitefield", "Bangalore", "Business trip"):
        print(f"Event type: {event.get('type')}")
        if event.get('type') == 'COMPLETE':
            print(f"Result: {json.dumps(event.get('resultJson'), indent=2)}")
```

---

## Goal Prompt Reference

The **exact natural language prompt** sent to Mino for area research:

```
You are researching "{AREA_NAME}" in {CITY} to help a traveler decide if it's a good place to stay.

TRAVELER'S PURPOSE: {PURPOSE_DESCRIPTION}

RESEARCH TASKS (do these quickly, ~45 seconds total):

1. GOOGLE MAPS SEARCH: 
   - Search for "hotels in {AREA_NAME}, {CITY}" on Google Maps
   - Note the general location, nearby landmarks, and transport options
   - Check distance to key locations relevant to their purpose

2. FIND TOP HOTELS:
   - Look for 3-5 best rated hotels in this specific area
   - Note their names, ratings, and a brief description of why they stand out
   - Focus on hotels with high ratings (4.0+) and relevant amenities for the traveler's purpose

3. QUICK REVIEW SCAN:
   - Look for any visible ratings or review snippets for hotels in this area
   - Note any common themes in reviews (noise, safety, convenience)

4. CONTEXTUAL ANALYSIS:
   Based on what you see, evaluate:
   - Is this area suitable for: {PURPOSE_DESCRIPTION}?
   - What are the pros of staying here for this purpose?
   - What are the cons or potential issues?
   - Any risks or things to be aware of?

RETURN JSON ONLY (no markdown):
{
  "suitability": "excellent|good|moderate|poor",
  "suitabilityScore": 1-10,
  "summary": "2-3 sentence summary of why this area is/isn't good for their purpose",
  "pros": ["pro1", "pro2"],
  "cons": ["con1", "con2"],
  "risks": ["risk1"],
  "distanceToKey": "e.g., 10 min walk to business district",
  "walkability": "e.g., Very walkable, good sidewalks",
  "noiseLevel": "e.g., Can be noisy at night due to bars",
  "safetyNotes": "e.g., Generally safe, well-lit streets",
  "nearbyAmenities": ["24h pharmacy", "metro station"],
  "reviewHighlights": ["Great breakfast", "Thin walls"],
  "topHotels": [
    {"name": "Hotel Name", "rating": "4.5", "description": "Brief description of why this hotel is good for the traveler's purpose"},
    {"name": "Another Hotel", "rating": "4.3", "description": "Short description highlighting key features"}
  ]
}
```

### Purpose Mappings

| Purpose Key | Description Sent to Mino |
|-------------|--------------------------|
| `business` | Business trip - meetings, conferences, professional work |
| `exam_interview` | Exam or interview - needs quiet, good sleep, stress-free |
| `family_visit` | Visiting family - comfortable space, family-friendly |
| `sightseeing` | Sightseeing - exploring attractions, good transport |
| `late_night` | Late night schedule - nightlife, flexible timing |
| `airport_transit` | Airport transit - early flight, proximity to airport |

---

## Sample Streaming Output

The Mino API returns Server-Sent Events (SSE). Here's what a complete stream looks like:

```
data: {"type":"STATUS","message":"Starting browser automation..."}

data: {"streamingUrl":"https://stream.mino.ai/live/abc123"}

data: {"type":"STATUS","message":"Navigating to Google Maps..."}

data: {"type":"STATUS","message":"Searching for hotels in Whitefield, Bangalore..."}

data: {"type":"STATUS","message":"Analyzing hotel listings..."}

data: {"type":"STATUS","message":"Checking reviews and ratings..."}

data: {"type":"COMPLETE","resultJson":{"suitability":"excellent","suitabilityScore":8,"summary":"Whitefield is an excellent choice for business travelers. It's home to major IT parks and has numerous business-class hotels with meeting facilities and reliable WiFi.","pros":["Very close to major tech parks (ITPL, Embassy Tech Village)","Excellent selection of business hotels (Marriott, Hyatt, Taj)","Many restaurants and cafes for client meetings","Good metro connectivity coming soon"],"cons":["Traffic congestion during peak hours","Far from airport (1-1.5 hours)","Limited nightlife options"],"risks":["Commute time can be unpredictable"],"distanceToKey":"5-10 min drive to major tech parks","walkability":"Moderate - some areas walkable, others require transport","noiseLevel":"Generally quiet residential-commercial mix","safetyNotes":"Safe area with good security in tech park vicinity","nearbyAmenities":["Phoenix Marketcity Mall","VR Mall","24h restaurants","Metro station (upcoming)"],"reviewHighlights":["Great for business stays","Good breakfast buffets","Reliable WiFi"],"topHotels":[{"name":"Marriott Whitefield","rating":"4.5","description":"Full-service business hotel with meeting rooms and executive lounge, ideal for corporate travelers"},{"name":"Hyatt Centric","rating":"4.4","description":"Modern hotel with excellent co-working spaces and proximity to tech parks"},{"name":"Taj Yeshwantpur","rating":"4.6","description":"Luxury option with premium amenities and professional service"},{"name":"Lemon Tree Premier","rating":"4.2","description":"Good value business hotel with reliable amenities"},{"name":"ibis Bangalore","rating":"4.0","description":"Budget-friendly option with essential business amenities"}]}}

data: [DONE]
```

### SSE Event Types

| Event Type | Data | Description |
|------------|------|-------------|
| `STATUS` | `{ message: string }` | Progress updates during research |
| `SCREENSHOT` | `{ streamingUrl: string }` | Live browser view URL |
| `COMPLETE` | `{ analysis: object }` | Final research results |
| `ERROR` | `{ message: string }` | Error occurred |

### Parsed Analysis Object

```typescript
interface AreaAnalysis {
  suitability: 'excellent' | 'good' | 'moderate' | 'poor';
  suitabilityScore: number; // 1-10
  summary: string;
  pros: string[];
  cons: string[];
  risks: string[];
  distanceToKey?: string;
  walkability?: string;
  noiseLevel?: string;
  safetyNotes?: string;
  nearbyAmenities: string[];
  reviewHighlights: string[];
  topHotels: Array<{
    name: string;
    rating?: string;
    description: string;
  }>;
}
```

---

## Error Handling

### Timeout Strategy

The frontend implements a 180-second (3-minute) timeout for Mino research:

```typescript
const timeoutId = setTimeout(() => {
  if (!completed) {
    completed = true;
    controller.abort();
    onComplete({
      status: 'complete',
      analysis: {
        suitability: 'moderate',
        summary: 'Research timed out. Consider doing your own research.',
        pros: [area.whyRecommended],
        cons: ['Limited research data available'],
      },
    });
  }
}, 180000); // 3 minutes
```

### Fallback Responses

Both edge functions provide fallback data if the primary API fails:

**Gemini Fallback (discover-areas):**
- Returns generic area suggestions (City Center, Airport Area, Tourist District)

**Mino Fallback (research-area):**
- Returns the original area recommendation from Gemini
- Sets suitability to "moderate" with score 5-6

### Error Codes

| HTTP Status | Meaning | Action |
|-------------|---------|--------|
| 400 | Missing required parameters | Check request body |
| 500 | API key not configured | Set environment variables |
| 503 | External API unavailable | Fallback response provided |

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes | Google AI API key for area discovery |
| `TINYFISH_API_KEY` | Yes | Mino API key for browser automation |

---

## Quick Start Checklist

1. ✅ Set `GEMINI_API_KEY` and `TINYFISH_API_KEY` in your environment
2. ✅ Deploy `discover-areas` and `research-area` edge functions
3. ✅ Implement SSE parsing in your frontend
4. ✅ Handle the 180-second timeout gracefully
5. ✅ Display live screenshots using `streamingUrl`
6. ✅ Parse and render the `topHotels` array

---

*Last updated: January 2025*
