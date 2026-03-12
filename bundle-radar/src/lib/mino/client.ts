import { TinyFishRequest, TinyFishAsyncResponse, TinyFishRunStatus } from '@/types';

/** Timeout for the initial async submission (returns instantly, so 15s is generous). */
const SUBMIT_TIMEOUT_MS = 15_000;
/** Timeout for each individual poll request. */
const POLL_TIMEOUT_MS = 10_000;
/** Initial poll interval -- increases over time to reduce API load. */
const POLL_INTERVAL_INITIAL_MS = 3_000;
/** Max poll interval after backoff. */
const POLL_INTERVAL_MAX_MS = 8_000;
/** Maximum total time to wait for a single run to complete.
 *  All 5 phases run in parallel; slow pages (e.g. vercel.com) can exceed 240s.
 *  260s gives slow runs more room while leaving ~30s for detection + LLM before the 290s scan timeout. */
const RUN_TIMEOUT_MS = 260_000;

/**
 * Submit an automation task asynchronously.
 * Returns a run_id immediately without waiting for the browser automation to complete.
 * Uses POST /v1/automation/run-async per TinyFish docs.
 */
export async function submitAsync(request: TinyFishRequest): Promise<TinyFishAsyncResponse> {
  const baseUrl = process.env.MINO_BASE_URL || 'https://agent.tinyfish.ai';
  const apiKey = process.env.TINYFISH_API_KEY || process.env.MINO_API_KEY || '';

  const res = await fetch(`${baseUrl}/v1/automation/run-async`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(request),
    signal: AbortSignal.timeout(SUBMIT_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`TinyFish API error (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * Poll for the status of a specific run.
 * Uses GET /v1/runs/{id} per TinyFish docs.
 */
export async function pollRun(runId: string): Promise<TinyFishRunStatus> {
  const baseUrl = process.env.MINO_BASE_URL || 'https://agent.tinyfish.ai';
  const apiKey = process.env.TINYFISH_API_KEY || process.env.MINO_API_KEY || '';

  const res = await fetch(`${baseUrl}/v1/runs/${runId}`, {
    headers: { 'X-API-Key': apiKey },
    signal: AbortSignal.timeout(POLL_TIMEOUT_MS),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`TinyFish poll error (${res.status}): ${errorText}`);
  }

  return res.json();
}

/**
 * Submit an automation task async, then poll until COMPLETED/FAILED/CANCELLED.
 * Returns the parsed result. Same signature as the old sync runAndParse so
 * extractors don't need to change.
 */
export async function runAndParse<T>(request: TinyFishRequest): Promise<T> {
  // Step 1: Submit the task
  const submission = await submitAsync(request);
  if (submission.error) {
    const msg = typeof submission.error === 'object'
      ? (submission.error.message || submission.error.code || JSON.stringify(submission.error))
      : String(submission.error);
    throw new Error(`TinyFish submission failed: ${msg}`);
  }
  if (!submission.run_id) {
    throw new Error('TinyFish submission returned no run_id');
  }

  const runId = submission.run_id;
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  let pollInterval = POLL_INTERVAL_INITIAL_MS;

  // Step 2: Poll until terminal state with progressive backoff
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, pollInterval));
    // Increase interval gradually: 3s → 4s → 5s → ... → 8s max
    pollInterval = Math.min(pollInterval + 1_000, POLL_INTERVAL_MAX_MS);

    let run: TinyFishRunStatus;
    try {
      run = await pollRun(runId);
    } catch (pollErr) {
      // Transient poll failure — retry on next interval
      console.warn(`[TinyFish] Poll failed for ${runId}, retrying...`, pollErr instanceof Error ? pollErr.message : pollErr);
      continue;
    }

    if (run.status === 'COMPLETED') {
      return parseResult<T>(run.result);
    }

    if (run.status === 'FAILED' || run.status === 'CANCELLED') {
      const errMsg = run.error?.message ?? `Run ${run.status.toLowerCase()}`;
      throw new Error(`TinyFish automation failed: ${errMsg}`);
    }

    // PENDING or RUNNING — keep polling
  }

  throw new Error(`TinyFish automation timed out after ${RUN_TIMEOUT_MS / 1000}s (run ${runId})`);
}

/** Parse the result field from a completed run into the expected type. */
function parseResult<T>(result: Record<string, unknown> | string | null | undefined): T {
  if (result == null) {
    return {} as T;
  }
  if (typeof result === 'object' && !Array.isArray(result) && result !== null) {
    return result as T;
  }
  const raw = typeof result === 'string' ? result : '{}';
  try {
    return JSON.parse(raw) as T;
  } catch {
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]) as T;
    throw new Error(`Failed to parse TinyFish result as JSON: ${raw.slice(0, 300)}`);
  }
}
