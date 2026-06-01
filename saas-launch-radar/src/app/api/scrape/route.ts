import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { url, title } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });

        const goal = `You are on the landing page or Product Hunt page for the product at ${url} (${title}). Analyze the page to extract:
1. Product Name (string)
2. Tagline (string, brief 1-sentence tagline)
3. Description (string, detailed 2-3 sentence overview)
4. Key Features (array of strings, top 4 core features of the product)
5. Target Audience (array of strings, top 2 audiences, e.g. "Developers", "SaaS Founders")
6. Pricing Models (array of objects with 'tier' (name of plan, e.g., 'Free', 'Pro'), 'price' (monthly price with currency, or 'Free', 'Custom'), 'features' (array of plan features))

Return a clean JSON object containing these 6 exact keys: "ProductName", "Tagline", "Description", "KeyFeatures", "TargetAudience", "PricingModels". Do not include any markdown format wrappers or backticks. Just raw JSON.`;

        const agentStream = await client.agent.stream({ url, goal });

        for await (const event of agentStream) {
          if (event.type === EventType.STARTED) {
            send({ type: "STARTED", run_id: event.run_id });
          } else if (event.type === EventType.STREAMING_URL) {
            send({ type: "STREAMING_URL", streaming_url: event.streaming_url });
          } else if (event.type === EventType.PROGRESS) {
            send({ type: "PROGRESS", purpose: event.purpose });
          } else if (event.type === EventType.COMPLETE) {
            if (event.status === RunStatus.COMPLETED) {
              send({ type: "COMPLETE", status: "COMPLETED", result: event.result });
            } else {
              send({
                type: "COMPLETE",
                status: event.status,
                error: { message: event.error?.message || "Automation failed" },
              });
            }
            break;
          }
        }
      } catch (err) {
        send({
          type: "COMPLETE",
          status: "FAILED",
          error: { message: err instanceof Error ? err.message : "Unknown error" },
        });
      } finally {
        controller.close();
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
}
