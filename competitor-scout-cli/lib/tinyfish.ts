import { ensureLocalEnvLoaded } from "./env";

const TINYFISH_BASE_URL = "https://agent.tinyfish.ai/v1";

function getApiKey(): string {
  ensureLocalEnvLoaded();
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new Error("TINYFISH_API_KEY environment variable is not set");
  return key;
}

export async function submitRun(
  url: string,
  goal: string
): Promise<string> {
  const response = await fetch(`${TINYFISH_BASE_URL}/automation/run-async`, {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, goal }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Tinyfish submit failed (${response.status}): ${text}`);
  }

  const result = await response.json();
  return result.run_id;
}

export async function getRunStatus(runId: string): Promise<{
  run_id: string;
  status: string;
  result?: unknown;
  error?: string;
}> {
  const maxAttempts = 3;
  let attempt = 0;
  let lastError: Error | null = null;

  while (attempt < maxAttempts) {
    attempt += 1;
    const response = await fetch(`${TINYFISH_BASE_URL}/runs/${runId}`, {
      headers: {
        "X-API-Key": getApiKey(),
      },
    });

    if (response.ok) {
      return await response.json();
    }

    const text = await response.text();
    const error = new Error(
      `Tinyfish status check failed (${response.status}): ${text}`
    );
    lastError = error;

    if (response.status >= 500 && attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
      continue;
    }

    throw error;
  }

  throw lastError ?? new Error("Tinyfish status check failed");
}

export async function waitForCompletion(
  runId: string,
  onPoll?: (status: string) => void,
  pollInterval = 3000
): Promise<{
  run_id: string;
  status: string;
  result?: unknown;
  error?: string;
}> {
  while (true) {
    const run = await getRunStatus(runId);
    if (onPoll) onPoll(run.status);

    if (["COMPLETED", "FAILED", "CANCELLED"].includes(run.status)) {
      return run;
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }
}
