import { NextRequest, NextResponse } from 'next/server';
import { generateStructured } from '@/lib/ai-client';
import { urlGenerationSchema } from '@/lib/ai-schemas';

export async function POST(request: NextRequest) {
  try {
    const { competitors } = await request.json();

    if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
      return NextResponse.json(
        { error: 'Competitors array is required' },
        { status: 400 }
      );
    }

    // Filter to only companies without URLs
    const needsUrls = competitors.filter((c: { name: string; url?: string }) => !c.url);

    if (needsUrls.length === 0) {
      return NextResponse.json({ competitors });
    }

    const prompt = `You are a web research expert. Generate the direct pricing page URLs for these companies.

COMPANIES:
${needsUrls.map((c: { name: string }, i: number) => `${i + 1}. ${c.name}`).join('\n')}

REQUIREMENTS:
- Return the most direct URL to the pricing page (not homepage)
- Common patterns: /pricing, /plans, /pricing-plans, /buy
- For well-known SaaS companies, use exact URLs you're confident about
- Mark confidence as:
  * "high": Known exact URL
  * "medium": Likely URL pattern
  * "low": Best guess

Return JSON in this exact format:
{
  "companies": [
    {"name": "Company Name", "url": "https://company.com/pricing", "confidence": "high"}
  ]
}`;

    const result = await generateStructured(prompt, urlGenerationSchema, {
      system: 'You are a web research expert that finds pricing page URLs for companies. Always respond with valid JSON.',
    });

    // Merge generated URLs back with original competitors
    const urlMap = new Map(result.companies.map(c => [c.name.toLowerCase(), c]));

    const enrichedCompetitors = competitors.map((c: { name: string; url?: string }) => {
      if (c.url) return c;
      const generated = urlMap.get(c.name.toLowerCase());
      if (generated) {
        return {
          ...c,
          url: generated.url,
          generatedUrl: generated.url,
          urlConfidence: generated.confidence,
        };
      }
      return c;
    });

    return NextResponse.json({ competitors: enrichedCompetitors });
  } catch (error) {
    console.error('Error generating URLs:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate URLs' },
      { status: 500 }
    );
  }
}
