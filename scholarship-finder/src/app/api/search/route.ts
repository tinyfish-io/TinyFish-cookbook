import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

export const runtime = "nodejs";

const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });

// STEP 1: Use TinyFish Search API to discover relevant program URLs
async function discoverUrls(
  programType: string,
  targetAge: string,
  location: string,
  duration: string
): Promise<string[]> {
  const query =
    `${programType} summer school programs ${location} ${targetAge || ""} ${duration || "2026"}`.trim();

  const response = await fetch(
    `https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}`,
    {
      headers: { "X-API-Key": process.env.TINYFISH_API_KEY! },
    }
  );

  if (!response.ok) return [];

  const data = await response.json();

  // Deduplicate by domain
  const seenDomains = new Set<string>();
  return (data.results || [])
    .map((r: { url: string }) => r.url)
    .filter((url: string) => {
      try {
        const domain = new URL(url).hostname.replace("www.", "");
        if (seenDomains.has(domain)) return false;
        seenDomains.add(domain);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 8);
}

function buildGoal(programType: string, targetAge: string, location: string): string {
  return `You are on a summer school program page. Extract up to 2-3 program listings from what is visible on screen.

STRICT RULES — follow exactly:
- Read only what is already visible on the page. Do NOT scroll, paginate, or load more content.
- Do NOT click any links, buttons, or navigation elements unless the specific program details are hidden behind a single clearly-labelled "Details" or "Apply" button on THIS page only.
- Do NOT navigate to any other page. Do NOT follow external links.
- Extract immediately and return. Be fast.
- If a field is not visible on the current page, set it to "Not specified". Do not search for it.
- Target criteria: ${programType} program, ${location}, for ${targetAge || "students"}.
- If the page has multiple programs listed, extract up to 3 of the most relevant ones.
- Only include programs that have at least a Program Name visible. Do not return empty entries.

Return ONLY this JSON with no extra text:
{
  "summerSchools": [
    {
      "Program Name": "",
      "Institution": "",
      "Location": "",
      "Dates": "",
      "Duration": "",
      "Target Age / Grade": "",
      "Program Type / Focus": "",
      "Tuition / Fees": "",
      "Application Deadline": "",
      "Official Program URL": "",
      "Brief Description": "",
      "Eligibility Criteria": "",
      "Notes / Special Requirements": ""
    }
  ]
}`;
}

export async function POST(req: NextRequest) {
  const { programType, targetAge, location, duration } = await req.json();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        // STEP 1: Discover URLs
        send({ type: "DISCOVER", message: "Searching for programs..." });

        const urls = await discoverUrls(programType, targetAge, location, duration);

        if (urls.length === 0) {
          send({ type: "ERROR", message: "No programs found. Try adjusting your filters." });
          return;
        }

        send({ type: "URLS", urls });

        // STEP 2: Run agents in parallel, stream each result as it arrives
        const goal = buildGoal(programType, targetAge, location);

        await Promise.all(
          urls.map(async (url, idx) => {
            const agentId = `agent-${idx}`;

            send({ type: "AGENT_STARTED", agentId, url });

            try {
              const agentStream = await client.agent.stream({ url, goal });

              for await (const event of agentStream) {
                if (event.type === EventType.STREAMING_URL) {
                  send({ type: "STREAMING_URL", agentId, streaming_url: event.streaming_url });
                } else if (event.type === EventType.PROGRESS) {
                  send({ type: "PROGRESS", agentId, purpose: event.purpose });
                } else if (event.type === EventType.COMPLETE) {
                  if (event.status === RunStatus.COMPLETED) {
                    send({ type: "COMPLETE", agentId, status: "COMPLETED", result: event.result });
                  } else {
                    send({
                      type: "COMPLETE",
                      agentId,
                      status: event.status,
                      error: { message: event.error?.message || "Automation failed" },
                    });
                  }
                  break; // always break after COMPLETE
                }
              }
            } catch (err) {
              send({
                type: "COMPLETE",
                agentId,
                status: "FAILED",
                error: { message: err instanceof Error ? err.message : "Unknown error" },
              });
            }
          })
        );

        send({ type: "DONE" });
      } catch (err) {
        send({
          type: "ERROR",
          message: err instanceof Error ? err.message : "Search failed",
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
