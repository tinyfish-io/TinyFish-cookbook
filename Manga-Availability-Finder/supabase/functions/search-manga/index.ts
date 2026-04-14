import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { TinyFish } from "npm:@tiny-fish/sdk@0.0.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TinyFishAgentEvent = {
  type?: string;
  status?: string;
  message?: string;
  streamingUrl?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  resultJson?: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  step?: number;
  totalSteps?: number;
};

function isCompleteEvent(event: TinyFishAgentEvent): boolean {
  return event.type === "COMPLETE" && event.status === "COMPLETED";
}

function isErrorEvent(event: TinyFishAgentEvent): boolean {
  return event.type === "ERROR" || event.status === "FAILED";
}

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

    const apiKey = Deno.env.get("TINYFISH_API_KEY") || Deno.env.get("MINO_API_KEY");
    if (!apiKey) {
      throw new Error("TINYFISH_API_KEY is not configured");
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

    // Stream SSE events back to client
    const sseHeaders = {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    };

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        let streamingUrlSent = false;

        try {
          const client = new TinyFish({ apiKey });
          const tinyfishStream = await client.agent.stream({ url, goal });

          for await (const rawEvent of tinyfishStream) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const sdkEvent: any = rawEvent;

            const event: TinyFishAgentEvent = {
              type: sdkEvent.type,
              status: sdkEvent.status,
              message: sdkEvent.message,
              streamingUrl: sdkEvent.streamingUrl,
              resultJson: sdkEvent.resultJson ?? sdkEvent.result,
              result: sdkEvent.result,
              step: sdkEvent.step,
              totalSteps: sdkEvent.totalSteps,
            };

            // Send streaming URL immediately when available
            if (event.streamingUrl && !streamingUrlSent) {
              streamingUrlSent = true;
              const sse = `data: ${JSON.stringify({ type: "stream", streamingUrl: event.streamingUrl })}\n\n`;
              controller.enqueue(encoder.encode(sse));
            }

            // Check for completion
            if (isCompleteEvent(event)) {
              const payload = event.resultJson;
              let found = false;
              try {
                const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
                found = parsed?.found === true;
              } catch {
                const resultStr = JSON.stringify(payload ?? "").toLowerCase();
                found = resultStr.includes('"found": true') || resultStr.includes('"found":true');
              }

              const sse = `data: ${JSON.stringify({ type: "complete", found })}\n\n`;
              controller.enqueue(encoder.encode(sse));
              controller.close();
              return;
            }

            // Handle errors
            if (isErrorEvent(event)) {
              const sse = `data: ${JSON.stringify({ type: "error", error: event.message || "Search failed" })}\n\n`;
              controller.enqueue(encoder.encode(sse));
              controller.close();
              return;
            }
          }

          const sse = `data: ${JSON.stringify({ type: "error", error: "Stream ended without completion signal" })}\n\n`;
          controller.enqueue(encoder.encode(sse));
        } catch (error) {
          const sse = `data: ${JSON.stringify({ type: "error", error: error instanceof Error ? error.message : "Stream error" })}\n\n`;
          controller.enqueue(encoder.encode(sse));
        } finally {
          try {
            controller.close();
          } catch {
            // no-op
          }
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
