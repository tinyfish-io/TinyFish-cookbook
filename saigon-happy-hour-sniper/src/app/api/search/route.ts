export const runtime = "nodejs";
export const maxDuration = 800;

import { TinyFish, EventType } from "@tiny-fish/sdk";
import { DISTRICT_SITES, GOAL_PROMPT } from "@/lib/district-sites";
import type { District } from "@/lib/types";

type SearchBody = { district: District };

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;
const elapsedSeconds = (startedAt: number) => ((Date.now() - startedAt) / 1000).toFixed(1);

async function runAgentForSite(
  url: string,
  apiKey: string,
  enqueue: (payload: unknown) => void,
): Promise<boolean> {
  const startedAt = Date.now();
  console.log(`[TINYFISH] Starting: ${url}`);

  try {
    const client = new TinyFish({ apiKey });
    let resultFound = false;

    const stream = await client.agent.stream(
      { url, goal: GOAL_PROMPT },
      {
        onStreamingUrl: (event) => {
          console.log("[TINYFISH] streaming_url", event.streaming_url);
          enqueue({
            type: "STREAMING_URL",
            siteUrl: url,
            streamingUrl: event.streaming_url,
          });
        },
        onComplete: (event) => {
          console.log("[TINYFISH] onComplete fired, status:", event.status, "has result:", !!event.result);
          // Fire result immediately via callback — don't wait for for-await
          if (event.result) {
            resultFound = true;
            enqueue({ type: "VENUE_RESULT", siteUrl: url, venue: event.result });
          } else if (event.status === "COMPLETED") {
            // Completed but result is null — still mark streaming done
            resultFound = true;
            enqueue({ type: "VENUE_RESULT", siteUrl: url, venue: { venue_name: url, deals: [] } });
          }
          enqueue({ type: "STREAMING_DONE", siteUrl: url });
        },
      },
    );

    // Drain the stream so callbacks fire (for-await drives the generator)
    for await (const event of stream) {
      // Also handle COMPLETE here as fallback in case callback didn't fire
      if (event.type === EventType.COMPLETE && !resultFound) {
        console.log("[TINYFISH] for-await COMPLETE, status:", event.status);
        const result = event.result ?? { venue_name: url, deals: [] };
        resultFound = true;
        enqueue({ type: "VENUE_RESULT", siteUrl: url, venue: result });
        enqueue({ type: "STREAMING_DONE", siteUrl: url });
      }
    }

    if (!resultFound) {
      console.warn(`[TINYFISH] No result for: ${url}`);
      enqueue({ type: "STREAMING_DONE", siteUrl: url });
    }

    console.log(`[TINYFISH] Complete: ${url} (${elapsedSeconds(startedAt)}s)`);
    return resultFound;
  } catch (error) {
    console.error(`[TINYFISH] Failed: ${url}`, error);
    enqueue({ type: "STREAMING_DONE", siteUrl: url });
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: SearchBody;
  try {
    body = (await request.json()) as SearchBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { district } = body;
  const sites = DISTRICT_SITES[district];
  if (!sites?.length) return Response.json({ error: "Unsupported district" }, { status: 400 });

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) return Response.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });

  const searchStartedAt = Date.now();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(": ping\n\n"));
      const enqueue = (payload: unknown) => controller.enqueue(encoder.encode(sseData(payload)));

      // Send total upfront so progress bar works immediately
      enqueue({ type: "SEARCH_STARTED", total: sites.length });

      const tasks = sites.map((url) => (async () => runAgentForSite(url, apiKey, enqueue))());
      const settled = await Promise.allSettled(tasks);
      const succeeded = settled.filter(
        (r): r is PromiseFulfilledResult<boolean> => r.status === "fulfilled" && r.value,
      ).length;

      enqueue({
        type: "SEARCH_COMPLETE",
        total: sites.length,
        succeeded,
        elapsed: `${elapsedSeconds(searchStartedAt)}s`,
      });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Transfer-Encoding": "chunked",
    },
  });
}
