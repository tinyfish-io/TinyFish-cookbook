export const runtime = "nodejs";
export const maxDuration = 300;

import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

function makeErrorStream(message: string): Response {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(sseData({ type: "ERROR", message })));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
    },
  });
}

export async function POST(request: Request) {
  let url: string, goal: string;
  try {
    ({ url, goal } = await request.json());
  } catch {
    return makeErrorStream("Invalid request body");
  }

  if (!url || !goal) return makeErrorStream("url and goal are required");

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return makeErrorStream("TINYFISH_API_KEY is not configured in .env.local");

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const enqueue = (payload: unknown) =>
        controller.enqueue(encoder.encode(sseData(payload)));

      try {
        const client = new TinyFish({ apiKey });
        let resultFound = false;

        const tfStream = await client.agent.stream(
          { url, goal },
          {
            onStreamingUrl: (event) => {
              enqueue({ type: "STREAMING_URL", streamingUrl: event.streaming_url });
            },
            onProgress: (event) => {
              enqueue({ type: "STEP", purpose: event.purpose });
            },
            onComplete: (event) => {
              resultFound = true;
              if (event.status === RunStatus.FAILED) {
                enqueue({ type: "ERROR", message: event.error?.message ?? "Agent run failed" });
              } else {
                enqueue({ type: "COMPLETE", resultJson: event.result ?? null });
              }
            },
          }
        );

        // Drain stream so callbacks fire
        for await (const event of tfStream) {
          if (event.type === EventType.COMPLETE && !resultFound) {
            resultFound = true;
            if (event.status === RunStatus.FAILED) {
              enqueue({ type: "ERROR", message: event.error?.message ?? "Agent run failed" });
            } else {
              enqueue({ type: "COMPLETE", resultJson: event.result ?? null });
            }
          }
        }

        if (!resultFound) {
          enqueue({ type: "ERROR", message: "Agent stream ended without a result" });
        }
      } catch (error) {
        enqueue({
          type: "ERROR",
          message: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
