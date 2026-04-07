import { NextRequest } from "next/server";
import { TinyFish } from "@tiny-fish/sdk";

const client = new TinyFish();

export async function POST(req: NextRequest) {
  const { url, siteName, scholarshipType, university, region, agentId } =
    await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ event, agentId, ...( data as object) })}\n\n`)
        );
      };

      try {
        const goal = `Go to this scholarship listing page and extract scholarship details.
URL: ${url}
Looking for: ${scholarshipType} scholarships${university ? ` at ${university}` : ""}${region ? ` in ${region}` : ""}.

STRICT RULES:
- Do NOT scroll more than once
- Do NOT click any links or navigate away from this page
- Extract up to 3 scholarships visible on the page immediately
- Only include scholarships with at least a name visible
- Return immediately after extracting

For each scholarship found, extract:
- name: scholarship name
- provider: organization offering it
- type: type (Merit-Based, Need-Based, STEM, etc.)
- university: university name if applicable
- region: geographic region
- amount: award amount (e.g. "$5,000" or "Full tuition")
- deadline: application deadline
- description: 1-2 sentence description
- eligibility: array of 2-4 eligibility requirements
- applicationRequirements: array of 2-4 required documents
- applicationLink: direct application URL
- additionalInfo: any other key info

Return JSON: { "scholarships": [...] }`;

        const tfStream = await client.agent.stream({ url, goal });

        for await (const event of tfStream) {
          if (event.type === "STREAMING_URL") {
            send("STREAMING_URL", { streamingUrl: event.streaming_url });
          } else if (event.type === "PROGRESS") {
            send("PROGRESS", { message: event.purpose });
          } else if (event.type === "COMPLETE") {
            const raw = event.result || "{}";
            let scholarships: unknown[] = [];
            try {
              const clean = raw.replace(/```json|```/g, "").trim();
              const parsed = JSON.parse(clean);
              scholarships = parsed.scholarships || [];
            } catch {
              scholarships = [];
            }
            send("COMPLETE", { scholarships });
          }
        }
      } catch (err) {
        send("ERROR", { error: String(err) });
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
