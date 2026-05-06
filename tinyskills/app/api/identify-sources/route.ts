import { identifySources } from "@/lib/ai-client";
import type { SourceType } from "@/types";

function hasLlmKey(): boolean {
  return !!(
    process.env.OPENAI_API_KEY?.trim() || process.env.OPENROUTER_API_KEY?.trim()
  );
}

export async function POST(request: Request) {
  try {
    const { topic, enabledSources, maxPerType } = await request.json();

    if (!topic || typeof topic !== "string") {
      return Response.json({ error: "Topic is required" }, { status: 400 });
    }

    const hasTinyFish = !!process.env.TINYFISH_API_KEY?.trim();
    if (!hasTinyFish && !hasLlmKey()) {
      return Response.json(
        {
          error:
            "Configure TINYFISH_API_KEY (Search), and/or OPENAI_API_KEY or OPENROUTER_API_KEY (fallback + synthesis)",
        },
        { status: 500 },
      );
    }

    const sources: SourceType[] = enabledSources || [
      "docs",
      "github",
      "stackoverflow",
      "blog",
    ];

    const identifiedSources = await identifySources(
      topic,
      sources,
      maxPerType || 2,
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
      { status: 500 },
    );
  }
}
