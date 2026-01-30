import { runPricingAnalysis } from "../../../../lib/pricing-intelligence";

export const dynamic = "force-dynamic";

export async function POST(req) {
    try {
        const { urls } = await req.json();
        const MAX_URLS = 10;

        if (!urls || !Array.isArray(urls)) {
            return new Response(JSON.stringify({ error: "URLs must be an array" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const validUrls = urls
            .map(u => typeof u === 'string' ? u.trim() : '')
            .filter(u => u.length > 0);

        if (validUrls.length === 0) {
            return new Response(JSON.stringify({ error: "No valid URLs provided" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        if (validUrls.length > MAX_URLS) {
            return new Response(JSON.stringify({ error: `Too many URLs. Max limit is ${MAX_URLS}` }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        // Validate URL format
        const invalidUrls = [];
        for (const url of validUrls) {
            try {
                new URL(url);
            } catch {
                invalidUrls.push(url);
            }
        }

        if (invalidUrls.length > 0) {
            return new Response(JSON.stringify({ error: `Invalid URL format for: ${invalidUrls.join(', ')}` }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const createSseParser = (onEvent) => {
            let buffer = "";
            return (chunk) => {
                buffer += chunk;
                const parts = buffer.split("\n\n");
                buffer = parts.pop() || "";
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
                            // Ignore partial JSON or heartbeat lines.
                        }
                    }
                }
            };
        };

        const enrichPricingResult = (result) => {
            if (!result || typeof result !== "object") return result;
            const tiers = Array.isArray(result.tiers) ? result.tiers : [];
            const numericPrices = tiers
                .map((tier) => tier.price)
                .filter((price) => typeof price === "number");

            return {
                ...result,
                analysis_meta: {
                    tiers_count: tiers.length,
                    has_free_tier: tiers.some((tier) => tier.price === 0),
                    price_min: numericPrices.length ? Math.min(...numericPrices) : null,
                    price_max: numericPrices.length ? Math.max(...numericPrices) : null
                }
            };
        };

        const agentControllers = new Map();

        const stream = new ReadableStream({
            async start(controller) {
                const sendEvent = (data) => {
                    const event = `data: ${JSON.stringify(data)}\n\n`;
                    controller.enqueue(encoder.encode(event));
                };

                // Notify start
                sendEvent({ type: "info", message: `Initiating parallel analysis for ${validUrls.length} competitors...` });

                const MAX_CONCURRENCY = 5;
                const results = [];

                // Helper to run a single agent
                const runAgent = async (url) => {
                    const agentController = new AbortController();
                    agentControllers.set(url, agentController);
                    const timeoutId = setTimeout(() => agentController.abort(), 35000);
                    const startedAt = Date.now();

                    try {
                        const agentStream = await runPricingAnalysis(url, { signal: agentController.signal });
                        if (!agentStream) {
                            throw new Error("TinyFish response missing body stream");
                        }
                        const reader = agentStream.getReader();
                        const parse = createSseParser((originalData) => {
                            if (originalData.final_result) {
                                originalData.final_result = enrichPricingResult(originalData.final_result);
                            }

                            sendEvent({
                                ...originalData,
                                competitor_url: url,
                                analysis_meta: {
                                    ...originalData.analysis_meta,
                                    duration_ms: Date.now() - startedAt
                                }
                            });
                        });

                        while (true) {
                            const { done, value } = await reader.read();
                            if (done) break;

                            const chunk = decoder.decode(value, { stream: true });
                            parse(chunk);
                        }
                    } catch (err) {
                        console.error(`Error processing ${url}:`, err);
                        sendEvent({
                            type: "error",
                            competitor_url: url,
                            message: `Failed to analyze ${url}: ${err.message}`
                        });
                    } finally {
                        clearTimeout(timeoutId);
                        agentControllers.delete(url);
                    }
                };

                // Execute with concurrency limit
                for (let i = 0; i < validUrls.length; i += MAX_CONCURRENCY) {
                    const batch = validUrls.slice(i, i + MAX_CONCURRENCY);
                    await Promise.all(batch.map(url => runAgent(url)));
                }

                sendEvent({ type: "done", message: "All parallel tasks completed." });
                controller.close();
            },
            cancel() {
                for (const controller of agentControllers.values()) {
                    controller.abort();
                }
            }
        });

        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });

    } catch (error) {
        console.error("Pricing API error:", error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
}
