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
    const { loanType, location } = await req.json();

    if (!loanType || !location) {
      return new Response(
        JSON.stringify({ error: "loanType and location are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const loanTypeMap: Record<string, string> = {
      personal: "personal loan",
      home: "home loan / mortgage",
      education: "education loan / student loan",
      business: "business loan / SME loan"
    };

    const loanDescription = loanTypeMap[loanType] || loanType;

    const prompt = `You are a financial research assistant. Find 5-8 well-known, trusted banks or financial institutions that offer ${loanDescription} in or near ${location}.

Return ONLY official bank/lender websites (not aggregators like NerdWallet, Bankrate, etc.). Focus on major banks, credit unions, and established lenders.

For each bank, provide:
1. The bank's official name
2. The direct URL to their ${loanDescription} product page (not homepage)

Return a JSON object with this exact format:
{
  "banks": [
    { "name": "Bank Name", "url": "https://bank-url.com/loan-page" }
  ]
}

Only return the JSON object, no other text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a helpful financial research assistant. Always return valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Extract JSON from the response
    let banks = [];
    try {
      // Try to parse the entire content as JSON
      const parsed = JSON.parse(content);
      banks = parsed.banks || [];
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[1].trim());
        banks = parsed.banks || [];
      } else {
        // Try to find JSON object in the text
        const objMatch = content.match(/\{[\s\S]*"banks"[\s\S]*\}/);
        if (objMatch) {
          const parsed = JSON.parse(objMatch[0]);
          banks = parsed.banks || [];
        }
      }
    }

    // Validate and clean the banks list
    const validBanks = banks
      .filter((bank: { name?: string; url?: string }) => bank.name && bank.url)
      .slice(0, 8);

    console.log(`Found ${validBanks.length} banks for ${loanType} in ${location}`);

    return new Response(
      JSON.stringify({ banks: validBanks }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in discover-banks:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
