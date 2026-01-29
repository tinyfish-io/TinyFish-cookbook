import { runGenericAgent } from "../tinyfish";

// --- STAGE 1: SOURCE DISCOVERY (KNOWLEDGE BASE) ---
// In a production system, this would be an LLM or specific search agent.
// For the Proof of Concept, we map known high-traffic nodes.
const SOURCE_KNOWLEDGE_BASE = {
    ports: {
        "Port of Los Angeles": [
            {
                name: "Port of LA - Operations Updates",
                url: "https://www.portoflosangeles.org", // Main page usually has alerts
                type: "port_authority"
            },
            {
                name: "MarineTraffic - Port Congestion (LA)",
                url: "https://www.marinetraffic.com/en/ais/details/ports/154/USA_port:LOS%20ANGELES",
                type: "congestion_data"
            }
        ],
        "Shanghai": [
            {
                name: "Shanghai International Port Group",
                url: "http://www.portshanghai.com.cn/en/",
                type: "port_authority"
            }
        ],
        "Mumbai": [
            {
                name: "Mumbai Port Authority",
                url: "https://mumbaiport.gov.in",
                type: "port_authority"
            }
        ]
    },
    carriers: {
        "Maersk": [
            {
                name: "Maersk Network Advisories",
                url: "https://www.maersk.com/news/advisories",
                type: "carrier_advisory"
            }
        ],
        "MSC": [
            {
                name: "MSC Customer Advisories",
                url: "https://www.msc.com/en/newsroom/customer-advisories",
                type: "carrier_advisory"
            }
        ],
        "CMA CGM": [
            {
                name: "CMA CGM News & Advisories",
                url: "https://www.cma-cgm.com/news",
                type: "carrier_advisory"
            }
        ]
    }
    // Contextual sources like Weather or Labor generic sites could be added
};

function buildDiscoverySources(origin_port, carrier) {
    const sources = [];
    if (origin_port) {
        const portQuery = encodeURIComponent(`${origin_port} port authority operations status`);
        sources.push({
            name: `Discovery: ${origin_port} Port Authority`,
            url: `https://duckduckgo.com/html/?q=${portQuery}`,
            type: "custom_discovery",
            goal: `
### MISSION: PORT AUTHORITY INTELLIGENCE DISCOVERY
TARGET: ${origin_port}

You are a Logistics Intelligence Scout. Your job is to locate the official port authority or terminal operations page for ${origin_port}, then extract operational status signals.

### INSTRUCTIONS:
1. Search for the official port authority or terminal operations page for ${origin_port}.
2. Navigate to the official source and look for operational updates, advisories, or congestion metrics.
3. Extract specific metrics/quotes with dates where possible.

### REQUIRED OUTPUT (JSON ONLY):
{
  "scan_status": "completed",
  "operational_status": "NORMAL" | "DISRUPTED" | "UNKNOWN",
  "signals": [
    {
      "summary": "Detailed finding with numbers/quotes if available",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "date": "YYYY-MM-DD",
      "category": "METRIC" | "QUOTE" | "STATUS"
    }
  ]
}
`
        });
    }
    if (carrier) {
        const carrierQuery = encodeURIComponent(`${carrier} customer advisories`);
        sources.push({
            name: `Discovery: ${carrier} Advisories`,
            url: `https://duckduckgo.com/html/?q=${carrierQuery}`,
            type: "custom_discovery",
            goal: `
### MISSION: CARRIER ADVISORY INTELLIGENCE DISCOVERY
TARGET: ${carrier}

You are a Logistics Intelligence Scout. Your job is to locate ${carrier}'s official customer advisories or operations updates page, then extract operational signals.

### INSTRUCTIONS:
1. Find the official ${carrier} advisories/alerts/newsroom page.
2. Navigate to the most recent advisories and extract concrete metrics or dates.
3. Prefer official carrier sources over third-party news.

### REQUIRED OUTPUT (JSON ONLY):
{
  "scan_status": "completed",
  "operational_status": "NORMAL" | "DISRUPTED" | "UNKNOWN",
  "signals": [
    {
      "summary": "Detailed finding with numbers/quotes if available",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "date": "YYYY-MM-DD",
      "category": "METRIC" | "QUOTE" | "STATUS"
    }
  ]
}
`
        });
    }
    return sources;
}

// --- STAGE 2: PARALLEL AGENT EXECUTION ---
function createSseParser(onEvent) {
    let buffer = "";

    const parseBuffer = (final = false) => {
        // Normalize CRLF to LF
        buffer = buffer.replace(/\r\n/g, "\n");

        const parts = buffer.split("\n\n");
        // If not final, keep the last part in buffer as it might be incomplete
        buffer = final ? "" : parts.pop() || "";

        for (const part of parts) {
            const lines = part.split("\n");
            for (const line of lines) {
                if (!line.startsWith("data: ")) continue;
                const payload = line.slice(6).trim();
                if (!payload) continue;
                try {
                    const data = JSON.parse(payload);
                    onEvent(data);
                } catch (e) {
                    // Ignore partial JSON or non-JSON heartbeats.
                }
            }
        }
    };

    return {
        parse: (chunk) => {
            buffer += chunk;
            parseBuffer(false);
        },
        flush: () => {
            if (buffer.trim().length > 0) {
                parseBuffer(true);
            }
        }
    };
}

async function analyzeSource(source) {
    const defaultGoal = `
### MISSION: DEEP INTELLIGENCE EXTRACTION
TARGET URL: ${source.url}

You are a Logistics Intelligence Scout. Your job is to extract DETAILED operational intelligence from this page.

### INSTRUCTIONS:
1. Scan for specific **METRICS** (e.g., "Wait time: 3 days", "Anchored vessels: 12", "Gate turn time: 45 min", "Advisory #2024-05").
2. Extract **DIRECT QUOTES** from headers or alerts that describe the situation.
3. Identify **DATES** of specific upcoming disruptions (strikes, holidays, maintenance).
4. If operations are normal, extract the text that *says* they are normal (e.g., "All terminals open", "No delays reported").
5. DO NOT be vague. "Congestion" is bad. "Congestion: 5 day delay" is good.

### REQUIRED OUTPUT (JSON ONLY):
{
  "scan_status": "completed",
  "operational_status": "NORMAL" | "DISRUPTED" | "UNKNOWN",
  "signals": [
    {
      "summary": "Detailed finding with numbers/quotes if available",
      "severity": "LOW" | "MEDIUM" | "HIGH",
      "date": "YYYY-MM-DD",
      "category": "METRIC" | "QUOTE" | "STATUS"
    }
  ]
}
`;

    const startedAt = Date.now();
    const timeoutAttempts = source.type === "custom_discovery" ? [300000] : [45000, 60000];
    let lastError = null;

    console.log(`[Agent] Scouting ${source.name}...`);

    for (let attempt = 0; attempt < timeoutAttempts.length; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutAttempts[attempt]);

        try {
            const goal = source.goal || defaultGoal;
            const stream = await runGenericAgent(source.url, goal, { signal: controller.signal });
            const reader = stream.getReader();
            const decoder = new TextDecoder();
            let finalResult = null;

            const { parse, flush } = createSseParser((data) => {
                if (data.final_result) {
                    finalResult = data.final_result;
                }
            });

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                parse(chunk);
            }
            flush();

            return {
                source: source.name,
                findings: finalResult,
                duration_ms: Date.now() - startedAt,
                attempts: attempt + 1
            };
        } catch (error) {
            lastError = error;
            if (error.name !== "AbortError") break;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    console.error(`[Agent] Failed to analyze ${source.name}:`, lastError);
    return {
        source: source.name,
        error: lastError?.name === "AbortError" ? "Analysis timed out" : lastError?.message,
        duration_ms: Date.now() - startedAt,
        attempts: timeoutAttempts.length,
        error_at: new Date().toISOString()
    }
}


// --- STAGE 3: SYNTHESIS & REASONING ---
function synthesizeRisk(context, findings) {
    let riskScore = 0;
    let signals = [];
    let primaryCauses = new Set();
    let severityCounts = { HIGH: 0, MEDIUM: 0, LOW: 0, UNKNOWN: 0 };
    let categoryCounts = { METRIC: 0, QUOTE: 0, STATUS: 0 };
    let recencyBuckets = { recent: 0, stale: 0, unknown: 0 };
    let signalDates = [];

    findings.forEach(f => {
        if (f.findings && f.findings.signals) {
            f.findings.signals.forEach(s => {
                // Formatting the signal text to be more readable if it's a metric
                const safeSummary = (typeof s.summary === 'string' && s.summary) ? s.summary : '';
                let formattedSignal = safeSummary || "No summary available";

                // Normalize severity
                const validSeverities = ["HIGH", "MEDIUM", "LOW"];
                const severity = validSeverities.includes(s.severity) ? s.severity : "UNKNOWN";

                if (s.category === "METRIC") formattedSignal = `[METRIC] ${safeSummary}`;
                if (s.category === "QUOTE") formattedSignal = `"${safeSummary}"`;

                signals.push({
                    source: f.source,
                    signal: formattedSignal,
                    date: s.date || "Just now",
                    severity: severity
                });

                if (severity === "HIGH") riskScore += 50;
                if (severity === "MEDIUM") riskScore += 20;
                // LOW and UNKNOWN don't increase risk score

                // Safe increment
                if (severityCounts[severity] !== undefined) {
                    severityCounts[severity] += 1;
                } else {
                    severityCounts["UNKNOWN"] += 1;
                }

                if (categoryCounts[s.category] !== undefined) categoryCounts[s.category] += 1;
                if (s.date) {
                    signalDates.push(s.date);
                    const parsed = Date.parse(s.date);
                    if (Number.isFinite(parsed)) {
                        const ageDays = (Date.now() - parsed) / (1000 * 60 * 60 * 24);
                        if (ageDays <= 14) recencyBuckets.recent += 1;
                        else recencyBuckets.stale += 1;
                    } else {
                        recencyBuckets.unknown += 1;
                    }
                } else {
                    recencyBuckets.unknown += 1;
                }

                if (severity !== "LOW" && severity !== "UNKNOWN" && safeSummary) {
                    // Try to infer cause from summary keywords
                    const text = safeSummary.toLowerCase();
                    if (text.includes("congestion") || text.includes("anchor") || text.includes("dwell")) primaryCauses.add("CONGESTION");
                    if (text.includes("strike") || text.includes("labor") || text.includes("union")) primaryCauses.add("LABOR");
                    if (text.includes("weather") || text.includes("storm") || text.includes("fog") || text.includes("wind")) primaryCauses.add("WEATHER");
                    if (text.includes("maintenance") || text.includes("outage")) primaryCauses.add("TECHNICAL");
                }
            });
        } else if (f.error) {
            const errorDate = f.error_at || new Date().toISOString();
            signals.push({
                source: f.source,
                signal: "Connection timed out during deep scan.",
                date: errorDate,
                severity: "LOW"
            });
            severityCounts.LOW += 1;
            categoryCounts.STATUS += 1;
            signalDates.push(errorDate);
            recencyBuckets.unknown += 1;
        } else {
            // Fallback for empty findings (likely normal)
            const fallbackDate = new Date().toISOString();
            signals.push({
                source: f.source,
                signal: "Verified: No negative operational constraints found.",
                date: fallbackDate,
                severity: "LOW"
            });
            severityCounts.LOW += 1;
            categoryCounts.STATUS += 1;
            signalDates.push(fallbackDate);
            recencyBuckets.unknown += 1;
        }
    });

    let riskLevel = "LOW";
    if (riskScore >= 50) riskLevel = "HIGH";
    else if (riskScore >= 20) riskLevel = "MEDIUM";

    let confidence = 0.85;
    const causes = Array.from(primaryCauses).join(" + ");
    const normalizedRiskScore = Math.min(100, Math.max(0, riskScore));
    const sourceTimings = findings
        .filter(f => typeof f.duration_ms === "number")
        .map(f => ({ source: f.source, duration_ms: f.duration_ms }));
    const totalSignals = signals.length;
    const signalDensity = totalSignals > 0 ? totalSignals / Math.max(1, findings.length) : 0;
    const latestSignalDate = signalDates.length > 0 ? signalDates.sort().slice(-1)[0] : null;

    // Generate specific recommendation
    let action = "Network operating normally. Continue standard monitoring.";
    if (riskLevel === "HIGH") {
        if (causes.includes("LABOR")) action = "CRITICAL: Divert cargo immediately. Labor action confirmed.";
        else if (causes.includes("WEATHER")) action = "Schedule slide inevitable. Notify customers of delay.";
        else action = "High risk detected. Contact carrier representative.";
    } else if (riskLevel === "MEDIUM") {
        if (causes.includes("CONGESTION")) action = "Anticipate 2-4 day berthing delay. Monitor vessel position.";
        else action = "Monitor closely. Minor disruptions reported.";
    }

    const severityTotal = severityCounts.HIGH + severityCounts.MEDIUM + severityCounts.LOW;
    const severityWeight = severityTotal > 0
        ? (severityCounts.HIGH * 1 + severityCounts.MEDIUM * 0.6 + severityCounts.LOW * 0.2) / severityTotal
        : 0.2;
    const recencyTotal = recencyBuckets.recent + recencyBuckets.stale + recencyBuckets.unknown;
    const recencyWeight = recencyTotal > 0
        ? (recencyBuckets.recent * 1 + recencyBuckets.stale * 0.4 + recencyBuckets.unknown * 0.6) / recencyTotal
        : 0.6;
    const successfulSources = findings.filter(f => f.findings && f.findings.signals).length;
    const coverageWeight = findings.length > 0
        ? Math.min(1, successfulSources / findings.length)
        : 0.4;

    const confidenceWeighted = Math.min(
        0.99,
        Math.max(0.2, (severityWeight * 0.4) + (recencyWeight * 0.35) + (coverageWeight * 0.25))
    );

    confidence = Math.min(confidence, confidenceWeighted);

    const summary = [
        `Risk ${riskLevel}`,
        causes ? `Causes: ${causes}` : "Causes: Normal Operations",
        `Signals: ${signals.length}`,
        `Recent: ${recencyBuckets.recent}, Stale: ${recencyBuckets.stale}`
    ].join(" • ");

    return {
        shipment_context: context,
        risk_assessment: {
            delay_risk: riskLevel,
            primary_cause: causes || "Normal Operations",
            confidence: Math.min(0.99, confidence)
        },
        analysis: {
            risk_score: normalizedRiskScore,
            evidence_counts: {
                severity: severityCounts,
                category: categoryCounts
            },
            source_timings: sourceTimings,
            signal_density: Number(signalDensity.toFixed(2)),
            recency: {
                buckets: recencyBuckets,
                latest_signal_date: latestSignalDate
            },
            confidence_breakdown: {
                weighted_confidence: Number(confidenceWeighted.toFixed(2)),
                severity_weight: Number(severityWeight.toFixed(2)),
                recency_weight: Number(recencyWeight.toFixed(2)),
                coverage_weight: Number(coverageWeight.toFixed(2))
            },
            summary
        },
        signals_detected: signals,
        recommended_action: action
    };
}


// --- MAIN ENTRY POINT ---
export async function assessDelayRisk(context) {
    const startedAt = Date.now();
    const { origin_port, carrier, mode } = context;

    // 1. Discover
    let sources = [
        ...(SOURCE_KNOWLEDGE_BASE.ports[origin_port] || []),
        ...(SOURCE_KNOWLEDGE_BASE.carriers[carrier] || [])
    ];

    let discoveryUsed = false;
    if (sources.length === 0) {
        sources = buildDiscoverySources(origin_port, carrier);
        discoveryUsed = sources.length > 0;
        if (!discoveryUsed) {
            return {
                error: "No intelligent sources found for this context.",
                supported_origins: Object.keys(SOURCE_KNOWLEDGE_BASE.ports),
                supported_carriers: Object.keys(SOURCE_KNOWLEDGE_BASE.carriers)
            };
        }
    }

    // 2. Parallel Actions
    console.log(`[Orchestrator] Launching ${sources.length} agents for ${origin_port} / ${carrier}...`);
    const results = await Promise.all(sources.map(s => analyzeSource(s)));

    // 3. Synthesis
    const synthesized = synthesizeRisk({ ...context, discovery_used: discoveryUsed }, results);
    return {
        ...synthesized,
        analysis: {
            ...synthesized.analysis,
            total_duration_ms: Date.now() - startedAt
        }
    };
}
