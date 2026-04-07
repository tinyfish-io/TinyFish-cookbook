// TinyFish Web Agent Client — using @tiny-fish/sdk
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk';

export async function runTinyFishAutomation(
    url: string,
    goal: string,
    stealth = false,
    options?: { timeoutMs?: number }
): Promise<any> {
    const apiKey = process.env.TINYFISH_API_KEY;

    if (!apiKey) {
        console.error('[TinyFish] TINYFISH_API_KEY not set in environment');
        return null;
    }

    console.log(`[TinyFish] Starting automation...`);
    console.log(`[TinyFish] URL: ${url}`);
    console.log(`[TinyFish] Goal: ${goal.substring(0, 80)}...`);

    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs;
    const timeout = timeoutMs ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
        const client = new TinyFish({ apiKey });
        let result: any = null;

        const stream = await client.agent.stream(
            {
                url,
                goal,
                browser_profile: stealth ? 'stealth' : 'lite',
            },
            {
                onComplete: (event) => {
                    if (event.status === RunStatus.COMPLETED) {
                        result = event.result ?? null;
                        console.log('[TinyFish] Automation complete!');
                    } else if (event.status === RunStatus.FAILED) {
                        console.error('[TinyFish] Run failed:', event.error?.message);
                    }
                },
            }
        );

        // Drain the stream so the onComplete callback fires
        for await (const event of stream) {
            console.log(`[TinyFish] Event: ${event.type}`);
            if (event.type === EventType.COMPLETE && !result) {
                if (event.status === RunStatus.COMPLETED) {
                    result = event.result ?? null;
                    console.log('[TinyFish] Automation complete (fallback)!');
                } else if (event.status === RunStatus.FAILED) {
                    console.error('[TinyFish] Run failed');
                    return null;
                }
            }
        }

        if (result) {
            console.log(`[TinyFish] Success! Got result:`, typeof result === 'object' ?
                (Array.isArray(result) ? `Array with ${result.length} items` : 'Object') : typeof result);
            return result;
        }

        console.log(`[TinyFish] Stream ended without COMPLETED status.`);
        return null;

    } catch (error: any) {
        const msg = error?.name === 'AbortError' ? 'Request timed out' : error?.message;
        console.error(`[TinyFish] Error:`, msg);
        return null;
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}
