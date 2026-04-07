import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus, BrowserProfile } from "@tiny-fish/sdk";

const client = new TinyFish(); // Reads TINYFISH_API_KEY from environment

interface ScrapeRequest {
  url: string;
  goal: string;
  useStealthMode?: boolean;
}

async function runAgent(
  { url, goal, useStealthMode = false }: ScrapeRequest,
  onProgress?: (message: string) => void,
  onStreamingUrl?: (url: string) => void
): Promise<{ success: boolean; resultJson: unknown; error?: string }> {
  try {
    const stream = await client.agent.stream({
      url,
      goal,
      browser_profile: useStealthMode ? BrowserProfile.STEALTH : BrowserProfile.LITE,
    });

    for await (const event of stream) {
      // Forward streaming URL as soon as it's available
      if (event.type === EventType.STREAMING_URL && onStreamingUrl) {
        onStreamingUrl(event.streaming_url);
      }

      // Forward progress messages
      if (event.type === EventType.PROGRESS && onProgress) {
        onProgress(event.purpose ?? "");
      }

      // Return result on completion
      if (event.type === EventType.COMPLETE) {
        if (event.status === RunStatus.COMPLETED) {
          return { success: true, resultJson: event.result_json };
        } else {
          return {
            success: false,
            resultJson: null,
            error: `Run failed with status: ${event.status}`,
          };
        }
      }
    }

    return { success: false, resultJson: null, error: "Stream ended without completion event" };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, resultJson: null, error: message };
  }
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();

  const sendEvent = (stream: TransformStreamDefaultController, data: object) => {
    stream.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  };

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      const body: ScrapeRequest = await req.json();
      const { url, goal, useStealthMode } = body;

      if (!url || !goal) {
        writer.getWriter().write(
          encoder.encode(
            `data: ${JSON.stringify({ type: "ERROR", error: "url and goal are required" })}\n\n`
          )
        );
        writer.close();
        return;
      }

      const result = await runAgent(
        { url, goal, useStealthMode },
        (message) => {
          writer.write(
            encoder.encode(`data: ${JSON.stringify({ type: "STATUS", message })}\n\n`)
          );
        },
        (streamingUrl) => {
          writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ type: "STREAMING_URL", streamingUrl })}\n\n`
            )
          );
        }
      );

      writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "COMPLETE",
            success: result.success,
            resultJson: result.resultJson,
            error: result.error,
          })}\n\n`
        )
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: "ERROR", error: message })}\n\n`)
      );
    } finally {
      writer.close();
    }
  })();

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
