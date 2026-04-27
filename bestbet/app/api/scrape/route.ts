import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

export const runtime = "nodejs";
export const maxDuration = 300;

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return new Response(sseData({ type: "ERROR", error: "Missing TINYFISH_API_KEY" }), {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const { url, goal } = await req.json();
  if (!url || !goal) {
    return new Response(sseData({ type: "ERROR", error: "url and goal are required" }), {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (payload: unknown) =>
        controller.enqueue(encoder.encode(sseData(payload)));

      try {
        const client = new TinyFish({ apiKey });
        const tfStream = await client.agent.stream({ url, goal });

        for await (const event of tfStream) {
          if (event.type === EventType.STREAMING_URL) {
            send({ type: "STREAMING_URL", streamingUrl: event.streaming_url });
          } else if (event.type === EventType.COMPLETE) {
            if (event.status === RunStatus.COMPLETED) {
              // COMPLETED only means the browser ran without crashing
              // — always validate result content, not just the status
              const result = event.result ?? {};
              send({ type: "COMPLETE", result });
            } else {
              send({ type: "ERROR", error: event.error?.message || "Agent run failed" });
            }
            break;
          }
        }
      } catch (err) {
        send({ type: "ERROR", error: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
