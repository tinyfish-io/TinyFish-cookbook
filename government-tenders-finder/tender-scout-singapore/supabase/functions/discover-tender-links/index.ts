import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sector } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      // Return default links if no API key
      return new Response(
        JSON.stringify({
          success: true,
          links: [
            { url: 'https://www.gebiz.gov.sg/', name: 'GeBIZ' },
            { url: 'https://www.tendersontime.com/singapore-tenders/', name: 'Tenders On Time' },
            { url: 'https://www.biddetail.com/singapore-tenders', name: 'Bid Detail' },
            { url: 'https://www.tendersinfo.com/global-singapore-tenders.php', name: 'Tenders Info' },
            { url: 'https://www.globaltenders.com/government-tenders-singapore', name: 'Global Tenders' },
          ]
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use AI to discover relevant tender links
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are an expert at finding government tender and procurement websites. 
            Return exactly 5 legitimate tender/procurement websites relevant to the given sector in Singapore.
            Focus on official government portals, established tender aggregators, and industry-specific procurement sites.
            Return as JSON array with 'name' and 'url' fields only.`
          },
          {
            role: 'user',
            content: `Find 5 tender/procurement websites for the "${sector}" sector in Singapore. 
            Include GeBIZ (the official Singapore government procurement portal) and 4 other relevant sites.
            Return JSON only: [{"name": "Site Name", "url": "https://..."}]`
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse the JSON from the response
    let links = [];
    try {
      // Extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        links = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Error parsing AI response:', e);
      // Fallback to default links
      links = [
        { url: 'https://www.gebiz.gov.sg/', name: 'GeBIZ' },
        { url: 'https://www.tendersontime.com/singapore-tenders/', name: 'Tenders On Time' },
        { url: 'https://www.biddetail.com/singapore-tenders', name: 'Bid Detail' },
        { url: 'https://www.tendersinfo.com/global-singapore-tenders.php', name: 'Tenders Info' },
        { url: 'https://www.globaltenders.com/government-tenders-singapore', name: 'Global Tenders' },
      ];
    }

    return new Response(
      JSON.stringify({ success: true, links }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error:', errorMessage);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        links: [
          { url: 'https://www.gebiz.gov.sg/', name: 'GeBIZ' },
          { url: 'https://www.tendersontime.com/singapore-tenders/', name: 'Tenders On Time' },
          { url: 'https://www.biddetail.com/singapore-tenders', name: 'Bid Detail' },
          { url: 'https://www.tendersinfo.com/global-singapore-tenders.php', name: 'Tenders Info' },
          { url: 'https://www.globaltenders.com/government-tenders-singapore', name: 'Global Tenders' },
        ]
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
