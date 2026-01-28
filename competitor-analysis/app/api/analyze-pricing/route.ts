import { NextRequest, NextResponse } from 'next/server';
import { generateStructured } from '@/lib/ai-client';
import { pricingAnalysisSchema } from '@/lib/ai-schemas';

interface PricingData {
  company: string;
  url: string;
  data: unknown;
}

interface Baseline {
  companyName: string;
  pricingModel: string;
  unitType: string;
  pricePerUnit: number;
  currency: string;
}

export async function POST(request: NextRequest) {
  try {
    const { baseline, pricingData } = await request.json();

    if (!pricingData || !Array.isArray(pricingData) || pricingData.length === 0) {
      return NextResponse.json(
        { error: 'Pricing data array is required' },
        { status: 400 }
      );
    }

    const prompt = buildAnalysisPrompt(baseline, pricingData);

    const analysis = await generateStructured(prompt, pricingAnalysisSchema, {
      system: `You are a competitive pricing analyst expert. Analyze pricing structures and provide actionable insights.

Your task:
1. Categorize each competitor's pricing model
2. Calculate effective prices at different volume levels
3. Normalize all pricing to a common benchmark (cost per 50 browser actions/steps)
4. Identify hidden costs and gotchas
5. Provide market insights and recommendations

Always respond with valid JSON matching the expected schema.`,
    });

    // Calculate your position in the market
    const yourPosition = calculateMarketPosition(baseline, analysis);

    return NextResponse.json({
      analysis: {
        ...analysis,
        yourPosition,
        analyzedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Error analyzing pricing:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to analyze pricing' },
      { status: 500 }
    );
  }
}

function buildAnalysisPrompt(baseline: Baseline | null, pricingData: PricingData[]): string {
  const baselineContext = baseline
    ? `YOUR COMPANY: ${baseline.companyName}, $${baseline.pricePerUnit}/${baseline.unitType}, ${baseline.pricingModel} model`
    : '';

  const competitorSummary = pricingData.map((p) => {
    const data = p.data as { pricingModel?: string; tiers?: Array<{ name: string; price: number | null }> };
    const tiers = data?.tiers || [];
    const tierInfo = tiers.slice(0, 3).map(t => `${t.name}: $${t.price || 'custom'}`).join(', ');
    return `- ${p.company}: ${data?.pricingModel || 'unknown'} model. Tiers: ${tierInfo || 'N/A'}`;
  }).join('\n');

  return `Analyze this competitor pricing data and provide strategic insights.

${baselineContext}

COMPETITORS:
${competitorSummary}

Respond with JSON in this EXACT format:
{
  "insights": ["insight 1", "insight 2", "insight 3", "insight 4", "insight 5"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "pricingModelBreakdown": {"subscription": 2, "freemium": 3, "usage-based": 1},
  "normalizedPrices": {"CompanyName": {"pricingModel": "subscription", "normalizedCostPerWorkflow": 25.00}}
}

Requirements:
- insights: 5 key market insights about pricing trends, competitive positioning, common strategies
- recommendations: 3 strategic recommendations for pricing strategy
- pricingModelBreakdown: count how many competitors use each pricing model type
- normalizedPrices: for each competitor, estimate cost for a typical workflow (assume ~50 actions)`;
}

function calculateMarketPosition(baseline: Baseline | null, analysis: { normalizedPrices?: Record<string, { normalizedCostPerWorkflow: number | null }> }): number {
  if (!baseline || !analysis.normalizedPrices) return 0;

  // Get all normalized prices including yours
  const prices = Object.values(analysis.normalizedPrices)
    .map((c) => c.normalizedCostPerWorkflow)
    .filter((p): p is number => p !== null && p > 0);

  if (prices.length === 0) return 0;

  // Estimate your normalized price (simplified calculation)
  const yourNormalizedPrice = baseline.pricePerUnit;
  prices.push(yourNormalizedPrice);

  // Sort and find your position (1 = cheapest)
  const sorted = [...prices].sort((a, b) => a - b);
  const position = sorted.indexOf(yourNormalizedPrice) + 1;

  return position;
}
