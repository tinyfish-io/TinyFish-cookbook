import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { exam, location } = await req.json();
    
    if (!exam || !location) {
      return new Response(
        JSON.stringify({ error: 'Exam and location are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Discovering tutoring websites for ${exam} in ${location}`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const prompt = `You are helping find tutoring websites for standardized exam preparation.

The user wants to find tutors for: ${exam}
Location: ${location}

Return a JSON array of 7-10 popular tutoring websites that are likely to have ${exam} tutors. 
Focus on reputable platforms that:
1. Have tutor profiles with qualifications and reviews
2. Are accessible in or near ${location}
3. Are well-known for ${exam} preparation

Include a mix of:
- Global online tutoring platforms (Wyzant, Varsity Tutors, Preply, etc.)
- Test prep specific sites (Kaplan, Princeton Review, Magoosh, etc.)
- Local tutoring services if applicable

Return ONLY a valid JSON array with this exact format:
[
  {"name": "Website Name", "url": "https://full-url-to-tutor-search-page"},
  ...
]

Make sure URLs point to the specific tutor search or directory pages when possible.`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    console.log('AI response:', content);

    // Parse the JSON from the response
    let websites: { name: string; url: string }[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        websites = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse websites JSON:', parseError);
      // Fallback to default websites
      websites = [
        { name: 'Wyzant', url: 'https://www.wyzant.com/search' },
        { name: 'Varsity Tutors', url: 'https://www.varsitytutors.com/tutors' },
        { name: 'Preply', url: 'https://preply.com/en/online' },
        { name: 'Kaplan', url: 'https://www.kaptest.com/tutoring' },
        { name: 'Princeton Review', url: 'https://www.princetonreview.com/tutoring' },
        { name: 'Tutor.com', url: 'https://www.tutor.com' },
        { name: 'Chegg Tutors', url: 'https://www.chegg.com/tutors' },
      ];
    }

    console.log('Returning websites:', websites);

    return new Response(
      JSON.stringify({ websites }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error discovering websites:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
