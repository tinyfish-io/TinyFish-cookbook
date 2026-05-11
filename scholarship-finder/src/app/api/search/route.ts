import { NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

export const runtime = "nodejs";

interface ScholarshipUrl {
  name: string;
  url: string;
  description: string;
}

const FALLBACK_URLS: ScholarshipUrl[] = [
  { name: "Fastweb", url: "https://www.fastweb.com/college-scholarships", description: "Scholarship search engine" },
  { name: "Scholarships.com", url: "https://www.scholarships.com/financial-aid/college-scholarships/", description: "Scholarship database" },
  { name: "College Board", url: "https://bigfuture.collegeboard.org/scholarships", description: "College Board scholarships" },
  { name: "Niche", url: "https://www.niche.com/colleges/scholarships/", description: "Niche scholarships" },
  { name: "Peterson's", url: "https://www.petersons.com/scholarship-search.aspx", description: "Peterson's scholarships" },
];

export async function POST(req: NextRequest) {
  const { scholarshipType, university, region } = await req.json();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const today = new Date();
        const currentDate = today.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const locationContext = [
          university ? `at ${university}` : "",
          region ? `in ${region}` : "",
        ].filter(Boolean).join(" ");

        // STEP 1 — Gemini discovers scholarship URLs
        send({ type: "STEP", step: 1, message: "Finding scholarship websites..." });

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        let scholarshipUrls: ScholarshipUrl[] = [];
        try {
          const prompt = `You are a scholarship research assistant. Return only valid JSON arrays, no markdown fences.

Find 5-8 official scholarship provider websites for ${scholarshipType} scholarships ${locationContext}.
Return ONLY a JSON array:
[{"name":"Site Name","url":"https://...","description":"Brief description"}]
Include university financial aid pages, major foundations (Fulbright, Gates, Rhodes), government programs, and aggregators. Use real URLs.`;

          const result = await model.generateContent(prompt);
          const content = result.response.text() || "";
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          if (jsonMatch) scholarshipUrls = JSON.parse(jsonMatch[0]);
        } catch {
          scholarshipUrls = FALLBACK_URLS;
        }

        if (!scholarshipUrls.length) scholarshipUrls = FALLBACK_URLS;

        send({ type: "URLS_FOUND", urls: scholarshipUrls, message: `Found ${scholarshipUrls.length} sources to search` });
        send({ type: "STEP", step: 2, message: `Launching ${scholarshipUrls.length} browser agents...` });

        const goal = `You are searching for ${scholarshipType} scholarships ${locationContext}.

CURRENT DATE: ${currentDate}

STRICT RULES:
- Read only what is visible on the page. Do NOT scroll, paginate, or navigate away.
- Only include scholarships with deadlines AFTER ${currentDate}.
- If deadline is not visible, still include the scholarship but set deadline to "Check website".
- Skip entries with no name. Extract up to 5 scholarships. Be fast.

Return ONLY valid JSON, no extra text:
{
  "scholarships": [
    {
      "id": "unique-slug-1",
      "name": "Scholarship Name",
      "provider": "Organization",
      "amount": "$X,XXX or Not specified",
      "deadline": "Month Day, Year or Check website",
      "eligibility": ["Requirement 1"],
      "description": "Brief description",
      "applicationRequirements": ["Document 1"],
      "additionalInfo": "",
      "applicationLink": "https://...",
      "region": "${region || "International"}",
      "university": "${university || "Various"}",
      "type": "${scholarshipType}"
    }
  ]
}`;

        // STEP 2 — run all TinyFish agents in parallel
        const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });
        const allScholarships: Record<string, unknown>[] = [];

        const agentPromises = scholarshipUrls.map(async (site, index) => {
          const agentId = `agent-${index}`;
          send({ type: "AGENT_STARTED", agentId, siteName: site.name, siteUrl: site.url, description: site.description });

          try {
            const agentStream = await client.agent.stream({ url: site.url, goal });

            for await (const event of agentStream) {
              if (event.type === EventType.STREAMING_URL) {
                send({ type: "AGENT_STREAMING", agentId, siteName: site.name, streamingUrl: event.streaming_url });
              } else if (event.type === EventType.PROGRESS) {
                send({ type: "AGENT_PROGRESS", agentId, siteName: site.name, message: event.purpose });
              } else if (event.type === EventType.COMPLETE) {
                if (event.status === RunStatus.COMPLETED) {
                  const result = event.result as Record<string, unknown> | null;
                  const found = Array.isArray(result?.scholarships)
                    ? (result.scholarships as Record<string, unknown>[]).filter(
                        (s) => s.name && s.name !== "Not specified" && s.name !== ""
                      )
                    : [];
                  allScholarships.push(...found);
                  send({ type: "AGENT_COMPLETE", agentId, siteName: site.name, scholarships: found });
                } else {
                  send({ type: "AGENT_ERROR", agentId, siteName: site.name, error: event.error?.message || "Agent failed" });
                }
                return;
              }
            }
          } catch (err) {
            send({ type: "AGENT_ERROR", agentId, siteName: site.name, error: err instanceof Error ? err.message : "Failed" });
          }
        });

        await Promise.all(agentPromises);

        send({
          type: "ALL_COMPLETE",
          scholarships: allScholarships,
          searchSummary: `Found ${allScholarships.length} scholarship${allScholarships.length !== 1 ? "s" : ""} from ${scholarshipUrls.length} sources.`,
        });

      } catch (err) {
        send({ type: "ERROR", error: err instanceof Error ? err.message : "Search failed" });
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
