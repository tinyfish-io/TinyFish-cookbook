"use server";

const TINYFISH_API_URL = "https://tinyfish.ai/v1/automation/run-sse";
const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY;

export async function runAgent(sku, intendedUpdate, contextUrl, options = {}) {
    const targetUrl = contextUrl || "https://inventory-demo-dashboard.com";
    const missionType = intendedUpdate ? `cross-verify the safety of an intended stock update ("${intendedUpdate}")` : `perform a general integrity audit to ensure data consistency across sources`;

    const goal = `
### MISSION: DEEP INTEGRITY AUDIT (SKU: ${sku})

You are a senior Autonomous Inventory Auditor. Your mission is to ${missionType} by investigating multiple data sources.
${contextUrl ? `\n**CRITICAL CONTEXT**: The user has provided a specific Source of Truth URL: ${contextUrl}. You MUST navigate to this URL to verify the "Actual Stock" against the dashboard's "Reported Stock".\n` : ''}

### AUDIT PHASES
1. **PHASE_1: SURFACE_SCAN (Dashboard)**
   - Navigate to the inventory dashboard at ${targetUrl}.
   - Locate SKU: ${sku} and extract "Reported Stock".
   - Report: {"phase": "SURFACE_SCAN", "status": "completed", "findings": "Extracted reported stock"}

2. **PHASE_2: SOURCE_VERIFICATION (Audit Logs / External Source)**
   ${contextUrl ? `- **Navigate to the provided Source URL**: ${contextUrl}\n   - Search for ${sku} in the external sheet/feed.\n   - Compare the "Stock" value there with the Dashboard value.` : `- Find and navigate to the "Audit Logs" or "History" section.\n   - Search for ${sku} and check the last 5 manual entries.\n   - Identify if the "User ID" or "Source" of recent changes looks suspicious or anomalous.`}
   - Report: {"phase": "SOURCE_VERIFICATION", "status": "completed", "findings": "Verified log/source integrity"}

3. **PHASE_3: BUSINESS_CONTEXT (Sales Analytics)**
   - Navigate to "Sales Analytics" or "Orders" view.
   ${intendedUpdate ? `- Determine if the "Sales Velocity" for ${sku} justifies the intended update: "${intendedUpdate}".\n   - Check for pending shipments that might conflict with this update.` : `- Analyze "Sales Velocity" for ${sku} to detect any anomalies vs reported stock.\n   - Identify if current stock levels are dangerously low or high based on sales trends.`}
   - Report: {"phase": "BUSINESS_CONTEXT", "status": "completed", "findings": "Analyzed sales alignment"}

4. **PHASE_4: SYNTHESIS & VERDICT**
   - Combine all findings.
   - If there is ANY mismatch between reported stock, audit logs (or external source), and sales trends, you MUST recommend PAUSE or ESCALATE.

### CONSTRAINTS
- DO NOT act on the update. Your role is AUDIT ONLY.
- Use 'hover' and 'scroll' to ensure you don't miss dense table data.
- Prioritize correctness-first reasoning.

### REQUIRED FINAL OUTPUT (JSON)
{
  "current_stock": number,
  "recent_changes": string,
  "sales_velocity": "STABLE" | "HIGH" | "LOW",
  "audit_trail_valid": boolean,
  "risk_flags": string[],
  "confidence_score": number,
  "recommended_action": "PROCEED" | "PAUSE" | "ESCALATE",
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
                url: targetUrl,
                goal: goal,
                browser_profile: "stealth"
            }),
        });

        if (!response.ok) {
            throw new Error(`TinyFish API error: ${response.statusText}`);
        }

        // Since this is SSE, we return the stream or a reader
        return response.body;
    } catch (error) {
        console.error("Agent execution failed:", error);
        throw error;
    }
}

export async function runGenericAgent(url, goal, options = {}) {
    try {
        const response = await fetch(TINYFISH_API_URL, {
            method: "POST",
            headers: {
                "X-API-Key": TINYFISH_API_KEY,
                "Content-Type": "application/json",
            },
            signal: options.signal,
            body: JSON.stringify({
                url: url,
                goal: goal,
                browser_profile: "stealth"
            }),
        });

        if (!response.ok) {
            throw new Error(`TinyFish API error: ${response.statusText}`);
        }

        return response.body;
    } catch (error) {
        console.error("Agent execution failed:", error);
        throw error;
    }
}
