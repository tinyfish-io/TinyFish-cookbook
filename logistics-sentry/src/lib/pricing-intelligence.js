"use server";

const TINYFISH_API_URL = "https://tinyfish.ai/v1/automation/run-sse";
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

export async function runPricingAnalysis(competitorUrl, options = {}) {
  if (!TINYFISH_API_KEY) throw new Error("Missing TINYFISH_API_KEY environment variable");
  if (!competitorUrl) throw new Error("Missing competitorUrl");

  const goal = `
### MISSION: COMPETITIVE PRICING INTELLIGENCE (Target: ${competitorUrl})

You are a senior Strategic Pricing Analyst. Your mission is to extract the exact pricing and packaging model for the specified competitor.

### EXTRACTION OBJECTIVES
1. **PRICING_MODEL**: Determine how they charge (e.g., Subscription, Consumption-based, Per Seat, Tiered, or Hybrid).
2. **UNIT_PRICING**: Identify the "Core Unit" of pricing (e.g., "per run", "per 1000 tokens", "per active user", "per month").
3. **COST_PER_UNIT**: Extract the numerical cost for the primary unit (if multiple tiers exist, get the entry-level and mid-level pricing).
4. **PACKAGING_DETAILS**: List key inclusions for each tier (e.g., "Basic allows 5 workflows", "Pro includes priority support").

### AUDIT PHASES
1. **PHASE_1: PRICING_DISCOVERY**
   - Navigate to the Pricing page (usually /pricing, /plans, or linked in footer).
   - If not found, look for "Features" or "Get Started" and see if pricing is gated or public.
   - Report: {"phase": "PRICING_DISCOVERY", "status": "completed", "findings": "Located pricing page"}

2. **PHASE_2: DATA_EXTRACTION**
   - Extract every pricing tier name, price, and unit.
   - Look for "Annual" vs "Monthly" toggles; extract BOTH if possible.
   - Identify if there is a "Free" or "Forever Free" tier.
   - Report: {"phase": "DATA_EXTRACTION", "status": "completed", "findings": "Extracted tiers and units"}

3. **PHASE_3: NORMALIZATION_LOGIC**
   - Try to find the "Calculated Cost" for 1,000 standard operations (if applicable to their unit).
   - Report: {"phase": "NORMALIZATION_LOGIC", "status": "completed", "findings": "Normalized pricing data"}

### CONSTRAINTS
- Use 'hover' to reveal tooltips explaining unit limits.
- If pricing is "Contact Sales", mark cost as "Custom" and extract whatever packaging info is public.

### REQUIRED FINAL OUTPUT (JSON)
{
  "competitor_name": string,
  "pricing_model": "SUBSCRIPTION" | "CONSUMPTION" | "TIERED" | "HYBRID" | "CUSTOM",
  "tiers": [
    {
      "name": string,
      "price": number | "CUSTOM",
      "currency": string,
      "billing_cycle": "MONTHLY" | "ANNUAL" | "ONE_TIME",
      "unit": string,
      "key_features": string[]
    }
  ],
  "unit_cost_normalized": {
    "amount": number,
    "unit_description": string
  },
  "our_standing_vs_competitor": "CHEAPER" | "EXPENSIVE" | "COMPARABLE" | "UNIQUE_MODEL",
  "reasoning": string
}
`;

  try {
    const response = await fetch(TINYFISH_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": TINYFISH_API_KEY,
        "Content-Type": "application/json",
      },
      signal: options.signal,
      body: JSON.stringify({
        url: competitorUrl,
        goal: goal,
        browser_profile: "stealth"
      }),
    });

    if (!response.ok) {
      throw new Error(`TinyFish API error for ${competitorUrl}: ${response.statusText}`);
    }

    return response.body;
  } catch (error) {
    console.error(`Agent execution failed for ${competitorUrl}:`, error);
    throw error;
  }
}
