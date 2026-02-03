/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MINO_API_KEY = Deno.env.get('MINO_API_KEY');
const MINO_API_URL = 'https://mino.ai/v1/automation/run-sse';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { area, params } = await req.json();

    if (!area || !params) {
      return new Response(
        JSON.stringify({ error: 'Area and params are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!MINO_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'MINO_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { city, purpose, customPurpose } = params;
    const purposeText = customPurpose || getPurposeDescription(purpose);

    // Research goal for the Mino agent
    const goal = `You are researching "${area.name}" in ${city} to help a traveler decide if it's a good place to stay.

TRAVELER'S PURPOSE: ${purposeText}

RESEARCH TASKS (do these quickly, ~45 seconds total):

1. GOOGLE MAPS SEARCH: 
   - Search for "hotels in ${area.name}, ${city}" on Google Maps
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
   - Is this area suitable for: ${purposeText}?
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
}`;

    // Create SSE stream
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const sendEvent = async (type: string, data?: unknown, message?: string) => {
      const event = JSON.stringify({ type, data, message });
      await writer.write(encoder.encode(`data: ${event}\n\n`));
    };

    // Start async processing
    (async () => {
      try {
        await sendEvent('CONNECTED', null, `Starting research on ${area.name}...`);

        // Start URL: Google Maps search for the area
        const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(area.name + ', ' + city)}`;

        const minoResponse = await fetch(MINO_API_URL, {
          method: 'POST',
          headers: {
            'X-API-Key': MINO_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: searchUrl,
            goal: goal,
          }),
        });

        if (!minoResponse.ok) {
          const errorText = await minoResponse.text();
          console.error(`Mino API error for ${area.name}:`, errorText);
          await sendEvent('ERROR', null, `Failed to research ${area.name}: ${minoResponse.status}`);
          await writer.close();
          return;
        }

        // Handle SSE response from Mino
        const reader = minoResponse.body?.getReader();
        if (!reader) {
          await sendEvent('ERROR', null, 'No response body from Mino');
          await writer.close();
          return;
        }

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
            if (!jsonStr || jsonStr === '[DONE]') continue;

            try {
              const data = JSON.parse(jsonStr);

              // Forward status updates
              if (data.type === 'STATUS' && data.message) {
                await sendEvent('STATUS', null, data.message);
              }

              // Handle streamingUrl for live browser preview
              if (data.streamingUrl) {
                await sendEvent('SCREENSHOT', { streamingUrl: data.streamingUrl });
              }

              // Handle COMPLETE with resultJson
              if (data.type === 'COMPLETE') {
                const result = parseResearchResult(data.resultJson || data, area, city);
                await sendEvent('COMPLETE', {
                  analysis: result.analysis,
                });
                await writer.write(encoder.encode('data: [DONE]\n\n'));
                await writer.close();
                return;
              }

              // Handle raw result/output fields
              const responseText = data.result || data.output || data.text;
              if (responseText && typeof responseText === 'string') {
                const jsonMatch = responseText.match(/\{[\s\S]*?\}/);
                if (jsonMatch) {
                  try {
                    const parsed = JSON.parse(jsonMatch[0]);
                    const result = parseResearchResult(parsed, area, city);
                    await sendEvent('COMPLETE', {
                      analysis: result.analysis,
                    });
                    await writer.write(encoder.encode('data: [DONE]\n\n'));
                    await writer.close();
                    return;
                  } catch {
                    // Continue processing
                  }
                }
              }
            } catch {
              // Ignore parse errors
            }
          }
        }

        // Fallback if no COMPLETE event
        const fallback = generateFallbackAnalysis(area, city, purposeText);
        await sendEvent('COMPLETE', {
          analysis: fallback.analysis,
        });
        await writer.write(encoder.encode('data: [DONE]\n\n'));
        await writer.close();

      } catch (error: unknown) {
        console.error(`Error processing ${area.name}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await sendEvent('ERROR', null, errorMessage);
        await writer.close();
      }
    })();

    return new Response(stream.readable, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: unknown) {
    console.error('Error in research-area:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getPurposeDescription(purpose: string): string {
  const purposes: Record<string, string> = {
    'business': 'Business trip - meetings, conferences, professional work',
    'exam_interview': 'Exam or interview - needs quiet, good sleep, stress-free',
    'family_visit': 'Visiting family - comfortable space, family-friendly',
    'sightseeing': 'Sightseeing - exploring attractions, good transport',
    'late_night': 'Late night schedule - nightlife, flexible timing',
    'airport_transit': 'Airport transit - early flight, proximity to airport',
  };
  return purposes[purpose] || 'General travel';
}

function parseResearchResult(result: any, area: any, city: string) {
  // Parse top hotels if available
  const topHotels = Array.isArray(result.topHotels) 
    ? result.topHotels.slice(0, 5).map((h: any) => ({
        name: h.name || 'Unknown Hotel',
        rating: h.rating,
        description: h.description || 'A well-rated hotel in this area.',
      }))
    : [];

  const analysis = {
    suitability: result.suitability || 'moderate',
    suitabilityScore: result.suitabilityScore || 5,
    summary: result.summary || `${area.name} is a potential option for your stay in ${city}.`,
    pros: Array.isArray(result.pros) ? result.pros : [area.whyRecommended || 'Central location'],
    cons: Array.isArray(result.cons) ? result.cons : [],
    risks: Array.isArray(result.risks) ? result.risks : [],
    distanceToKey: result.distanceToKey,
    walkability: result.walkability,
    noiseLevel: result.noiseLevel,
    safetyNotes: result.safetyNotes,
    nearbyAmenities: Array.isArray(result.nearbyAmenities) ? result.nearbyAmenities : [],
    reviewHighlights: Array.isArray(result.reviewHighlights) ? result.reviewHighlights : [],
    topHotels,
  };

  return { analysis };
}

function generateFallbackAnalysis(area: any, city: string, purpose: string) {
  return {
    analysis: {
      suitability: 'good',
      suitabilityScore: 6,
      summary: `${area.name} is a commonly recommended area in ${city}. ${area.whyRecommended || 'Good central location with various amenities.'}`,
      pros: [area.whyRecommended || 'Convenient location'],
      cons: ['Limited detailed research available'],
      risks: [],
      distanceToKey: undefined,
      walkability: undefined,
      noiseLevel: undefined,
      safetyNotes: undefined,
      nearbyAmenities: area.keyLocations || [],
      reviewHighlights: [],
      topHotels: [],
    },
  };
}
