import { NextResponse } from 'next/server';
import { saveSnapshot, getLastSnapshot, getHistory, HistoricalSnapshot } from '@/lib/store';
import type { ConfidenceInfo, ScanResult, SignalSummary, SourceSignal } from '@/types';
import { TinyFish } from '@tiny-fish/sdk';

// Extend Vercel serverless function timeout to 120 seconds (max for Pro plan)
export const maxDuration = 120;

const availabilityPriority = ['In Stock', 'Limited', 'Backorder', 'Unknown'];
const lifecyclePriority = ['Obsolete', 'NRND', 'Active', 'Unknown'];

const pickPreferred = (values: (string | undefined)[], priority: string[]) => {
    for (const candidate of priority) {
        if (values.some((value) => value === candidate)) {
            return candidate;
        }
    }
    return 'Unknown';
};

const parsePrice = (content: string) => {
    const patterns = [
        /(?:us\$|\$|usd|price)\s*[:\s]*(\d{1,5}(?:\.\d{1,3})?)/gi,
        /(\d{1,5}(?:\.\d{1,3})?)\s*(?:usd|us\$|\$)/gi,
        /\$\s*(\d{1,5}\.\d{2})/g,
        /\b(\d{1,2}\.\d{2})\b/g,
    ];
    const prices: number[] = [];
    for (const re of patterns) {
        const matches = Array.from(content.matchAll(re));
        for (const m of matches) {
            const v = parseFloat(m[1]);
            if (Number.isFinite(v) && v > 0 && v < 100000) prices.push(v);
        }
    }
    if (!prices.length) return null;
    const lowest = Math.min(...prices);
    return { value: lowest, label: `USD ${lowest.toFixed(2)}` };
};

const parseLeadTimeDaysFromAvailability = (availability: string): number | undefined => {
    if (!availability) return undefined;
    const m = availability.match(/ships?\s*in\s*(\d+)\s*days?/i) || availability.match(/available\s*in\s*(\d+)\s*days?/i);
    return m ? parseInt(m[1], 10) : undefined;
};

const mapSchemaAvailability = (value?: string) => {
    if (!value) return undefined;
    const lowered = value.toLowerCase();
    if (lowered.includes('instock') || lowered.includes('in stock')) return 'In Stock';
    if (lowered.includes('backorder') || lowered.includes('preorder') || lowered.includes('outofstock') || lowered.includes('soldout')) return 'Backorder';
    return undefined;
};

const inferLifecycle = (content: string) => {
    if (!content) return 'Unknown';
    const lowered = content.toLowerCase();
    if (lowered.includes('obsolete') || lowered.includes('end of life') || lowered.includes('eol')) {
        return 'Obsolete';
    }
    if (lowered.includes('nrnd') || lowered.includes('not recommended for new designs')) {
        return 'NRND';
    }
    if (lowered.includes('active') || lowered.includes('production')) {
        return 'Active';
    }
    return 'Unknown';
};

const computeConfidence = (sourcesCount: number, signalsCount: number): ConfidenceInfo => {
    const score = Math.min(100, 20 + sourcesCount * 10 + signalsCount * 15);
    const level = score >= 70 ? 'HIGH' : score >= 40 ? 'MEDIUM' : 'LOW';
    return { score, level, sources: sourcesCount, signals: signalsCount };
};

const CACHE_TTL_MS = 0;
const MAX_CACHE_ENTRIES = 200;
const SOURCE_TIMEOUT_MS = 60000; // 60s per source to stay within total budget
const FALLBACK_AVAILABILITY = 'Listed';
const FALLBACK_LIFECYCLE = 'Active';
const FALLBACK_PRICE = 'Varies';
const SCAN_TIMEOUT_MS = 110000; // 110s total scan budget

const scanCache = new Map<string, { expires: number; result: ScanResult }>();

const getDirectSearchUrls = (partNumber: string) => [
    { name: 'DigiKey', url: `https://www.digikey.com/en/products/result?keywords=${encodeURIComponent(partNumber)}` },
    { name: 'Mouser', url: `https://www.mouser.com/c/?q=${encodeURIComponent(partNumber)}` },
    { name: 'Newark', url: `https://www.newark.com/search?st=${encodeURIComponent(partNumber)}` },
    { name: 'Farnell', url: `https://www.farnell.com/search?st=${encodeURIComponent(partNumber)}` },
    { name: 'Arrow', url: `https://www.arrow.com/en/products/search?q=${encodeURIComponent(partNumber)}` },
];

type TinyFishStreamEvent =
    | { type: 'STARTED'; run_id?: string; timestamp?: string }
    | { type: 'STREAMING_URL'; run_id?: string; streaming_url?: string; streamingUrl?: string }
    | { type: 'PROGRESS'; run_id?: string; purpose?: string }
    | { type: 'COMPLETE'; run_id?: string; status?: string; result_json?: unknown; resultJson?: unknown; result?: unknown }
    | { type: string; [key: string]: unknown };

function timeoutAfter(ms: number, message = 'Timed out'): Promise<never> {
    return new Promise((_, reject) => {
        const id = setTimeout(() => reject(new Error(message)), ms);
        // Avoid holding the event loop open in serverless runtimes (Node only).
        const maybeTimeout = id as unknown as { unref?: () => void };
        maybeTimeout.unref?.();
    });
}

export async function POST(request: Request) {
    const agentLogs: string[] = [];
    const logPrefix = '[TinyFish]';
    let part_number = "";
    let manufacturer = "";

    try {
        const body = await request.json();
        part_number = String(body.part_number ?? '').trim();
        manufacturer = String(body.manufacturer ?? '').trim();

        if (!part_number) {
            return NextResponse.json({ error: "Part number required" }, { status: 400 });
        }
        if (part_number.length > 64) {
            return NextResponse.json({ error: "Part number too long" }, { status: 400 });
        }
        if (!/^[A-Za-z0-9._/+\\-]+$/.test(part_number)) {
            return NextResponse.json({ error: "Part number contains invalid characters" }, { status: 400 });
        }

        const scannedAt = new Date().toISOString();
        const timestamp = scannedAt.split('T')[0];
        if (CACHE_TTL_MS > 0) {
            const cacheKey = `${part_number.toLowerCase()}|${(manufacturer || '').toLowerCase()}`;
            const cached = scanCache.get(cacheKey);
            if (cached && cached.expires > Date.now()) {
                return NextResponse.json({
                    ...cached.result,
                    agent_logs: [...(cached.result.agent_logs || []), `${logPrefix} Cache hit. Returning recent scan.`],
                });
            }
        }

        let status = "Unknown";
        let riskLevel = "MEDIUM";
        let riskScore = 50;
        let reasoning = "Gathering live data...";
        const evidence: string[] = [];
        let leadTime = 0;
        let availability = "Unknown";
        let priceEstimate = "N/A";

        const detectedSources: string[] = [];
        const directSourcesChecked: string[] = [];
        const directSourcesBlocked: string[] = [];
        let uniqueSources: string[] = [];
        let sourceSignals: SourceSignal[] = [];
        const scanStartTime = Date.now();
        let scanTimedOut = false;

        agentLogs.push(`${logPrefix} Initializing tracker for part: ${part_number}`);

        const apiKey = process.env.TINYFISH_API_KEY;
        if (apiKey) {
            agentLogs.push(`${logPrefix} System Status: Successfully detected TINYFISH_API_KEY. Secure link established.`);
        } else {
            agentLogs.push(`${logPrefix} Note: No TINYFISH_API_KEY detected. Scans will fail without an API key.`);
        }

        try {
            agentLogs.push(`${logPrefix} Initializing TinyFish agent (SDK stream)...`);
            const directSearchUrls = getDirectSearchUrls(part_number);

            const fetchTinyFish = async (source: { name: string; url: string }): Promise<SourceSignal> => {
                const defaultSignal = { name: source.name, url: source.url, ok: false, blocked: true };
                if (!apiKey) {
                    agentLogs.push(`${logPrefix} Error: Missing TINYFISH_API_KEY to fetch ${source.name}`);
                    return defaultSignal;
                }

                agentLogs.push(`${logPrefix} Requesting ${source.name} via TinyFish API...`);
                try {
                    // Use TinyFish SDK streaming to preserve SSE-style progress and completion events.
                    const run = async (): Promise<SourceSignal> => {
                        // Initialize client at request time so build does not require TINYFISH_API_KEY.
                        const tinyFishClient = new TinyFish();
                        const stream = await tinyFishClient.agent.stream({
                            url: source.url,
                            goal: `Find the product listing for ${part_number}. Extract: price, availability/stock status, lead time, lifecycle status. Return as JSON.`,
                            browser_profile: "lite",
                            proxy_config: {
                                enabled: true,
                                country_code: "US"
                            },
                        });

                        for await (const event of stream as AsyncIterable<TinyFishStreamEvent>) {
                            const type = event.type;
                            if (type === 'STREAMING_URL') {
                                const streamingUrlRaw = (event as Extract<TinyFishStreamEvent, { type: 'STREAMING_URL' }>).streaming_url ??
                                    (event as Extract<TinyFishStreamEvent, { type: 'STREAMING_URL' }>).streamingUrl;
                                if (typeof streamingUrlRaw === 'string' && streamingUrlRaw) {
                                    agentLogs.push(`${logPrefix} [${source.name}] Live stream: ${streamingUrlRaw}`);
                                }
                            }
                            if (type === 'PROGRESS') {
                                const purpose = (event as Extract<TinyFishStreamEvent, { type: 'PROGRESS' }>).purpose;
                                if (typeof purpose === 'string' && purpose) {
                                    agentLogs.push(`${logPrefix} [${source.name}] Progress: ${purpose}`);
                                }
                            }
                            if (type === 'COMPLETE') {
                                const resultJson =
                                    ((event as Extract<TinyFishStreamEvent, { type: 'COMPLETE' }>).result_json ??
                                        (event as Extract<TinyFishStreamEvent, { type: 'COMPLETE' }>).resultJson ??
                                        (event as Extract<TinyFishStreamEvent, { type: 'COMPLETE' }>).result ??
                                        {}) as Record<string, unknown>;

                                let parsedPrice = (resultJson as { price?: unknown; price_estimate?: unknown }).price ??
                                    (resultJson as { price?: unknown; price_estimate?: unknown }).price_estimate;
                                if (parsedPrice && typeof parsedPrice === 'number') {
                                    parsedPrice = `USD ${parsedPrice.toFixed(2)}`;
                                } else if (parsedPrice && typeof parsedPrice === 'string' && !parsedPrice.toLowerCase().includes('usd')) {
                                    const pMatch = parsedPrice.match(/[\d.]+/);
                                    if (pMatch) parsedPrice = `USD ${pMatch[0]}`;
                                }

                                let parsedLeadTime: number | undefined = undefined;
                                const leadTimeWeeks = (resultJson as { lead_time_weeks?: unknown }).lead_time_weeks;
                                const leadTime = (resultJson as { lead_time?: unknown }).lead_time;
                                if (typeof leadTimeWeeks === 'number') {
                                    parsedLeadTime = leadTimeWeeks;
                                } else if (typeof leadTime === 'number') {
                                    parsedLeadTime = leadTime;
                                } else if (typeof leadTime === 'string') {
                                    const m = leadTime.match(/(\d+)/);
                                    if (m) parsedLeadTime = parseInt(m[1], 10);
                                }

                                const availabilityRaw =
                                    (resultJson as { availability?: unknown; stock_status?: unknown }).availability ??
                                    (resultJson as { availability?: unknown; stock_status?: unknown }).stock_status;

                                const lifecycleRaw = (resultJson as { lifecycle_status?: unknown }).lifecycle_status;
                                const inferredLifecycle = inferLifecycle(typeof lifecycleRaw === 'string' ? lifecycleRaw : '');

                                return {
                                    name: source.name,
                                    url: source.url,
                                    ok: true,
                                    blocked: false,
                                    availability:
                                        typeof availabilityRaw === 'string'
                                            ? mapSchemaAvailability(availabilityRaw) || availabilityRaw
                                            : undefined,
                                    lifecycle_status:
                                        inferredLifecycle !== 'Unknown'
                                            ? inferredLifecycle
                                            : (typeof lifecycleRaw === 'string' ? lifecycleRaw : undefined),
                                    lead_time_weeks: parsedLeadTime,
                                    price_estimate: typeof parsedPrice === 'string' ? parsedPrice : undefined
                                };
                            }
                        }

                        return defaultSignal;
                    };

                    return await Promise.race([
                        run(),
                        timeoutAfter(SOURCE_TIMEOUT_MS, `TinyFish source timeout: ${source.name}`),
                    ]);
                } catch (err) {
                    agentLogs.push(`${logPrefix} Failed to fetch ${source.name} via TinyFish: ${err instanceof Error ? err.message : String(err)}`);
                }
                return defaultSignal;
            };

            const fetches = directSearchUrls.map(fetchTinyFish);
            sourceSignals = await Promise.all(fetches);

            for (const signal of sourceSignals) {
                if (signal.ok) {
                    evidence.push(signal.url);
                    detectedSources.push(signal.name);
                    directSourcesChecked.push(signal.name);
                } else {
                    directSourcesBlocked.push(signal.name);
                }

                const signalDetails = [
                    signal.availability ? `availability=${signal.availability}` : null,
                    signal.lifecycle_status ? `lifecycle=${signal.lifecycle_status}` : null,
                    signal.lead_time_weeks ? `lead=${signal.lead_time_weeks}w` : null,
                    signal.price_estimate ? `price=${signal.price_estimate}` : null,
                ].filter(Boolean);

                if (signalDetails.length > 0) {
                    agentLogs.push(`${logPrefix} ${signal.name} signals: ${signalDetails.join(', ')}`);
                } else if (signal.ok) {
                    agentLogs.push(`${logPrefix} ${signal.name} responded without explicit signals.`);
                }
            }

            uniqueSources = Array.from(new Set(detectedSources));

            if (uniqueSources.length > 0) {
                agentLogs.push(`${logPrefix} identified ${uniqueSources.length} sources: ${uniqueSources.join(', ')}`);
            } else {
                agentLogs.push(`${logPrefix} Note: No major distributors identified or all blocked.`);
            }

            const sourceAvailability = sourceSignals.map((signal) => signal.availability).filter(Boolean) as string[];
            const sourceLifecycle = sourceSignals.map((signal) => signal.lifecycle_status).filter(Boolean) as string[];
            const sourceLeadTimes = sourceSignals
                .map((signal) => signal.lead_time_weeks)
                .filter((value): value is number => typeof value === 'number');
            const sourcePriceValues = sourceSignals
                .map((signal) => signal.price_estimate)
                .filter(Boolean)
                .map((label) => parsePrice(label || ''))
                .filter((value): value is { value: number; label: string } => Boolean(value));

            const availabilitySummary = pickPreferred(sourceAvailability, availabilityPriority);
            const lifecycleSummary = pickPreferred(sourceLifecycle, lifecyclePriority);
            const leadTimeSummary = sourceLeadTimes.length ? Math.max(...sourceLeadTimes) : undefined;
            const priceSummary = sourcePriceValues.length
                ? sourcePriceValues.reduce((lowest, current) => (current.value < lowest.value ? current : lowest))
                : undefined;

            if (availabilitySummary !== 'Unknown') {
                availability = availabilitySummary;
            }
            if (lifecycleSummary !== 'Unknown') {
                status = lifecycleSummary;
            }
            if (leadTimeSummary) {
                leadTime = leadTimeSummary;
                agentLogs.push(`${logPrefix} Lead time: ${leadTime} weeks.`);
            }
            if (priceSummary) {
                priceEstimate = priceSummary.label;
                agentLogs.push(`${logPrefix} Market price: ${priceEstimate}`);
            }

        } catch (error) {
            console.error("TinyFish Tracker Error:", error);
            status = "Error";
            agentLogs.push(`${logPrefix} ERROR: Tracker failed. ${error instanceof Error ? error.message : String(error)}`);
        }

        const signalsCount = sourceSignals.filter((signal) =>
            Boolean(signal.availability || signal.lifecycle_status || signal.lead_time_weeks || signal.price_estimate)
        ).length;
        const sourcesOk = sourceSignals.filter((signal) => signal.ok).length;
        const confidence = computeConfidence(sourcesOk, signalsCount);

        const hasAnySignals = uniqueSources.length > 0 || signalsCount > 0;

        const signalsSummary: SignalSummary = {
            availability: hasAnySignals && availability === 'Unknown' ? FALLBACK_AVAILABILITY : availability,
            lifecycle_status: hasAnySignals && status === 'Unknown' ? FALLBACK_LIFECYCLE : status,
            lead_time_weeks: leadTime || undefined,
            price_estimate: hasAnySignals && priceEstimate === 'N/A' ? FALLBACK_PRICE : priceEstimate,
        };

        if (!hasAnySignals) {
            reasoning = 'No verified signals found in live sources for this part number.';
            riskScore = 50;
            riskLevel = 'MEDIUM';
        } else {
            if (availability === 'Unknown' && status === 'Unknown') {
                reasoning = 'Signals found, but availability and lifecycle were not explicitly stated.';
            } else if (availability !== 'Unknown' || status !== 'Unknown') {
                reasoning = `Signals found for ${availability !== 'Unknown' ? `availability: ${availability}` : 'availability'}` +
                    `${status !== 'Unknown' ? ` and lifecycle: ${status}` : ''}.`;
            }
        }

        const lastSnapshot = getLastSnapshot(part_number);

        if (lastSnapshot) {
            agentLogs.push(`${logPrefix} History: Comparing with entry from ${lastSnapshot.timestamp}...`);

            if (lastSnapshot.lifecycle_status !== status && status !== "Unknown") {
                riskScore = 95;
                riskLevel = "HIGH";
                reasoning = `CRITICAL SHIFT: Lifecycle changed from ${lastSnapshot.lifecycle_status} to ${status}. ${reasoning}`;
            } else if (leadTime > (lastSnapshot.lead_time_weeks || 0) + 4 && leadTime > 0) {
                riskScore = Math.max(riskScore, 75);
                riskLevel = "HIGH";
                reasoning = `SUPPLY STRESS: Lead time spiked to ${leadTime} weeks. ${reasoning}`;
            }
        }

        if (status === "Obsolete") {
            riskScore = 95;
            riskLevel = "HIGH";
        } else if (status !== "Error" && status !== "Unknown") {
            riskScore = riskScore === 0 ? 15 : riskScore;
            riskLevel = riskScore > 70 ? "HIGH" : riskScore > 30 ? "MEDIUM" : "LOW";
        }

        const currentSnapshot: HistoricalSnapshot = {
            timestamp,
            lifecycle_status: status,
            lead_time_weeks: leadTime,
            availability: availability,
            risk_score: riskScore
        };

        try {
            saveSnapshot(part_number, currentSnapshot);
        } catch (e) {
            const err = e instanceof Error ? e.message : String(e);
            agentLogs.push(`${logPrefix} WARNING: Failed to record history snapshot. ${err}`);
        }

        const fullHistory = getHistory(part_number);
        const historyPoints = fullHistory.map(h => ({
            timestamp: h.timestamp,
            score: h.risk_score || 50
        }));

        if (hasAnySignals) {
            if (availability === 'Unknown') availability = FALLBACK_AVAILABILITY;
            if (status === 'Unknown') status = FALLBACK_LIFECYCLE;
            if (priceEstimate === 'N/A') priceEstimate = FALLBACK_PRICE;
        }

        const leadTimeDays = parseLeadTimeDaysFromAvailability(availability);

        scanTimedOut = Date.now() - scanStartTime > SCAN_TIMEOUT_MS;

        const result: ScanResult = {
            part_number,
            manufacturer: manufacturer || 'Unknown',
            lifecycle_status: status,
            lead_time_weeks: leadTime || undefined,
            lead_time_days: leadTimeDays,
            availability: availability,
            timestamp,
            risk: {
                score: riskScore,
                level: riskLevel,
                reasoning
            },
            evidence_links: evidence,
            price_estimate: priceEstimate,
            sources: uniqueSources,
            sources_checked: directSourcesChecked,
            sources_blocked: directSourcesBlocked,
            source_signals: sourceSignals,
            signals: signalsSummary,
            confidence,
            scanned_at: scannedAt,
            scan_duration_ms: Date.now() - scanStartTime,
            scan_timed_out: scanTimedOut,
            agent_logs: agentLogs,
            history: historyPoints
        };

        if (CACHE_TTL_MS > 0) {
            const cacheKey = `${part_number.toLowerCase()}|${(manufacturer || '').toLowerCase()}`;
            scanCache.set(cacheKey, {
                expires: Date.now() + CACHE_TTL_MS,
                result,
            });
            while (scanCache.size > MAX_CACHE_ENTRIES) {
                const oldestKey = scanCache.keys().next().value;
                if (oldestKey) {
                    scanCache.delete(oldestKey);
                } else {
                    break;
                }
            }
        }

        return NextResponse.json(result);

    } catch (globalError) {
        console.error("Global Scan API Error:", globalError);
        const errMessage = globalError instanceof Error ? globalError.message : String(globalError);
        agentLogs.push(`${logPrefix} CRITICAL ERROR: System failed. ${errMessage}`);

        return NextResponse.json({
            part_number: part_number || "Unknown",
            manufacturer: manufacturer || "Unknown",
            lifecycle_status: "Error",
            timestamp: new Date().toISOString().split('T')[0],
            risk: {
                score: 100,
                level: "HIGH",
                reasoning: `Critical failure during scan: ${errMessage}`
            },
            evidence_links: [],
            agent_logs: agentLogs
        }, { status: 500 });
    }
}
