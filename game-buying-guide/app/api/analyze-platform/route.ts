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

  const { platformName, url, gameTitle } = await req.json();
  if (!platformName || !url || !gameTitle) {
    return new Response(
      sseData({ type: "ERROR", error: "platformName, url, and gameTitle are required" }),
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const currentDate = new Date().toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const goal = `You are analyzing a game store page to help a user decide whether to buy "${gameTitle}" now or wait.

CURRENT DATE: ${currentDate}

STEP 1 - NAVIGATE & OBSERVE:
Look at the store page and observe:
- Current price displayed
- Any sale/discount indicators and original price
- User ratings and review scores
- Any visible sale end dates or timers
- Bundle options or editions available

STEP 2 - ANALYZE PURCHASE TIMING:
Consider: Is there an active discount? How significant? What do reviews say about value?

STEP 3 - RETURN STRUCTURED ANALYSIS:
Return ONLY this JSON, no extra text:
{
  "platform_name": "${platformName}",
  "store_url": "${url}",
  "current_price": "$XX.XX or regional equivalent",
  "original_price": "$XX.XX if on sale, null otherwise",
  "discount_percentage": "XX% if on sale, null otherwise",
  "is_on_sale": true or false,
  "sale_ends": "Date/time if visible, null otherwise",
  "user_rating": "Rating score if available, null otherwise",
  "review_count": "Number of reviews if visible, null otherwise",
  "recommendation": "buy_now or wait or consider",
  "reasoning": "2-3 sentence explanation of your recommendation",
  "pros": ["Up to 3 reasons to buy from this platform"],
  "cons": ["Up to 3 potential drawbacks or reasons to wait"]
}

RECOMMENDATION GUIDELINES:
- "buy_now": Significant discount (30%+), historic low, or sale ending soon
- "wait": Full price with known upcoming sales, or better deals elsewhere
- "consider": Moderate discount or decent value

If you cannot find certain information, use null for that field.`;

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
                result = { platform_name: platformName, store_url: url, recommendation: "consider", reasoning: "Could not parse result", pros: [], cons: [] };
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
