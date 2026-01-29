import { NextRequest, NextResponse } from "next/server";

const MINO_API_URL = "https://mino.ai/v1/automation/run-sse";

export async function POST(request: NextRequest) {
  try {
    const { searchUrl, boardName, jobSearchCriteria } = await request.json();

    if (!searchUrl) {
      return NextResponse.json(
        { error: "Search URL is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.MINO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Mino API key not configured" },
        { status: 500 }
      );
    }

    // Goal with specific job criteria to filter relevant jobs
    const goal = `I am looking for: ${jobSearchCriteria || "software engineering jobs"}

Extract ONLY the 6-7 most relevant job listings that match what I'm looking for. Skip jobs that don't match (e.g., if I want frontend developer, skip HR, marketing, admin roles).

For each relevant job, get:
- title: the job title
- company: company name
- location: location
- fullUrl: link to the job posting (MUST be a valid URL)
- description: short description if visible

Return as JSON array with ONLY relevant jobs. Example: [{"title":"Frontend Developer","company":"Google","location":"Singapore","fullUrl":"https://...","description":"..."}]`;

    const response = await fetch(MINO_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: searchUrl,
        goal,
        browser_profile: "stealth",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Mino API error: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    // Stream the SSE response back to the client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        } catch (error) {
          controller.error(error);
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
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Scraping failed" },
      { status: 500 }
    );
  }
}
