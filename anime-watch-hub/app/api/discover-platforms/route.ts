import { NextRequest, NextResponse } from "next/server";

async function callOpenAI(prompt: string, apiKey: string, maxRetries: number = 3) {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "You are an expert at finding where anime is legally available to stream. Return only valid JSON arrays, no markdown or explanation." },
            { role: "user", content: prompt },
          ],
          temperature: 0.2,
          max_tokens: 4096,
          response_format: { type: "json_object" },
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.choices?.[0]?.message?.content;
        return text;
      }

      if (response.status === 429) {
        const retryDelay = 5000 * (attempt + 1);
        console.log(`Rate limited, waiting ${retryDelay}ms before retry ${attempt + 1}`);
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
        continue;
      }

      const errorBody = await response.text();
      lastError = new Error(`API error ${response.status}: ${errorBody}`);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));
    }
  }

  throw lastError || new Error("OpenAI API call failed after retries");
}

export async function POST(request: NextRequest) {
  try {
    const { animeTitle } = await request.json();

    if (!animeTitle) {
      return NextResponse.json(
        { error: "Anime title is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const prompt = `For the anime titled "${animeTitle}", provide streaming platform URLs where this anime might be available.

Focus on these major platforms:
- Crunchyroll (crunchyroll.com)
- Netflix (netflix.com)
- Amazon Prime Video (amazon.com/Prime-Video)
- Hulu (hulu.com)
- Funimation (funimation.com)
- HIDIVE (hidive.com)
- Disney+ (disneyplus.com)
- Max/HBO Max (max.com)

For each platform, construct the SEARCH URL where someone would search for this anime.

Return a JSON object with a "platforms" key containing an array:
{
  "platforms": [
    {
      "id": "platform-id",
      "name": "Platform Name",
      "searchUrl": "https://platform.com/search?q=anime+title"
    }
  ]
}

Examples of search URLs:
- Crunchyroll: https://www.crunchyroll.com/search?q=attack+on+titan
- Netflix: https://www.netflix.com/search?q=attack%20on%20titan
- Prime Video: https://www.amazon.com/s?k=attack+on+titan&i=instant-video
- Hulu: https://www.hulu.com/search?q=attack+on+titan

Generate search URLs for "${animeTitle}" on at least 6 platforms.`;

    const text = await callOpenAI(prompt, apiKey);

    if (!text) {
      return NextResponse.json(
        { error: "No response from OpenAI" },
        { status: 500 }
      );
    }

    // Parse JSON from response
    let platforms;
    try {
      const parsed = JSON.parse(text);
      platforms = parsed.platforms || parsed;

      if (!Array.isArray(platforms) || platforms.length === 0) {
        throw new Error("Invalid platforms data");
      }

      // Filter out any incomplete platform entries
      platforms = platforms.filter(
        (p: { id?: string; name?: string; searchUrl?: string }) =>
          p && p.id && p.name && p.searchUrl && p.searchUrl.startsWith("http")
      );

      if (platforms.length === 0) {
        throw new Error("No valid platforms found");
      }
    } catch (parseError) {
      console.error("Failed to parse OpenAI response:", text);
      console.error("Parse error:", parseError);
      return NextResponse.json(
        { error: "Failed to parse platform data" },
        { status: 500 }
      );
    }

    return NextResponse.json({ platforms });
  } catch (error) {
    console.error("Error in discover-platforms:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Internal server error";
    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      return NextResponse.json(
        {
          error:
            "OpenAI API rate limit exceeded. Please wait a minute and try again.",
        },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
