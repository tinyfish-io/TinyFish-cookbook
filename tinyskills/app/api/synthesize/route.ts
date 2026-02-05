import { synthesizeSkill } from "@/lib/ai-client";
import type { IdentifiedSource } from "@/types";

export async function POST(request: Request) {
  try {
    const { topic, scrapedContent } = (await request.json()) as {
      topic: string;
      scrapedContent: Array<{ source: IdentifiedSource; content: string }>;
    };

    if (!topic || typeof topic !== "string") {
      return Response.json({ error: "Topic is required" }, { status: 400 });
    }

    if (
      !scrapedContent ||
      !Array.isArray(scrapedContent) ||
      scrapedContent.length === 0
    ) {
      return Response.json(
        { error: "No scraped content provided" },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return Response.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    // Filter out empty content
    const validContent = scrapedContent.filter(
      (item) => item.content && item.content.trim().length > 0
    );

    if (validContent.length === 0) {
      return Response.json(
        { error: "No valid content to synthesize" },
        { status: 400 }
      );
    }

    const result = await synthesizeSkill(topic, validContent);

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Error in synthesize:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to synthesize skill",
      },
      { status: 500 }
    );
  }
}
