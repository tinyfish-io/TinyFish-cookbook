import { NextRequest, NextResponse } from "next/server";
import type { CompanyFindings, CustomerSegment } from "@/lib/types";
import { callOpenRouterWithRetry, parseOpenRouterJson } from "@/lib/openrouter";

interface SynthesisResult {
  customerSegments: CustomerSegment[];
  insights: string[];
}

export async function POST(request: NextRequest) {
  try {
    const { seedCompany, companyProfile, findings } = await request.json();

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const findingsText = (findings as CompanyFindings[])
      .map(
        (f) => `
Company: ${f.companyName || "Unknown"}
Website: ${f.website || "N/A"}
Overview: ${f.overview || "No overview"}
Customer Types: ${f.customerTypes?.length ? f.customerTypes.join(", ") : "N/A"}
Case Studies: ${f.caseStudies?.length ? f.caseStudies.map((cs) => `${cs.customer} (${cs.industry})`).join(", ") : "None found"}
Testimonials: ${f.testimonials?.length ?? 0} found
Pricing: ${f.pricingTiers?.length ? f.pricingTiers.join(", ") : "N/A"}
Features: ${f.keyFeatures?.length ? f.keyFeatures.join(", ") : "N/A"}
Integrations: ${f.integrations?.length ? f.integrations.join(", ") : "N/A"}`
      )
      .join("\n---\n");

    const messages = [
      {
        role: "system" as const,
        content: `You are a senior market research analyst specializing in customer segmentation and competitive intelligence. You synthesize research data from multiple similar companies into actionable customer segment profiles. Return ONLY valid JSON — no markdown, no code fences.`,
      },
      {
        role: "user" as const,
        content: `Analyze this research data and identify customer segments for companies like ${seedCompany.name}.

SEED COMPANY: ${seedCompany.name} (${seedCompany.url})
INDUSTRY: ${companyProfile.industry}
POSITIONING: ${companyProfile.positioning}
TARGET MARKET: ${companyProfile.targetMarket}

RESEARCH DATA FROM ${(findings as CompanyFindings[]).length} SIMILAR COMPANIES:
${findingsText}

Based on this data, identify:
1. 4-6 distinct customer segments that companies in this space typically serve
2. Key characteristics that define each segment
3. Buying signals that indicate a prospect belongs to each segment
4. Strategic insights for targeting these segments

Return this JSON structure:
{
  "customerSegments": [
    {
      "name": "Segment Name",
      "description": "2-3 sentence description of this segment",
      "characteristics": ["characteristic1", "characteristic2", "characteristic3"],
      "companyExamples": ["company1", "company2"],
      "signals": ["buying signal 1", "buying signal 2"]
    }
  ],
  "insights": [
    "Strategic insight 1",
    "Strategic insight 2",
    "Strategic insight 3"
  ]
}`,
      },
    ];

    const { text } = await callOpenRouterWithRetry(messages, apiKey);
    const result = parseOpenRouterJson<SynthesisResult>(text);

    const customerSegments = (result.customerSegments || []).filter(
      (seg) =>
        seg &&
        seg.name &&
        seg.description &&
        Array.isArray(seg.characteristics)
    );

    const insights = (result.insights || []).filter(
      (i) => typeof i === "string" && i.length > 0
    );

    return NextResponse.json({
      customerSegments,
      insights,
    });
  } catch (error) {
    console.error("Error synthesizing:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to synthesize";

    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      return NextResponse.json(
        { error: "API rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
