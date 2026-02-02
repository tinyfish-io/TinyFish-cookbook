import { identifySources } from "@/lib/ai-client";
import type { SourceType } from "@/types";

export async function POST(request: Request) {
  try {
    const { topic, enabledSources, maxPerType } = await request.json();

    if (!topic || typeof topic !== "string") {
      return Response.json(
        { error: "Topic is required" },
        { status: 400 }
      );
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return Response.json(
        { error: "OpenRouter API key not configured" },
        { status: 500 }
      );
    }

    // Default to all sources if not specified
    const sources: SourceType[] = enabledSources || [
      "docs",
      "github",
      "stackoverflow",
      "blog",
    ];

    const identifiedSources = await identifySources(
      topic,
      sources,
      maxPerType || 2
    );

    return Response.json({
      sources: identifiedSources,
    });
  } catch (error) {
    console.error("Error in identify-sources:", error);
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to identify sources",
      },
      { status: 500 }
    );
  }
}
