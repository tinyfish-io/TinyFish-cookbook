import { assessDelayRisk } from "@/lib/logistics/agent";

function normalizeRiskResult(result) {
    if (!result || typeof result !== "object") {
        return {
            error: "Invalid agent output.",
            risk_assessment: { delay_risk: "UNKNOWN", primary_cause: "Unknown", confidence: 0 },
            signals_detected: [],
            recommended_action: "ESCALATE"
        };
    }

    if (result.error) {
        return {
            ...result,
            risk_assessment: result.risk_assessment || { delay_risk: "UNKNOWN", primary_cause: "Unknown", confidence: 0 },
            signals_detected: Array.isArray(result.signals_detected) ? result.signals_detected : [],
            recommended_action: result.recommended_action || "ESCALATE",
            analysis: result.analysis || {}
        };
    }

    return {
        ...result,
        risk_assessment: result.risk_assessment || { delay_risk: "UNKNOWN", primary_cause: "Unknown", confidence: 0 },
        signals_detected: Array.isArray(result.signals_detected) ? result.signals_detected : [],
        recommended_action: result.recommended_action || "PAUSE",
        analysis: result.analysis || {}
    };
}

export async function POST(req) {
    try {
        const body = await req.json();
        const { origin_port, carrier, mode } = body;

        if (!origin_port || !carrier) {
            return new Response(JSON.stringify({
                error: "Missing required fields: origin_port, carrier",
                example: { origin_port: "Port of Los Angeles", carrier: "Maersk", mode: "Sea" }
            }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const result = await assessDelayRisk({ origin_port, carrier, mode });
        const normalized = normalizeRiskResult(result);

        return new Response(JSON.stringify(normalized, null, 2), {
            status: 200,
            headers: { "Content-Type": "application/json" }
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
