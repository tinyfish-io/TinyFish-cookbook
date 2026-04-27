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

  const { gameTitle } = await req.json();
  if (!gameTitle) {
    return new Response(
      sseData({ type: "ERROR", error: "gameTitle is required" }),
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const url = `https://steamdb.info/search/?a=app&q=${encodeURIComponent(gameTitle)}`;

  const goal = `You are analyzing SteamDB to find the historic lowest price for "${gameTitle}".

STEP 1 - SEARCH & NAVIGATE:
1. You are on the SteamDB search page with results for "${gameTitle}"
2. Find the correct game in the search results (match the title as closely as possible)
3. Click on the game to go to its detail page

STEP 2 - FIND PRICE HISTORY:
1. Look for the "Price History" section or chart on the game's page
2. Find the "Lowest recorded price" or historic low price information
3. Note the date when this historic low occurred and the discount percentage

STEP 3 - COMPARE WITH CURRENT:
1. Find the current Steam price
2. Check if there is an active discount
3. Determine if current price matches or is close to the historic low

STEP 4 - RETURN STRUCTURED DATA:
Return ONLY this JSON, no extra text:
{
  "game_name": "Full game name as shown on SteamDB",
  "historic_lowest_price": "$XX.XX (the all-time lowest price)",
  "historic_lowest_date": "Date when historic low occurred (e.g. June 2024)",
  "historic_lowest_discount": "XX% (the discount when at historic low)",
  "current_steam_price": "$XX.XX (current price on Steam)",
  "current_discount": "XX% or null if no discount",
  "is_current_historic_low": true or false,
  "recommendation": "Brief 1-2 sentence recommendation based on price history"
}

If you cannot find certain information, use null for that field.
Focus on finding the LOWEST price the game has EVER been sold for on Steam.`;

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
          } else if (event.type === EventType.PROGRESS) {
            send({ type: "STATUS", message: event.purpose });
          } else if (event.type === EventType.COMPLETE) {
            if (event.status === RunStatus.COMPLETED) {
              // COMPLETED only means the browser ran without crashing
              // — always validate result content, not just the status
              const raw = event.result;
              let result =
                typeof raw === "string"
                  ? JSON.parse(raw.replace(/```json|```/g, "").trim())
                  : raw;
              if (!result || typeof result !== "object") {
                result = { game_name: gameTitle, is_current_historic_low: false, recommendation: "Could not parse SteamDB result" };
              }
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
