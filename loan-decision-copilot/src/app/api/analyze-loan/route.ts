import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

export const runtime = "nodejs";
export const maxDuration = 300;

const LOAN_TYPE_MAP: Record<string, string> = {
  personal: "personal loan",
  home: "home loan / mortgage",
  education: "education loan / student loan",
  business: "business loan / SME loan",
};

const sseData = (payload: unknown) => `data: ${JSON.stringify(payload)}\n\n`;

export async function POST(req: NextRequest) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return new Response(
      sseData({ type: "ERROR", message: "Missing TINYFISH_API_KEY" }),
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const { url, bankName, loanType } = await req.json();
  if (!url || !bankName) {
    return new Response(
      sseData({ type: "ERROR", message: "url and bankName are required" }),
      { headers: { "Content-Type": "text/event-stream" } }
    );
  }

  const loanDescription = LOAN_TYPE_MAP[loanType] || loanType || "loan";

  const goal = `You are analyzing a bank's ${loanDescription} page for comparison purposes.

STEP 1 - NAVIGATE:
If this is not the specific loan product page, look for links to ${loanDescription} and navigate there.

STEP 2 - EXTRACT INFORMATION:
Carefully analyze the page and extract:
- Interest rate ranges (APR, fixed/variable rates)
- Loan tenure/repayment period options
- Eligibility requirements (income, credit score, etc.)
- Fees (processing, origination, prepayment, etc.)
- Key benefits highlighted by the bank
- Any drawbacks or limitations mentioned
- How clear and transparent the terms are

STEP 3 - RETURN ANALYSIS:
Return ONLY a JSON object:
{
  "bankName": "${bankName}",
  "interestRateRange": "X% - Y% APR or Not specified",
  "tenure": "X to Y years or Not specified",
  "eligibility": ["requirement 1", "requirement 2"],
  "fees": ["fee 1", "fee 2"],
  "benefits": ["benefit 1", "benefit 2"],
  "drawbacks": ["drawback 1"],
  "clarity": "Clear/Moderate/Unclear",
  "description": "Brief 2-3 sentence summary",
  "score": 7
}

Be objective. If information is not available, use "Not specified".`;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) =>
        controller.enqueue(encoder.encode(sseData(data)));

      try {
        send({ type: "STATUS", message: "Connecting to browser agent..." });

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
                result = { bankName, description: "Could not parse result", score: 5 };
              }

              send({ type: "COMPLETE", result });
            } else {
              send({ type: "ERROR", message: event.error?.message || "Agent run failed" });
            }
            break;
          }
        }

        send({ type: "DONE" });
      } catch (err) {
        send({
          type: "ERROR",
          message: err instanceof Error ? err.message : "Unknown error",
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
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
