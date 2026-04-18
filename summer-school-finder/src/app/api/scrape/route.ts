import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { url, goal } = await req.json();

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
