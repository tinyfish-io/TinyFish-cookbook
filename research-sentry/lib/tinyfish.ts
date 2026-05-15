// TinyFish Web Agent Client — using @tiny-fish/sdk
import { TinyFish, EventType, RunStatus } from '@tiny-fish/sdk';

export class TinyFishError extends Error {
    constructor(
        message: string,
        public readonly code: 'MISSING_API_KEY' | 'RUN_FAILED' | 'TIMEOUT' | 'STREAM_ERROR' | 'NO_RESULT'
    ) {
        super(message);
        this.name = 'TinyFishError';
    }
}

export async function runTinyFishAutomation(
    url: string,
    goal: string,
    stealth = false,
    options?: { timeoutMs?: number }
): Promise<unknown> {
    const apiKey = process.env.TINYFISH_API_KEY;

    if (!apiKey) {
        throw new TinyFishError('TINYFISH_API_KEY is not set in environment', 'MISSING_API_KEY');
    }

    console.log(`[TinyFish] Starting automation for: ${url}`);
    console.log(`[TinyFish] Goal: ${goal.substring(0, 80)}...`);

    const controller = new AbortController();
    const timeoutMs = options?.timeoutMs;
    const timeout = timeoutMs
        ? setTimeout(() => controller.abort(), timeoutMs)
        : null;

    try {
        const client = new TinyFish({ apiKey });
        let result: unknown = null;
        let runFailed = false;
        let failureMessage = 'Agent run failed';

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
                        runFailed = true;
                        failureMessage = event.error?.message ?? 'Agent run failed';
                        console.error('[TinyFish] Run failed:', failureMessage);
                    }
                },
            }
        );

        // Drain the stream so the onComplete callback fires
        for await (const event of stream) {
            console.log(`[TinyFish] Event: ${event.type}`);
            if (event.type === EventType.COMPLETE && !result && !runFailed) {
                if (event.status === RunStatus.COMPLETED) {
                    result = event.result ?? null;
                    console.log('[TinyFish] Automation complete (fallback)!');
                } else if (event.status === RunStatus.FAILED) {
                    runFailed = true;
                    failureMessage = event.error?.message ?? 'Agent run failed';
                }
            }
        }

        if (runFailed) {
            throw new TinyFishError(failureMessage, 'RUN_FAILED');
        }

        if (!result) {
            throw new TinyFishError('Stream ended without a COMPLETED result', 'NO_RESULT');
        }

        console.log(`[TinyFish] Success! Got result:`, typeof result === 'object'
            ? (Array.isArray(result) ? `Array with ${(result as unknown[]).length} items` : 'Object')
            : typeof result);

        return result;

    } catch (error: unknown) {
        if (error instanceof TinyFishError) throw error;

        if ((error as { name?: string })?.name === 'AbortError') {
            throw new TinyFishError(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT');
        }

        const msg = (error as { message?: string })?.message ?? 'Unknown error';
        throw new TinyFishError(`Stream error: ${msg}`, 'STREAM_ERROR');
    } finally {
        if (timeout) clearTimeout(timeout);
    }
}
