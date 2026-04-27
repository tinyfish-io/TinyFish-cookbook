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

export type TinyfishSearchResult = {
  position: number;
  site_name: string;
  title: string;
  snippet: string;
  url: string;
};

export async function searchWeb(params: {
  query: string;
  location?: string;
  language?: string;
}): Promise<{ query: string; results: TinyfishSearchResult[]; total_results: number }> {
  const res = await getClient().search.query({
    query: params.query,
    ...(params.location ? { location: params.location } : {}),
    ...(params.language ? { language: params.language } : {}),
  });
  return res as unknown as {
    query: string;
    results: TinyfishSearchResult[];
    total_results: number;
  };
}

export type TinyfishFetchPage = {
  url: string;
  final_url?: string | null;
  title?: string | null;
  description?: string | null;
  language?: string | null;
  format?: "markdown" | "html" | "json";
  text?: unknown;
  links?: string[];
  image_links?: string[];
  latency_ms?: number | null;
};

export async function fetchContents(params: {
  urls: string[];
  format?: "markdown" | "html" | "json";
  links?: boolean;
  image_links?: boolean;
}): Promise<{ results: TinyfishFetchPage[]; errors: { url: string; error: string }[] }> {
  const res = await getClient().fetch.getContents({
    urls: params.urls,
    ...(params.format ? { format: params.format } : {}),
    ...(params.links != null ? { links: params.links } : {}),
    ...(params.image_links != null ? { image_links: params.image_links } : {}),
  });
  return res as unknown as {
    results: TinyfishFetchPage[];
    errors: { url: string; error: string }[];
  };
}
