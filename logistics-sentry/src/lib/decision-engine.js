// Rules moved to database or external config in future

export function evaluateRisk(agentOutput) {
    // Determine safe default if output is missing
    if (!agentOutput) return "PAUSE";

    // Combine agent output with business logic rules
    if (agentOutput.confidence_score < 40) return "ESCALATE";
    if (agentOutput.recommended_action === "ESCALATE") return "ESCALATE"; // Explicit strict check
    if (agentOutput.recommended_action === "ESCALATE") return "ESCALATE";
    if (agentOutput.recommended_action === "PAUSE") return "PAUSE";

    return agentOutput.recommended_action || "PAUSE";
}
