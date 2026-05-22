export const runtime = "nodejs";
export const maxDuration = 300;

import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

function getPurposeDescription(purpose: string): string {
  const purposes: Record<string, string> = {
    business: "Business trip - meetings, conferences, professional work",
    exam_interview: "Exam or interview - needs quiet, good sleep, stress-free",
    family_visit: "Visiting family - comfortable space, family-friendly",
    sightseeing: "Sightseeing - exploring attractions, good transport",
    late_night: "Late night schedule - nightlife, flexible timing",
    airport_transit: "Airport transit - early flight, proximity to airport",
  };
  return purposes[purpose] || "General travel";
}

function parseResearchResult(result: Record<string, unknown>, area: { name: string; whyRecommended: string }, city: string) {
  const topHotels = Array.isArray(result.topHotels)
    ? (result.topHotels as Record<string, unknown>[]).slice(0, 5).map(h => ({
        name: String(h.name || "Unknown Hotel"),
        rating: h.rating ? String(h.rating) : undefined,
        description: String(h.description || "A well-rated hotel in this area."),
      }))
    : [];

  return {
    suitability: String(result.suitability || "moderate"),
    suitabilityScore: Number(result.suitabilityScore || 5),
    summary: String(result.summary || `${area.name} is a potential option for your stay in ${city}.`),
    pros: Array.isArray(result.pros) ? result.pros : [area.whyRecommended],
    cons: Array.isArray(result.cons) ? result.cons : [],
    risks: Array.isArray(result.risks) ? result.risks : [],
    distanceToKey: result.distanceToKey ? String(result.distanceToKey) : undefined,
    walkability: result.walkability ? String(result.walkability) : undefined,
    noiseLevel: result.noiseLevel ? String(result.noiseLevel) : undefined,
    safetyNotes: result.safetyNotes ? String(result.safetyNotes) : undefined,
    nearbyAmenities: Array.isArray(result.nearbyAmenities) ? result.nearbyAmenities : [],
    reviewHighlights: Array.isArray(result.reviewHighlights) ? result.reviewHighlights : [],
    topHotels,
  };
}

function generateFallbackAnalysis(area: { name: string; whyRecommended: string; keyLocations?: string[] }, city: string) {
  return {
    suitability: "good",
    suitabilityScore: 6,
    summary: `${area.name} is a commonly recommended area in ${city}. ${area.whyRecommended || "Good central location with various amenities."}`,
    pros: [area.whyRecommended || "Convenient location"],
    cons: ["Limited detailed research available"],
    risks: [],
    nearbyAmenities: area.keyLocations || [],
    reviewHighlights: [],
    topHotels: [],
  };
}

export async function POST(request: Request) {
  const { area, params } = await request.json();

  if (!area || !params) return Response.json({ error: "Area and params are required" }, { status: 400 });

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });

  const { city, purpose, customPurpose } = params;
  const purposeText = customPurpose || getPurposeDescription(purpose);

  const goal = `You are researching "${area.name}" in ${city} to help a traveler decide if it's a good place to stay.

TRAVELER'S PURPOSE: ${purposeText}

RESEARCH TASKS (do these quickly, ~45 seconds total):

1. GOOGLE MAPS SEARCH:
   - Search for "hotels in ${area.name}, ${city}" on Google Maps
   - Note the general location, nearby landmarks, and transport options
   - Check distance to key locations relevant to their purpose

2. FIND TOP HOTELS:
   - Look for 3-5 best rated hotels in this specific area
   - Note their names, ratings, and a brief description
   - Focus on hotels with high ratings (4.0+) and relevant amenities

3. CONTEXTUAL ANALYSIS:
   Based on what you see, evaluate:
   - Is this area suitable for: ${purposeText}?
   - What are the pros of staying here for this purpose?
   - What are the cons or potential issues?

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
    {"name": "Hotel Name", "rating": "4.5", "description": "Brief description"},
    {"name": "Another Hotel", "rating": "4.3", "description": "Short description"}
  ]
}`;

  const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(area.name + ", " + city)}`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (payload: unknown) => controller.enqueue(encoder.encode(sseData(payload)));

      try {
        enqueue({ type: "CONNECTED", message: `Starting research on ${area.name}...` });

        const client = new TinyFish({ apiKey });
        const tfStream = await client.agent.stream({ url: searchUrl, goal });

        for await (const event of tfStream) {
          if (event.type === EventType.STREAMING_URL) {
            enqueue({ type: "SCREENSHOT", data: { streamingUrl: event.streaming_url } });
          }

          if (event.type === EventType.COMPLETE && event.status === RunStatus.COMPLETED) {
            const raw = typeof event.result === "string" ? JSON.parse(event.result) : event.result;
            const analysis = parseResearchResult(raw as Record<string, unknown>, area, city);
            enqueue({ type: "COMPLETE", data: { analysis } });
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
            return;
          }
        }

        // Fallback if no COMPLETE event
        enqueue({ type: "COMPLETE", data: { analysis: generateFallbackAnalysis(area, city) } });
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      } catch (error) {
        enqueue({ type: "ERROR", message: error instanceof Error ? error.message : "Unknown error" });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
