import { runAgent } from "../../../../lib/tinyfish";
import { evaluateRisk } from "../../../../lib/decision-engine";

export async function POST(req) {
    try {
        const { sku, intendedUpdate, contextUrl } = await req.json();

        if (!sku) {
            return new Response(JSON.stringify({ error: "SKU is required" }), {
                status: 400,
                headers: { "Content-Type": "application/json" }
            });
        }

        const stream = await runAgent(sku, intendedUpdate, contextUrl);

        // Pass through the stream from TinyFish to the client
        return new Response(stream, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            },
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" }
        });
    }
}
