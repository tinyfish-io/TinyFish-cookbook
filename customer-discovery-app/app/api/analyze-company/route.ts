import { NextRequest, NextResponse } from "next/server";
import type { SimilarCompany } from "@/lib/types";
import { callOpenRouterWithRetry, parseOpenRouterJson } from "@/lib/openrouter";

interface AnalysisResult {
  companyProfile: {
    industry: string;
    positioning: string;
    targetMarket: string;
  };
  similarCompanies: SimilarCompany[];
}

export async function POST(request: NextRequest) {
  try {
    const { companyName, companyUrl } = await request.json();

    if (!companyName || !companyUrl) {
      return NextResponse.json(
        { error: "Company name and URL are required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENROUTER_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const messages = [
      {
        role: "system" as const,
        content: `You are an expert market research analyst specializing in competitive intelligence and customer discovery. You have deep knowledge of SaaS, technology companies, and business models across industries. Return ONLY valid JSON — no markdown, no code fences.`,
      },
      {
        role: "user" as const,
        content: `Analyze the company "${companyName}" (${companyUrl}).

1. Provide a brief company profile:
   - Industry/sector they operate in
   - Their market positioning and value proposition
   - Who their target market is

2. Find 10 similar companies that:
   - Operate in the same or adjacent industry
   - Serve similar customer segments
   - Have comparable business models
   - Are REAL companies with working websites (not fictional)

For each similar company provide:
- name: Company name
- url: Website URL (must be real and working, starting with https://)
- description: 1-2 sentence description
- industry: Their industry/category
- targetAudience: Who they sell to

Return this exact JSON structure:
{
  "companyProfile": {
    "industry": "string",
    "positioning": "string",
    "targetMarket": "string"
  },
  "similarCompanies": [
    {
      "name": "Company Name",
      "url": "https://company.com",
      "description": "Brief description",
      "industry": "Industry",
      "targetAudience": "Target audience"
    }
  ]
}

Return exactly 10 similar companies.`,
      },
    ];

    const { text } = await callOpenRouterWithRetry(messages, apiKey);
    const result = parseOpenRouterJson<AnalysisResult>(text);

    if (!result.companyProfile || !result.similarCompanies) {
      return NextResponse.json(
        { error: "Invalid response structure from AI" },
        { status: 500 }
      );
    }

    const similarCompanies: SimilarCompany[] = result.similarCompanies
      .filter((c) => c && c.name && c.url && c.url.startsWith("http"))
      .slice(0, 10);

    return NextResponse.json({
      companyProfile: result.companyProfile,
      similarCompanies,
    });
  } catch (error) {
    console.error("Error analyzing company:", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to analyze company";

    if (errorMessage.includes("429") || errorMessage.includes("quota")) {
      return NextResponse.json(
        { error: "API rate limit exceeded. Please wait a moment and try again." },
        { status: 429 }
      );
    }

    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
