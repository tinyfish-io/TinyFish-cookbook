import { NextRequest } from "next/server";
import { TinyFish, EventType, RunStatus } from "@tiny-fish/sdk";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { websiteUrl, websiteName, exam, agentId } = await req.json();
  const encoder = new TextEncoder();

  const goal = `TASK: Extract ${exam} tutors from this website.

STRICT RULES:
- Read only what is visible on the page. Do NOT scroll or paginate unless a single scroll reveals clearly more tutor listings.
- Do NOT click any links unless they lead directly to a tutor profile already listed on this page.
- Do NOT navigate away from this page.
- Extract up to 10 tutors maximum. Be fast and efficient.
- Skip any tutor where the name is not visible.

Return ONLY this JSON with no extra text:
{
  "tutors": [
    {
      "tutorName": "Full name or display name",
      "examsTaught": ["${exam}"],
      "subjects": ["Math", "Physics", "Verbal"],
      "teachingMode": "Online / Offline / Hybrid or null",
      "location": "City / Country or null",
      "experience": "X years or null",
      "qualifications": "Degrees / certifications or null",
      "pricing": "$XX/hour or null",
      "pastResults": "Score improvements or null",
      "contactMethod": "Email / Phone / Platform booking or null",
      "profileLink": "Direct tutor profile URL or null",
      "sourceWebsite": "${websiteName}"
    }
  ]
}`;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const client = new TinyFish({ apiKey: process.env.TINYFISH_API_KEY });
        const agentStream = await client.agent.stream({ url: websiteUrl, goal });

        for await (const event of agentStream) {
          if (event.type === EventType.STREAMING_URL) {
            send({ type: "STREAMING_URL", agentId, streamingUrl: event.streaming_url });
          } else if (event.type === EventType.PROGRESS) {
            send({ type: "PROGRESS", agentId, message: event.purpose });
          } else if (event.type === EventType.COMPLETE) {
            if (event.status === RunStatus.COMPLETED) {
              const result = event.result as Record<string, unknown> | null;
              const tutors = Array.isArray(result?.tutors) ? result.tutors : [];
              send({ type: "COMPLETE", agentId, resultJson: { tutors } });
            } else {
              send({ type: "ERROR", agentId, message: event.error?.message || "Failed" });
            }
            break;
          }
        }
      } catch (err) {
        send({ type: "ERROR", agentId, message: err instanceof Error ? err.message : "Unknown error" });
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
