/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { city, purpose, customPurpose, checkIn, checkOut } = await req.json();

    if (!city) {
      return new Response(
        JSON.stringify({ error: 'City is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured, using fallback');
      const areas = generateFallbackAreas(city, purpose);
      return new Response(
        JSON.stringify({ areas }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const purposeDescription = getPurposeDescription(purpose, customPurpose);

    const prompt = `You are an expert travel advisor helping someone choose WHERE to stay in ${city}.

The traveler's purpose: ${purposeDescription}
${checkIn ? `Check-in: ${checkIn}` : ''}
${checkOut ? `Check-out: ${checkOut}` : ''}

Generate 5-8 specific NEIGHBORHOOD or AREA recommendations (not individual hotels) that are commonly considered for this type of trip. 

For each area, explain WHY it's typically recommended for this specific purpose. Focus on:
- Proximity to relevant locations (business districts, exam centers, airports, tourist spots, etc.)
- The "vibe" and atmosphere of the area
- Practical considerations (transport, walkability, dining options)

Return ONLY valid JSON in this exact format, no markdown or code blocks:
[
  {
    "id": "unique-area-id",
    "name": "Area/Neighborhood Name",
    "type": "neighborhood",
    "description": "Brief description of this area",
    "whyRecommended": "Why this area is typically good for their specific purpose",
    "keyLocations": ["Nearby landmark 1", "Nearby landmark 2"]
  }
]

Be specific to ${city} - use real neighborhood names and local knowledge. Generate between 5 and 8 areas.`;

    const response = await fetch(
      'https://ai.gateway.lovable.dev/v1/chat/completions',
      {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.4,
          max_tokens: 2048,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI Gateway error:', errorText);
      const areas = generateFallbackAreas(city, purpose);
      return new Response(
        JSON.stringify({ areas }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    let areas = [];
    try {
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        areas = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse areas:', parseError, 'Raw text:', text);
      areas = generateFallbackAreas(city, purpose);
    }

    return new Response(
      JSON.stringify({ areas }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error in discover-areas:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getPurposeDescription(purpose: string, customPurpose?: string): string {
  if (customPurpose) return customPurpose;
  
  const purposes: Record<string, string> = {
    'business': 'Business trip - meetings, conferences, or professional work',
    'exam_interview': 'Exam or interview preparation - needs quiet, good sleep, stress-free environment',
    'family_visit': 'Visiting family - needs comfortable space, family-friendly area',
    'sightseeing': 'Sightseeing and tourism - exploring attractions, good transport access',
    'late_night': 'Late night schedule - nightlife, late check-in, flexible timing',
    'airport_transit': 'Airport transit - early flight, layover, needs proximity to airport',
  };
  
  return purposes[purpose] || 'General travel';
}

function generateFallbackAreas(city: string, purpose: string) {
  // Generic fallback areas based on common city structure - 6 areas minimum
  return [
    {
      id: 'city-center',
      name: `${city} City Center`,
      type: 'neighborhood',
      description: 'The central business and commercial district',
      whyRecommended: 'Central location with easy access to transport, restaurants, and main attractions',
      keyLocations: ['Main Train Station', 'Central Business District'],
    },
    {
      id: 'near-airport',
      name: `${city} Airport Area`,
      type: 'area',
      description: 'Hotels near the main airport',
      whyRecommended: 'Convenient for early flights or late arrivals, shuttle services available',
      keyLocations: ['International Airport', 'Airport Express'],
    },
    {
      id: 'tourist-district',
      name: `${city} Tourist District`,
      type: 'neighborhood',
      description: 'Popular area for visitors with attractions nearby',
      whyRecommended: 'Walking distance to major attractions, lots of dining and entertainment options',
      keyLocations: ['Major Attractions', 'Shopping District'],
    },
    {
      id: 'business-hub',
      name: `${city} Business Hub`,
      type: 'neighborhood',
      description: 'Corporate offices and convention centers area',
      whyRecommended: 'Ideal for business travelers with proximity to offices and meeting venues',
      keyLocations: ['Convention Center', 'Financial District'],
    },
    {
      id: 'residential-quiet',
      name: `${city} Quiet Residential Area`,
      type: 'neighborhood',
      description: 'Peaceful residential neighborhood away from the bustle',
      whyRecommended: 'Perfect for those seeking quiet, restful stays with local charm',
      keyLocations: ['Local Parks', 'Residential Streets'],
    },
    {
      id: 'entertainment-district',
      name: `${city} Entertainment District`,
      type: 'neighborhood',
      description: 'Nightlife, restaurants, and entertainment venues',
      whyRecommended: 'Great for evening activities, dining out, and vibrant atmosphere',
      keyLocations: ['Bars & Restaurants', 'Entertainment Venues'],
    },
  ];
}
