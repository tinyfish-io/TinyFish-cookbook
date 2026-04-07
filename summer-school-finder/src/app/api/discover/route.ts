import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";

export async function POST(req: NextRequest) {
  try {
    const { programType, targetAge, location, duration } = await req.json();

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `Find exactly 7-8 UNIQUE and DIFFERENT official summer school program websites for the following criteria:
- Program Type: ${programType}
- Target Age/Grade: ${targetAge || "Any"}
- Location: ${location}
- Duration: ${duration || "Summer 2025/2026"}

CRITICAL RULES:
1. Return EXACTLY 7-8 different URLs - no duplicates allowed
2. Each URL must be from a DIFFERENT institution/university
3. Do NOT repeat any institution - each must be unique
4. Only include direct program pages, not search results or aggregator sites
5. Prioritize well-known universities and educational organizations

Focus on variety:
- Mix of large universities and smaller institutions
- Different geographic regions within the specified location
- Various program formats (residential, online, hybrid)

Return format: ["url1", "url2", "url3", "url4", "url5", "url6", "url7"]

IMPORTANT: Return ONLY the JSON array with exactly 7-8 unique URLs, no other text.`;

    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant that finds summer school program URLs. You MUST return exactly 7-8 UNIQUE URLs from DIFFERENT institutions. Never repeat the same institution. Return only valid JSON arrays of URLs.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const content = completion.choices[0]?.message?.content || "[]";

    let urls: string[] = [];
    try {
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        urls = JSON.parse(jsonMatch[0]);
      }
    } catch {
      const urlRegex = /https?:\/\/[^\s"'<>\]]+/g;
      urls = content.match(urlRegex) || [];
    }

    // Deduplicate by domain
    const seenDomains = new Set<string>();
    urls = urls
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

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Error in /api/discover:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
