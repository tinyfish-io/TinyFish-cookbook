import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { programType, targetAge, location, duration } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const prompt = `Find exactly 7-8 UNIQUE and DIFFERENT official summer school program websites for the following criteria:
- Program Type: ${programType}
- Target Age/Grade: ${targetAge || 'Any'}
- Location: ${location}
- Duration: ${duration || 'Summer 2025/2026'}

CRITICAL RULES:
1. Return EXACTLY 7-8 different URLs - no duplicates allowed
2. Each URL must be from a DIFFERENT institution/university
3. Do NOT repeat any institution - each must be unique
4. Only include direct program pages, not search results or aggregator sites
5. Prioritize well-known universities and educational organizations

Focus on variety:
- Mix of large universities and smaller institutions
- Different geographic regions within the specified location
- Various program formats (residential, online, hybrid)

Return format: ["url1", "url2", "url3", "url4", "url5", "url6", "url7"]

IMPORTANT: Return ONLY the JSON array with exactly 7-8 unique URLs, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that finds summer school program URLs. You MUST return exactly 7-8 UNIQUE URLs from DIFFERENT institutions. Never repeat the same institution. Return only valid JSON arrays of URLs."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";

    // Parse the JSON array from the response
    let urls: string[] = [];
    try {
      // Try to extract JSON array from the response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        urls = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse URLs:", parseError);
      // Fallback: try to extract URLs using regex
      const urlRegex = /https?:\/\/[^\s"'<>\]]+/g;
      urls = content.match(urlRegex) || [];
    }

    // Filter, validate, and deduplicate URLs
    const seenDomains = new Set<string>();
    urls = urls
      .filter((url: string) => {
        try {
          const parsed = new URL(url);
          const domain = parsed.hostname.replace('www.', '');
          // Skip if we've already seen this domain
          if (seenDomains.has(domain)) {
            return false;
          }
          seenDomains.add(domain);
          return true;
        } catch {
          return false;
        }
      })
      .slice(0, 8); // Limit to 8 unique URLs

    // Ensure we have at least 7 URLs
    if (urls.length < 7) {
      console.warn(`Only found ${urls.length} unique URLs, expected at least 7`);
    }

    return new Response(JSON.stringify({ urls }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in discover-schools:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
