import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { url, goal, agentId } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });
        const agentStream = await client.agent.stream({ url, goal });

        for await (const event of agentStream) {
          if (event.type === EventType.STARTED) {
            send({ type: "STARTED", agentId, run_id: event.run_id });
          } else if (event.type === EventType.STREAMING_URL) {
            send({ type: "STREAMING_URL", agentId, streamingUrl: event.streaming_url });
          } else if (event.type === EventType.PROGRESS) {
            send({ type: "STATUS", agentId, message: event.purpose });
          } else if (event.type === EventType.COMPLETE) {
            if (event.status === RunStatus.COMPLETED) {
              // Parse tenders from result
              let tenders: unknown[] = [];
              const result = event.result as Record<string, unknown> | null;
              if (result?.tenderdetails && Array.isArray(result.tenderdetails)) {
                tenders = result.tenderdetails;
              } else if (Array.isArray(result)) {
                tenders = result;
              }
              send({ type: "COMPLETE", agentId, tenders });
            } else {
              send({ type: "ERROR", agentId, error: event.error?.message || "Automation failed" });
            }
            break;
          }
        }
        send({ type: "DONE", agentId });
      } catch (err) {
        send({ type: "ERROR", agentId, error: err instanceof Error ? err.message : "Unknown error" });
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