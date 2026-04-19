import { NextRequest, NextResponse } from "next/server";
import { TinyFish } from "@tiny-fish/sdk";

export const runtime = "nodejs";

const LOAN_TYPE_MAP: Record<string, string> = {
  personal: "personal loan",
  home: "home loan mortgage",
  education: "education loan student loan",
  business: "business loan SME loan",
};

const AGGREGATORS = [
  "nerdwallet", "bankrate", "creditkarma", "lendingtree",
  "magnifymoney", "valuepenguin", "money.com", "forbes",
  "investopedia", "thebalance", "finder.com", "mybanktracker",
  "reddit", "quora", "yelp", "yellowpages",
];

export async function POST(req: NextRequest) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing TINYFISH_API_KEY" }, { status: 500 });
  }

  const { loanType, location } = await req.json();
  if (!loanType || !location) {
    return NextResponse.json({ error: "loanType and location are required" }, { status: 400 });
  }

  const loanDescription = LOAN_TYPE_MAP[loanType] || loanType;

  try {
    const client = new TinyFish({ apiKey });

    // Run two targeted searches in parallel to maximise local bank coverage
    const [res1, res2] = await Promise.all([
      client.search.query({
        query: `banks offering ${loanDescription} in ${location}`,
      }),
      client.search.query({
        query: `${loanDescription} apply online ${location} bank`,
      }),
    ]);

    const allResults = [
      ...(res1.results || []),
      ...(res2.results || []),
    ];

    const seenDomains = new Set<string>();
    const banks: { name: string; url: string }[] = [];

    for (const r of allResults) {
      try {
        const domain = new URL(r.url).hostname.replace("www.", "");
        const isAggregator = AGGREGATORS.some((agg) => domain.includes(agg));
        if (isAggregator || seenDomains.has(domain)) continue;
        seenDomains.add(domain);
        banks.push({ name: r.title || domain, url: r.url });
        if (banks.length >= 7) break;
      } catch {
        // skip malformed URLs
      }
    }

    return NextResponse.json({ banks });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Discovery failed" },
      { status: 500 }
    );
  }
}