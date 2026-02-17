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
    const { mangaTitle } = await req.json();

    if (!mangaTitle) {
      return new Response(
        JSON.stringify({ error: "mangaTitle is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const prompt = `You are a manga/webtoon site discovery assistant. Given a manga or webtoon title, return a JSON array of 5-6 popular manga/webtoon reading websites where users can potentially find and read this title.

For the manga/webtoon: "${mangaTitle}"

Return ONLY a valid JSON object with this exact structure (no markdown, no code blocks):
{
  "sites": [
    {"name": "Site Name", "url": "https://example.com/search?q=${encodeURIComponent(mangaTitle)}"},
    ...
  ]
}

Include sites like:
- MangaDex (mangadex.org)
- MangaKakalot (mangakakalot.com)  
- MangaReader (mangareader.to)
- Webtoon (webtoons.com)
- Tapas (tapas.io)
- Manganato (manganato.com)

Make sure the URLs include a search query for the manga title where possible. Return exactly 5-6 sites.`;

    const response = await fetch(
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": GEMINI_API_KEY,
    },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 1024,
      },
    }),
  }
);


    // Default sites to use as fallback
    const defaultSites = [
      { name: "MangaDex", url: `https://mangadex.org/search?q=${encodeURIComponent(mangaTitle)}` },
      { name: "MangaKakalot", url: `https://mangakakalot.com/search/story/${encodeURIComponent(mangaTitle.toLowerCase().replace(/\s+/g, '_'))}` },
      { name: "MangaReader", url: `https://mangareader.to/search?keyword=${encodeURIComponent(mangaTitle)}` },
      { name: "Webtoon", url: `https://www.webtoons.com/en/search?keyword=${encodeURIComponent(mangaTitle)}` },
      { name: "Manganato", url: `https://manganato.com/search/story/${encodeURIComponent(mangaTitle.toLowerCase().replace(/\s+/g, '_'))}` },
      { name: "Tapas", url: `https://tapas.io/search?q=${encodeURIComponent(mangaTitle)}` },
    ];

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      
      // If rate limited (429) or other errors, use fallback sites instead of failing
      if (response.status === 429 || response.status >= 500) {
        console.log("Using fallback sites due to API error");
        return new Response(
          JSON.stringify({ sites: defaultSites }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse the JSON response
    let sites: Array<{ name: string; url: string }> = [];
    try {
      // Try to extract JSON from the response
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        sites = parsed.sites || [];
      }
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", textContent);
      sites = defaultSites;
    }
    
    // If no sites found, use defaults
    if (sites.length === 0) {
      sites = defaultSites;
    }

    return new Response(
      JSON.stringify({ sites }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in discover-manga-sites:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
