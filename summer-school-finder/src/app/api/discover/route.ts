import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { programType, targetAge, location, duration } = await req.json();

    const query = `${programType} summer school programs ${location} ${targetAge || ""} ${duration || "2026"}`.trim();

    const response = await fetch(
      `https://api.search.tinyfish.ai?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "X-API-Key": process.env.TINYFISH_API_KEY!,
        },
      }
    );

    if (!response.ok) {
      return NextResponse.json({ urls: [] }, { status: 500 });
    }

    const data = await response.json();

    // Deduplicate by domain, same as before
    const seenDomains = new Set<string>();
    const urls: string[] = (data.results || [])
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

    return NextResponse.json({ urls });
  } catch (error) {
    console.error("Error in /api/discover:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
