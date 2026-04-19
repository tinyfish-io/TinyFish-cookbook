import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";
import type { Retailer, ProductData, SSEEvent } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 300;

interface SearchLegoRequest {
  legoSetName: string;
  maxBudget: number;
  retailers: Retailer[];
}

const sseData = (event: SSEEvent) =>
  `data: ${JSON.stringify({ ...event, timestamp: Date.now() })}\n\n`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return new Response(sseData({ type: "error", error: "Missing TINYFISH_API_KEY" }), {
      headers: { "Content-Type": "text/event-stream" },
    });
  }

  const body: SearchLegoRequest = await req.json();
  const { legoSetName, maxBudget, retailers } = body;

  if (!legoSetName || !retailers?.length) {
    return new Response(
      sseData({ type: "error", error: "legoSetName and retailers are required" }),
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => {
        controller.enqueue(encoder.encode(sseData(event)));
      };

      const results: ProductData[] = [];

      try {
        // Run all retailer agents in parallel
        await Promise.allSettled(
          retailers.map(async (retailer) => {
            send({ type: "retailer_start", retailer: retailer.name });

            try {
              const client = new TinyFish({ apiKey });

              const goal = `You are searching for the LEGO set "${legoSetName}" on this retailer page.

TASK:
1. Look at the current page — it may already show the product or be a search results page
2. Find the specific LEGO set that matches "${legoSetName}"
3. Extract the following information

Return ONLY this JSON, no extra text:
{
  "inStock": true or false,
  "price": "99.99" (number only, no currency symbol — use "0" if not found),
  "currency": "USD",
  "shipping": "Free shipping" or "Shipping: $X.XX" or "Check website",
  "productUrl": "full URL to the product page"
}

If the product is not found or out of stock:
{
  "inStock": false,
  "price": "0",
  "currency": "USD",
  "shipping": "N/A",
  "productUrl": "${retailer.url}"
}`;

              const agentStream = await client.agent.stream({ url: retailer.url, goal });

              for await (const event of agentStream) {
                if (event.type === EventType.STREAMING_URL) {
                  send({
                    type: "retailer_start",
                    retailer: retailer.name,
                    streamingUrl: event.streaming_url,
                  });
                } else if (event.type === EventType.PROGRESS) {
                  send({ type: "retailer_step", retailer: retailer.name, step: event.purpose });
                } else if (event.type === EventType.COMPLETE) {
                  if (event.status === RunStatus.COMPLETED) {
                    // COMPLETED only means the browser ran without crashing
                    // — always validate result content, not just the status
                    const raw = event.result;
                    let parsed: Record<string, unknown> | null = null;

                    if (typeof raw === "string") {
                      try {
                        parsed = JSON.parse(raw.replace(/```json|```/g, "").trim());
                      } catch {
                        parsed = null;
                      }
                    } else if (raw && typeof raw === "object") {
                      parsed = raw as Record<string, unknown>;
                    }

                    const data: ProductData = {
                      retailer: retailer.name,
                      inStock: Boolean(parsed?.inStock),
                      price: String(parsed?.price ?? "0"),
                      currency: String(parsed?.currency ?? "USD"),
                      shipping: String(parsed?.shipping ?? "N/A"),
                      productUrl: String(parsed?.productUrl ?? retailer.url),
                    };

                    if (data.inStock) {
                      send({ type: "retailer_stock_found", retailer: retailer.name });
                    }

                    results.push(data);
                    send({ type: "retailer_complete", retailer: retailer.name, data });
                  } else {
                    send({
                      type: "retailer_error",
                      retailer: retailer.name,
                      error: event.error?.message || "Agent run failed",
                    });
                  }
                  break;
                }
              }
            } catch (err) {
              send({
                type: "retailer_error",
                retailer: retailer.name,
                error: err instanceof Error ? err.message : "Scraping failed",
              });
            }
          })
        );

        // Analyze best deal from results using Groq
        if (results.length > 0) {
          const bestDeal = analyzeBestDeal(legoSetName, maxBudget, results);
          send({ type: "analysis_complete", bestDeal });
        } else {
          send({
            type: "analysis_complete",
            bestDeal: {
              bestRetailer: "None",
              reason: "No retailers returned results. Please try again.",
              totalCost: "N/A",
              savings: "N/A",
            },
          });
        }
      } catch (err) {
        send({ type: "error", error: err instanceof Error ? err.message : "Search failed" });
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

// Simple in-memory deal analysis — no LLM needed for this logic
function analyzeBestDeal(
  legoSetName: string,
  maxBudget: number,
  results: ProductData[]
) {
  const inStock = results
    .filter((r) => r.inStock && r.price !== "0")
    .sort((a, b) => parseFloat(a.price) - parseFloat(b.price));

  if (inStock.length === 0) {
    return {
      bestRetailer: "None",
      reason: `${legoSetName} is currently out of stock at all searched retailers. Check back later or try BrickLink for second-hand listings.`,
      totalCost: "N/A",
      savings: "N/A",
      alternativeOptions: [],
    };
  }

  const best = inStock[0];
  const mostExpensive = inStock[inStock.length - 1];
  const savings =
    inStock.length > 1
      ? `$${(parseFloat(mostExpensive.price) - parseFloat(best.price)).toFixed(2)} vs highest price`
      : "N/A";

  const overBudget = parseFloat(best.price) > maxBudget;

  return {
    bestRetailer: best.retailer,
    reason: `${best.retailer} has the lowest price at $${best.price}${best.shipping !== "N/A" ? ` with ${best.shipping}` : ""}.${overBudget ? ` Note: this exceeds your budget of $${maxBudget}.` : ""}`,
    totalCost: `$${best.price} ${best.currency}`,
    savings,
    alternativeOptions: inStock.slice(1, 3).map((r) => ({
      retailer: r.retailer,
      cost: `$${r.price} ${r.currency}`,
      pros: [r.shipping !== "N/A" ? r.shipping : "Check website for shipping"],
    })),
  };
}
