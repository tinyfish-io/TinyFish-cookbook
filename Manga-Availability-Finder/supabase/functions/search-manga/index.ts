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
    const { url, mangaTitle } = await req.json();

    if (!url || !mangaTitle) {
      return new Response(
        JSON.stringify({ error: "url and mangaTitle are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MINO_API_KEY = Deno.env.get("MINO_API_KEY");
    if (!MINO_API_KEY) {
      throw new Error("MINO_API_KEY is not configured");
    }

    const goal = `You are searching for a manga/webtoon called "${mangaTitle}" on this website.

STEP 1 - NAVIGATION:
If there's a search bar or search input, enter "${mangaTitle}" and submit the search.
If there's no search bar visible, look for a search icon or link to a search page.

STEP 2 - ANALYZE RESULTS:
Look at the search results or page content carefully.
Check if "${mangaTitle}" appears in the results (exact match or very close match).

STEP 3 - RETURN RESULT:
Return a JSON object:
{
  "found": true or false,
  "manga_title": "${mangaTitle}",
  "site_url": "current page URL",
  "match_confidence": "high" or "medium" or "low",
  "notes": "brief explanation of what you found or didn't find"
}

IMPORTANT: Only return "found": true if you see a clear match for "${mangaTitle}" in the results.`;

    const response = await fetch("https://mino.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MINO_API_KEY,
      },
      body: JSON.stringify({
        url,
        goal,
        timeout: 60000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mino API error:", response.status, errorText);
      throw new Error(`Mino API error: ${response.status}`);
    }

    // Stream SSE events back to client
    const sseHeaders = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    };

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const stream = new ReadableStream({
      async start(controller) {
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let streamingUrlSent = false;

        let buffer = "";

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true }); 
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                try {
                  const data = JSON.parse(line.slice(6));

                  // Send streaming URL immediately when available
                  if (data.streamingUrl && !streamingUrlSent) {
                    streamingUrlSent = true;
                    const event = `data: ${JSON.stringify({ type: "stream", streamingUrl: data.streamingUrl })}\n\n`;
                    controller.enqueue(encoder.encode(event));
                  }

                  // Check for completion
                  if (data.type === "COMPLETE" && data.resultJson) {
                    let found = false;
                    try {
                      const resultData = typeof data.resultJson === 'string' 
                        ? JSON.parse(data.resultJson) 
                        : data.resultJson;
                      found = resultData.found === true;
                    } catch {
                      const resultStr = JSON.stringify(data.resultJson).toLowerCase();
                      found = resultStr.includes('"found": true') || resultStr.includes('"found":true');
                    }
                    const event = `data: ${JSON.stringify({ type: "complete", found })}\n\n`;
                    controller.enqueue(encoder.encode(event));
                  }

                  // Handle errors
                  if (data.type === "ERROR") {
                    const event = `data: ${JSON.stringify({ type: "error", error: data.message || "Search failed" })}\n\n`;
                    controller.enqueue(encoder.encode(event));
                  }
                } catch {
                  // Ignore parse errors
                }
              }
            }
          }
        } catch (error) {
          const event = `data: ${JSON.stringify({ type: "error", error: "Stream error" })}\n\n`;
          controller.enqueue(encoder.encode(event));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, { headers: sseHeaders });
  } catch (error) {
    console.error("Error in search-manga:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        found: false 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
