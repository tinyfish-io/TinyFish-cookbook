import { NextRequest, NextResponse } from "next/server";
import { TinyFish } from "@tiny-fish/sdk";

const AGENT_TIMEOUT = 300000; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    const { company } = await request.json();

    const apiKey = process.env.TINYFISH_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "TINYFISH_API_KEY is not configured" },
        { status: 500 }
      );
    }

    if (!company || !company.url) {
      return NextResponse.json(
        { error: "Company with URL is required" },
        { status: 400 }
      );
    }

    const goal = `You are a customer discovery agent analyzing ${company.name} (${company.url}).

IMPORTANT: Stay ONLY on this company's website. Do NOT visit external websites.

STEP 1 — Navigate to the homepage and get an overview of what the company does.

STEP 2 — Quickly check these pages if they exist (skip if not found):
- /customers or /case-studies
- /pricing
- /about

STEP 3 — Extract this structured data:
- Company overview (1-2 sentences)
- Customer types they serve (e.g., startups, enterprises, agencies, SMBs)
- Case studies: customer name, industry, brief summary (up to 5)
- Testimonials: quote, author, company, role (up to 5)
- Pricing tiers: plan names and who each is for
- Key features: main product capabilities (up to 8)
- Integrations: tools/platforms they connect with

STEP 4 — Return findings as JSON:
{
  "overview": "What the company does",
  "customerTypes": ["type1", "type2"],
  "caseStudies": [{"customer": "name", "industry": "industry", "summary": "summary"}],
  "testimonials": [{"quote": "quote", "author": "name", "company": "company", "role": "role"}],
  "pricingTiers": ["Free - for individuals", "Pro $X/mo - for teams"],
  "keyFeatures": ["feature1", "feature2"],
  "integrations": ["integration1", "integration2"]
}

Be fast and factual. Do not invent information. If a page doesn't exist, skip it and return empty arrays.

FINAL RULE: Return ONLY the JSON object above. No planning text, no step reports, no reasoning traces.`;

    const client = new TinyFish({ apiKey });
    const encoder = new TextEncoder();

    const responseStream = new ReadableStream({
      async start(controller) {
        let agentStream: Awaited<ReturnType<typeof client.agent.stream>> | null = null;

        const timeout = setTimeout(async () => {
          if (agentStream) {
            try { await agentStream.close(); } catch {}
          }
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "ERROR", error: "Timeout: Agent exceeded 5 minutes" })}\n\n`
            )
          );
          try { controller.close(); } catch {}
        }, AGENT_TIMEOUT);

        try {
          agentStream = await client.agent.stream({ url: company.url, goal });

          for await (const event of agentStream) {
            // Direct passthrough of SDK events (same pattern as dataset-finder)
            const line = `data: ${JSON.stringify({ ...event, companyName: company.name, companyUrl: company.url, companyDescription: company.description || "" })}\n\n`;
            controller.enqueue(encoder.encode(line));
          }

          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          clearTimeout(timeout);
          controller.close();
        } catch (error) {
          clearTimeout(timeout);
          console.error("TinyFish stream error:", error);
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ type: "ERROR", error: error instanceof Error ? error.message : "Stream error" })}\n\n`
            )
          );
          try { controller.close(); } catch {}
        }
      },
    });

    return new Response(responseStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("TinyFish agent error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "TinyFish agent error" },
      { status: 500 }
    );
  }
}
