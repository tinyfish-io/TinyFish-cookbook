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
    const { url, goal } = await req.json();

    const MINO_API_KEY = Deno.env.get("MINO_API_KEY");
    if (!MINO_API_KEY) {
      throw new Error("MINO_API_KEY is not configured");
    }

    console.log(`Starting Mino SSE agent for URL: ${url}`);

    // Call Mino API with SSE streaming
    const response = await fetch("https://mino.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": MINO_API_KEY,
      },
      body: JSON.stringify({ url, goal }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mino API error:", response.status, errorText);
      throw new Error(`Mino API error: ${response.status}`);
    }

    // Stream the SSE response directly to the client
    return new Response(response.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in mino-search-stream:", error);
    
    // Return error as SSE event
    const errorEvent = `data: ${JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" })}\n\n`;
    
    return new Response(errorEvent, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
      },
    });
  }
});
