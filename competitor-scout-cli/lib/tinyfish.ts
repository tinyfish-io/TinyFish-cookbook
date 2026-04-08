import { ensureLocalEnvLoaded } from "./env";
import { TinyFish } from "@tiny-fish/sdk";

let client: TinyFish | null = null;

function getApiKey(): string {
  ensureLocalEnvLoaded();
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new Error("TINYFISH_API_KEY environment variable is not set");
  return key;
}

function getClient(): TinyFish {
  // Validate env early for nicer errors; SDK reads env itself.
  getApiKey();
  if (!client) {
    client = new TinyFish();
  }
  return client;
}

export async function submitRun(
  url: string,
  goal: string
): Promise<string> {
  const result = await getClient().agent.queue({ url, goal });
  if (result.error) {
    const message =
      typeof result.error === "object" && "message" in result.error
        ? String((result.error as { message?: unknown }).message ?? "")
        : String(result.error);
    throw new Error(`Failed to queue Tinyfish run: ${message || "Unknown error"}`);
  }
  if (!result.run_id) {
    throw new Error("Tinyfish queue did not return a run_id");
  }
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
    try {
      const run = await getClient().runs.get(runId);
      const errorMessage =
        run.error && typeof run.error === "object" && "message" in run.error
          ? String((run.error as { message?: unknown }).message ?? "")
          : run.error
            ? JSON.stringify(run.error)
            : undefined;

      return {
        run_id: run.run_id,
        status: run.status,
        result: run.result,
        error: errorMessage,
      };
    } catch (e) {
      const error = e instanceof Error ? e : new Error(String(e));
      lastError = error;
      if (attempt < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        continue;
      }
      throw error;
    }
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
