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

    const TINYFISH_API_KEY = Deno.env.get("TINYFISH_API_KEY");
    if (!TINYFISH_API_KEY) {
      throw new Error("TINYFISH_API_KEY is not configured");
    }

    console.log(`Starting Mino agent for URL: ${url}`);

    // Call Mino API with SSE streaming
    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": TINYFISH_API_KEY,
      },
      body: JSON.stringify({ url, goal }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Mino API error:", response.status, errorText);
      throw new Error(`Mino API error: ${response.status}`);
    }

    // Process SSE stream and wait for completion
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let resultJson = null;
    let lastStatus = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.type === "STATUS") {
              lastStatus = data.message || "";
              console.log(`Status: ${lastStatus}`);
            }

            if (data.type === "COMPLETE" && data.resultJson) {
              resultJson = data.resultJson;
              console.log("Received result:", JSON.stringify(resultJson));
            }

            if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseError) {
            // Ignore parse errors for incomplete chunks
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        resultJson,
        lastStatus,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in mino-search:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
