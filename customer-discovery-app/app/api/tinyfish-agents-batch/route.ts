import { NextRequest, NextResponse } from "next/server";
import { TinyFish } from "@tiny-fish/sdk";

const AGENT_TIMEOUT = 300000; // 5 minutes

interface AgentRequest {
  id: string;
  company: {
    name: string;
    url: string;
    description?: string;
  };
}

function buildGoal(company: { name: string; url: string }) {
  return `You are a customer discovery agent analyzing ${company.name} (${company.url}).

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
}

export async function POST(request: NextRequest) {
  try {
    const { agents } = (await request.json()) as { agents: AgentRequest[] };

    const apiKey = process.env.TINYFISH_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "TINYFISH_API_KEY is not configured" },
        { status: 500 }
      );
    }

    if (!agents || !Array.isArray(agents) || agents.length === 0) {
      return NextResponse.json(
        { error: "agents array is required" },
        { status: 400 }
      );
    }

    const client = new TinyFish({ apiKey });
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        const totalAgents = agents.length;

        function sendEvent(agentId: string, data: Record<string, unknown>) {
          try {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ ...data, agentId })}\n\n`
              )
            );
          } catch {
            // Controller may be closed
          }
        }

        // Launch ALL agents concurrently on the server side
        const agentPromises = agents.map(async (agent) => {
          const { id: agentId, company } = agent;
          let agentStream: Awaited<ReturnType<typeof client.agent.stream>> | null = null;

          const timeout = setTimeout(async () => {
            if (agentStream) {
              try { await agentStream.close(); } catch {}
            }
            sendEvent(agentId, {
              type: "ERROR",
              error: "Timeout: Agent exceeded 5 minutes",
            });
          }, AGENT_TIMEOUT);

          try {
            sendEvent(agentId, { type: "CONNECTING" });

            agentStream = await client.agent.stream({
              url: company.url,
              goal: buildGoal(company),
            });

            sendEvent(agentId, { type: "BROWSING" });

            // Direct passthrough of SDK events, tagged with agentId and company info
            for await (const event of agentStream) {
              sendEvent(agentId, {
                ...event,
                companyName: company.name,
                companyUrl: company.url,
                companyDescription: company.description || "",
              });
            }

            clearTimeout(timeout);
          } catch (error) {
            clearTimeout(timeout);
            console.error(
              `TinyFish stream error for ${company.name}:`,
              error
            );
            sendEvent(agentId, {
              type: "ERROR",
              error:
                error instanceof Error ? error.message : "Stream error",
            });
          }
        });

        // Wait for ALL agents to finish, then close the stream
        await Promise.allSettled(agentPromises);

        try {
          sendEvent("__batch__", { type: "BATCH_COMPLETE", totalAgents });
          controller.close();
        } catch {
          // Already closed
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Batch agent error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Batch agent error",
      },
      { status: 500 }
    );
  }
}
