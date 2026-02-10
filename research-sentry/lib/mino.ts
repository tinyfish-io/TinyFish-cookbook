// TinyFish Web Agent Client
// Endpoint: https://agent.tinyfish.ai/v1/automation/run-sse

export async function runMinoAutomation(
    url: string,
    goal: string,
    stealth = false,
    options?: { timeoutMs?: number }
): Promise<any> {
    const apiKey = process.env.TINYFISH_API_KEY;

    if (!apiKey) {
        console.error('[Mino] TINYFISH_API_KEY not set in environment');
        return null;
    }

    console.log(`[TinyFish] Starting automation...`);
    console.log(`[TinyFish] URL: ${url}`);
    console.log(`[TinyFish] Goal: ${goal.substring(0, 80)}...`);

    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs;
    const timeout = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
        const res = await fetch('https://agent.tinyfish.ai/v1/automation/run-sse', {
            method: 'POST',
            headers: {
                'X-API-Key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url,
                goal,
                browser_profile: stealth ? 'stealth' : 'lite'
            }),
            signal: controller.signal,
        });

        if (!res.ok) {
            const errorText = await res.text();
            console.error(`[TinyFish] HTTP Error ${res.status}: ${errorText}`);
            return null;
        }

        if (!res.body) {
            console.error('[TinyFish] No response body');
            return null;
        }

        // Parse SSE stream
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let result: any = null;
        let lastEvent = '';

        console.log('[TinyFish] Reading SSE stream...');

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const eventData = JSON.parse(line.slice(6));
                        lastEvent = eventData.type || 'unknown';

                        console.log(`[TinyFish] Event: ${lastEvent}`);

                        if (eventData.type === 'COMPLETE' || eventData.type === 'complete') {
                            result = eventData.resultJson || eventData.result || eventData.data;
                            console.log('[TinyFish] Automation complete!');
                        }

                        if (eventData.type === 'ERROR' || eventData.type === 'error') {
                            console.error('[TinyFish] Error event:', eventData.message || eventData);
                            return null;
                        }
                    } catch (parseErr) {
                        // Non-JSON event, skip
                    }
                }
            }
        }

        if (result) {
            console.log(`[TinyFish] Success! Got result:`, typeof result === 'object' ?
                (Array.isArray(result) ? `Array with ${result.length} items` : 'Object') : typeof result);
            return result;
        } else {
            console.log(`[TinyFish] Stream ended without COMPLETE event. Last event: ${lastEvent}`);
            return null;
        }

    } catch (error: any) {
        const msg = error?.name === 'AbortError' ? 'Request timed out' : error?.message;
        console.error(`[TinyFish] Error:`, msg);
        return null;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}
