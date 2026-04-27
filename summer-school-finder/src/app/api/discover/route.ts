import { NextRequest, NextResponse } from "next/server";
import { TinyFish } from "@tiny-fish/sdk";

export async function POST(req: NextRequest) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "TINYFISH_API_KEY is not configured" },
      { status: 500 }
    );
  }

  try {
    const { programType, targetAge, location, duration } = await req.json();

    const query = `${programType} summer school programs ${location} ${targetAge || ""} ${duration || "2026"}`.trim();

    const client = new TinyFish({ apiKey });
    const data = await client.search.query({ query });

    // Deduplicate by domain
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
