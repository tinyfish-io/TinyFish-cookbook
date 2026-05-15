import { NextRequest, NextResponse } from "next/server";
import { TinyFish } from "@tiny-fish/sdk";

export const runtime = "nodejs";

const AGGREGATORS = [
  "reddit", "quora", "youtube", "twitter", "facebook",
  "instagram", "pinterest", "trustpilot", "yelp",
];

export async function POST(req: NextRequest) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });
  }

  const { legoSetName } = await req.json();
  if (!legoSetName) {
    return NextResponse.json({ error: "legoSetName is required" }, { status: 400 });
  }

  try {
    const client = new TinyFish({ apiKey });

    // Two parallel searches — one targeting known retailers, one broader
    const [res1, res2] = await Promise.all([
      client.search.query({
        query: `LEGO "${legoSetName}" buy in stock lego.com OR amazon.com OR target.com OR walmart.com OR bricklink.com OR smythstoys.com OR argos.co.uk OR johnlewis.com OR zavvi.com OR entertainmentearth.com`,
      }),
      client.search.query({
        query: `"${legoSetName}" LEGO set price stock retailer 2025`,
      }),
    ]);

    const allResults = [
      ...(res1.results || []),
      ...(res2.results || []),
    ];

    const seenDomains = new Set<string>();
    const retailers: { name: string; url: string }[] = [];

    for (const r of allResults) {
      try {
        const urlObj = new URL(r.url);
        const domain = urlObj.hostname.replace("www.", "");
        const isAggregator = AGGREGATORS.some((agg) => domain.includes(agg));
        if (isAggregator || seenDomains.has(domain)) continue;
        seenDomains.add(domain);

        // Derive clean retailer name from title
        const name = r.title?.split(/[-|–]/)[0].trim() || domain.split(".")[0];
        retailers.push({ name, url: r.url });
        if (retailers.length >= 12) break;
      } catch {
        // skip malformed URLs
      }
    }

    return NextResponse.json({ retailers });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}
