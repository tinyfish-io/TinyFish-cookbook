import { NextRequest } from 'next/server';
import type { DetailLevel, PricingTier, CompetitorPricing } from '@/types';

interface Competitor {
  id: string;
  name: string;
  url: string;
}

// Updated scraping goals with detailed tier-by-tier extraction
const SCRAPING_GOALS: Record<DetailLevel, string> = {
  low: `Extract basic pricing information from this page.

Return JSON:
{
  "company": "Company name",
  "pricingModel": "subscription" | "usage-based" | "freemium" | "hybrid",
  "tiers": [
    {"name": "Plan name", "monthlyPrice": 99 or null, "whatsIncluded": "Basic description"}
  ],
  "verificationSource": "Pricing page"
}

Focus only on visible pricing cards. Get tier names and prices quickly.`,

  medium: `Extract pricing information from this page with tier-level details.

Return JSON:
{
  "company": "Company name",
  "pricingModel": "subscription" | "usage-based" | "freemium" | "hybrid" | "enterprise-only",
  "primaryUnit": "credits, runs, ACUs, etc.",
  "tiers": [
    {
      "name": "Plan name",
      "monthlyPrice": 99 or null,
      "annualPrice": 999 or null,
      "units": "Usage allocation (e.g., '100 runs', '10,900 credits')",
      "estTasks": "Estimated tasks possible (e.g., '100', '27-109')",
      "pricePerTask": "Cost per task (e.g., '$0.20', '$0.17-0.70')",
      "whatsIncluded": "What's included (features, support level)",
      "concurrent": "Concurrent usage limits or 'Unknown'",
      "overage": "Overage pricing or 'Not specified'"
    }
  ],
  "verificationSource": "Source URL or page type"
}

Extract pricing model, all tiers with pricing breakdown. Calculate units, estTasks, and pricePerTask for each tier.`,

  high: `Extract ALL pricing tiers with comprehensive detail. This is for a competitive pricing spreadsheet comparing AI automation tools.

For EACH pricing tier (Free, Starter, Basic, Plus, Pro, Team, Enterprise, etc.), extract:

1. TIER NAME: The exact name of the plan/tier

2. MONTHLY PRICE: The price if billed monthly
   - If not shown, use null
   - If "Contact us" or "Custom", use null

3. ANNUAL PRICE: The price if billed annually
   - Include yearly total OR monthly rate when billed annually
   - Format as "$204/year" or "$17/mo billed annually" if shown that way
   - If not shown, use null

4. UNITS INCLUDED: What usage allocation comes with this tier
   - Express as a quantity with unit type (e.g., "100 runs", "10,900 credits", "9 ACUs", "250 browser actions")
   - Include frequency if specified (e.g., "500 credits/month", "100 runs/day")
   - If unlimited, write "Unlimited"
   - If not specified, write "Not specified"

5. ESTIMATED TASKS: How many typical automation tasks can be done with the included units
   - Calculate based on: typical task = 100-400 credits, 1 run, 1 ACU, etc.
   - Express as a number or range (e.g., "100", "27-109", "~50")
   - If you can't estimate, write "Unknown"
   - Show your math in sourceNotes

6. PRICE PER TASK: Calculate the effective cost per task
   - Formula: monthlyPrice / estimatedTasks
   - Express with dollar sign (e.g., "$0.20", "$0.17-0.70", "$2.22")
   - If free tier, write "$0"
   - If can't calculate, write "Unknown"

7. WHAT'S INCLUDED: Additional details beyond raw units
   - Features, integrations, support level
   - Time limits (e.g., "1 ACU = 15 min session")
   - Storage/data limits
   - If unclear, write exactly what the page says

8. CONCURRENT LIMITS: Maximum simultaneous usage
   - Sessions (e.g., "1 session", "5 concurrent sessions")
   - Sources (e.g., "2 sources", "2-3 sources")
   - Users (e.g., "5 seats", "Team features")
   - If not specified, write "Unknown"

9. OVERAGE PRICING: What happens when limits are exceeded
   - "N/A" if free tier with no overages
   - "$X per unit" if pay-as-you-go
   - "No overage (hard limit)" if usage stops at limit
   - "Not specified" if unclear

10. SOURCE NOTES: Important context and calculation notes
    - Show math for estimated tasks (e.g., "10,900 credits / 100-400 per task = 27-109 tasks")
    - Average usage estimates
    - Any conflicting information found
    - Important caveats

Return JSON with this exact structure:
{
  "company": "Full Company Name (e.g., MANUS AI not just Manus)",
  "pricingModel": "subscription" | "usage-based" | "freemium" | "hybrid" | "enterprise-only",
  "primaryUnit": "What they charge per (credits, ACUs, API calls, runs, browser actions, etc.)",
  "unitDefinition": "What one unit means (e.g., '1 ACU = 15 minute compute session', '1 run = single automation execution')",
  "tiers": [
    {
      "name": "Free",
      "monthlyPrice": 0,
      "annualPrice": null,
      "annualPriceNote": null,
      "currency": "USD",
      "units": "1,000 starter + 300/day credits",
      "estTasks": "~100",
      "pricePerTask": "$0",
      "whatsIncluded": "Basic features, community support",
      "concurrent": "1 session",
      "overage": "N/A",
      "sourceNotes": "~10K credits/mo (1000+300*30). At 100 credits/task = ~100 tasks"
    },
    {
      "name": "Basic",
      "monthlyPrice": 19,
      "annualPrice": 190,
      "annualPriceNote": "$190/year (~$15.83/mo)",
      "currency": "USD",
      "units": "10,900 credits/month",
      "estTasks": "27-109",
      "pricePerTask": "$0.17-0.70",
      "whatsIncluded": "Priority support, API access",
      "concurrent": "2 sources",
      "overage": "$0.02/credit",
      "sourceNotes": "10,900 credits / 100-400 per task = 27-109 tasks. $19/27=$0.70, $19/109=$0.17"
    }
  ],
  "verificationSource": "Verified from: [pricing page URL or Help Center]",
  "dataQualityNotes": "Any conflicting info or data quality concerns",
  "additionalNotes": "Any other important pricing info not in tiers"
}

IMPORTANT:
- ALWAYS calculate units, estTasks, and pricePerTask for each tier - these are critical for comparison
- If you find conflicting information, include ALL versions with sources
- Be precise about units (credits vs ACUs vs sessions vs requests vs runs)
- Note if pricing is per user, per workspace, per organization
- Include any promotional pricing or trial information
- Show your calculation work in sourceNotes`,
};

export async function POST(request: NextRequest) {
  console.log('\n\n========== SCRAPE-PRICING API CALLED ==========\n');

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let isClosed = false;

  const sendEvent = async (data: object) => {
    if (isClosed) return;
    try {
      const encoded = encoder.encode(`data: ${JSON.stringify(data)}\n\n`);
      await writer.write(encoded);
      console.log('[SSE] Sent event:', data);
    } catch (e) {
      console.error('[SSE] Failed to send event:', e);
      isClosed = true;
    }
  };

  const closeWriter = async () => {
    if (isClosed) return;
    try {
      isClosed = true;
      await writer.close();
    } catch {
      // Already closed
    }
  };

  // Start processing in background
  (async () => {
    try {
      const { competitors, detailLevel = 'high' } = await request.json();
      console.log('[Scrape] Received competitors:', competitors?.length, 'Detail level:', detailLevel);

      if (!competitors || !Array.isArray(competitors) || competitors.length === 0) {
        await sendEvent({ type: 'error', error: 'Competitors array is required', timestamp: Date.now() });
        await closeWriter();
        return;
      }

      await sendEvent({
        type: 'step',
        step: `Starting to scrape ${competitors.length} competitor pricing pages...`,
        timestamp: Date.now(),
      });

      // Send initial start events for all competitors immediately
      for (const comp of competitors) {
        await sendEvent({
          type: 'competitor_start',
          competitor: comp.name,
          id: comp.id,
          timestamp: Date.now(),
        });
      }

      // Scrape all competitors in parallel
      console.log('[Scrape] Starting parallel scraping for', competitors.length, 'competitors');
      const results = await Promise.allSettled(
        competitors.map((comp: Competitor) => scrapePricingPage(comp, sendEvent, detailLevel as DetailLevel))
      );
      console.log('[Scrape] All scraping completed');

      // Collect successful results
      const successfulResults: object[] = [];
      const failedResults: string[] = [];

      results.forEach((result, index) => {
        const comp = competitors[index];
        if (result.status === 'fulfilled' && result.value) {
          successfulResults.push(result.value);
        } else {
          failedResults.push(comp.name);
        }
      });

      await sendEvent({
        type: 'all_complete',
        data: {
          successful: successfulResults.length,
          failed: failedResults.length,
          failedCompetitors: failedResults,
          results: successfulResults,
        },
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error in scrape-pricing:', error);
      await sendEvent({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      });
    } finally {
      await closeWriter();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Transform Mino response to new schema
function transformToNewSchema(
  rawData: Record<string, unknown>,
  competitorName: string,
  url: string
): CompetitorPricing {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tiers: PricingTier[] = ((rawData.tiers as any[]) || []).map((tier: any) => ({
    name: tier.name || 'Unknown',
    monthlyPrice: tier.monthlyPrice ?? tier.price ?? null,
    annualPrice: tier.annualPrice ?? null,
    annualPriceNote: tier.annualPriceNote || undefined,
    currency: tier.currency || 'USD',
    // New fields for spreadsheet comparison
    units: tier.units || tier.includedUnits || 'Not specified',
    estTasks: tier.estTasks || tier.estimatedTasks || 'Unknown',
    pricePerTask: tier.pricePerTask || 'Unknown',
    confidence: 'low' as const, // Default to low confidence for scraped data - user verifies
    // Existing fields
    whatsIncluded: tier.whatsIncluded || tier.features?.join(', ') || 'Not specified',
    concurrent: tier.concurrent || tier.limits || 'Not specified',
    overage: tier.overage || tier.overagePrice || 'Not specified',
    sourceNotes: tier.sourceNotes || '',
    verified: false,
    // Legacy fields
    price: tier.price,
    billingPeriod: tier.period || tier.billingPeriod,
    unit: tier.unit,
    limits: tier.limits,
    includedUnits: tier.includedUnits,
    overagePrice: tier.overagePrice,
    features: tier.features,
    isEnterprise: tier.isEnterprise,
    hasFreeTrial: tier.hasFreeTrial,
  }));

  return {
    company: (rawData.company as string) || competitorName,
    url,
    tiers,
    verificationSource: (rawData.verificationSource as string) || 'Auto-scraped',
    dataQualityNotes: rawData.dataQualityNotes as string | undefined,
    overallVerified: false,
    scrapedAt: new Date().toISOString(),
    // Legacy fields
    pricingModel: rawData.pricingModel as CompetitorPricing['pricingModel'],
    primaryUnit: rawData.primaryUnit as string | undefined,
    unitDefinition: rawData.unitDefinition as string | undefined,
    additionalNotes: rawData.additionalNotes as string | undefined,
  };
}

async function scrapePricingPage(
  competitor: Competitor,
  sendEvent: (data: object) => Promise<void>,
  detailLevel: DetailLevel = 'high'
): Promise<{ company: string; url: string; data: CompetitorPricing; scrapeDuration: number } | null> {
  const startTime = Date.now();
  console.log(`[Scrape] Starting ${competitor.name} at ${competitor.url}`);

  // Send step update
  await sendEvent({
    type: 'competitor_step',
    competitor: competitor.name,
    id: competitor.id,
    step: `Connecting to ${competitor.name}...`,
    timestamp: startTime,
  });

  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    await sendEvent({
      type: 'competitor_error',
      competitor: competitor.name,
      id: competitor.id,
      error: 'TINYFISH_API_KEY not configured',
      timestamp: Date.now(),
    });
    return null;
  }

  try {
    // Get the appropriate scraping goal based on detail level
    const goal = SCRAPING_GOALS[detailLevel];
    console.log(`[Scrape] Using ${detailLevel} detail level for ${competitor.name}`);

    const minoResponse = await fetch('https://agent.tinyfish.ai/v1/automation/run-sse', {
      method: 'POST',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: competitor.url,
        goal,
        browser_profile: 'lite',
      }),
    });

    if (!minoResponse.ok) {
      throw new Error(`Mino API returned ${minoResponse.status}`);
    }

    const reader = minoResponse.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';
    let finalResult: { company: string; url: string; data: CompetitorPricing; scrapeDuration: number } | null = null;
    let streamingUrl: string | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const event = JSON.parse(line.slice(6));

            // Capture streaming URL and send update
            if (event.streamingUrl && !streamingUrl) {
              streamingUrl = event.streamingUrl;
              console.log(`[Scrape] ${competitor.name} got streamingUrl:`, streamingUrl);
              await sendEvent({
                type: 'competitor_streaming',
                competitor: competitor.name,
                id: competitor.id,
                streamingUrl,
                timestamp: Date.now(),
              });
            }

            // Forward step updates
            if (event.type === 'STEP' || event.purpose || event.action) {
              const stepMessage = event.purpose || event.action || event.message || 'Processing...';
              await sendEvent({
                type: 'competitor_step',
                competitor: competitor.name,
                id: competitor.id,
                step: stepMessage,
                timestamp: Date.now(),
              });
            }

            // Handle completion
            if (event.type === 'COMPLETE' && event.status === 'COMPLETED') {
              // Transform to new schema
              const transformedData = transformToNewSchema(
                event.resultJson || {},
                competitor.name,
                competitor.url
              );

              finalResult = {
                company: competitor.name,
                url: competitor.url,
                data: transformedData,
                scrapeDuration: Date.now() - startTime,
              };

              await sendEvent({
                type: 'competitor_complete',
                competitor: competitor.name,
                id: competitor.id,
                data: transformedData,
                scrapeDuration: Date.now() - startTime,
                timestamp: Date.now(),
              });
              break;
            }

            // Handle errors
            if (event.type === 'ERROR' || event.status === 'FAILED') {
              throw new Error(event.message || 'Extraction failed');
            }
          } catch (parseError) {
            if (!(parseError instanceof SyntaxError)) throw parseError;
          }
        }
      }

      if (finalResult) break;
    }

    return finalResult;
  } catch (error) {
    console.error(`Error scraping ${competitor.name}:`, error);
    await sendEvent({
      type: 'competitor_error',
      competitor: competitor.name,
      id: competitor.id,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    });
    return null;
  }
}
