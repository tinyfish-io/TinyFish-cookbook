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
    const { url, bankName, loanType } = await req.json();

    if (!url || !bankName) {
      return new Response(
        JSON.stringify({ error: "url and bankName are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const MINO_API_KEY = Deno.env.get("MINO_API_KEY");
    if (!MINO_API_KEY) {
      throw new Error("MINO_API_KEY is not configured");
    }

    const loanTypeMap: Record<string, string> = {
      personal: "personal loan",
      home: "home loan / mortgage",
      education: "education loan / student loan",
      business: "business loan / SME loan"
    };

    const loanDescription = loanTypeMap[loanType] || loanType || "loan";

    const goal = `You are analyzing a bank's ${loanDescription} page for comparison purposes.

STEP 1 - NAVIGATE:
If this is not the specific loan product page, look for links to ${loanDescription} and navigate there.

STEP 2 - EXTRACT INFORMATION:
Carefully analyze the page and extract:
- Interest rate ranges (APR, fixed/variable rates)
- Loan tenure/repayment period options
- Eligibility requirements (income, credit score, etc.)
- Fees (processing, origination, prepayment, etc.)
- Key benefits highlighted by the bank
- Any drawbacks or limitations mentioned
- How clear and transparent the terms are

STEP 3 - RETURN ANALYSIS:
Return a JSON object with your analysis:
{
  "bankName": "${bankName}",
  "interestRateRange": "X% - Y% APR" or "Not specified",
  "tenure": "X to Y years" or "Not specified",
  "eligibility": ["requirement 1", "requirement 2"],
  "fees": ["fee 1", "fee 2"],
  "benefits": ["benefit 1", "benefit 2", "benefit 3"],
  "drawbacks": ["drawback 1", "drawback 2"],
  "clarity": "Clear/Moderate/Unclear",
  "description": "Brief 2-3 sentence summary of this loan offering",
  "score": 7 (rating from 1-10 based on overall value, transparency, and competitiveness)
}

Be objective and factual. If information is not available, indicate "Not specified".`;

    // Create SSE response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        };

        try {
          send({ type: "STATUS", message: "Connecting to browser agent..." });

          const minoResponse = await fetch("https://mino.ai/v1/automation/run-sse", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-API-Key": MINO_API_KEY,
            },
            body: JSON.stringify({ url, goal, timeout: 300000 }), // 5 minute timeout
          });

          if (!minoResponse.ok) {
            const errorText = await minoResponse.text();
            console.error("Mino API error:", minoResponse.status, errorText);
            send({ type: "ERROR", message: `Mino API error: ${minoResponse.status}` });
            controller.close();
            return;
          }

          const reader = minoResponse.body?.getReader();
          if (!reader) {
            send({ type: "ERROR", message: "No response body from Mino" });
            controller.close();
            return;
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (!jsonStr || jsonStr === "[DONE]") continue;

                try {
                  const data = JSON.parse(jsonStr);

                  if (data.streamingUrl) {
                    send({ streamingUrl: data.streamingUrl });
                  }

                  if (data.type === "STATUS" && data.message) {
                    send({ type: "STATUS", message: data.message });
                  }

                  if (data.type === "COMPLETE" && data.resultJson) {
                    let result = data.resultJson;
                    if (typeof result === "string") {
                      try {
                        result = JSON.parse(result);
                      } catch {
                        // If parsing fails, create a basic result
                        result = {
                          bankName,
                          description: "Analysis completed but could not parse result",
                          score: 5
                        };
                      }
                    }
                    send({ type: "COMPLETE", result });
                  }
                } catch (parseError) {
                  // Ignore parse errors for incomplete chunks
                }
              }
            }
          }

          // Process any remaining buffer
          if (buffer.trim()) {
            const lines = buffer.split("\n");
            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr && jsonStr !== "[DONE]") {
                  try {
                    const data = JSON.parse(jsonStr);
                    if (data.type === "COMPLETE" && data.resultJson) {
                      let result = data.resultJson;
                      if (typeof result === "string") {
                        result = JSON.parse(result);
                      }
                      send({ type: "COMPLETE", result });
                    }
                  } catch {}
                }
              }
            }
          }

          send({ type: "DONE" });
          controller.close();
        } catch (error) {
          console.error("Stream error:", error);
          send({ type: "ERROR", message: error instanceof Error ? error.message : "Unknown error" });
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in analyze-loan:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
