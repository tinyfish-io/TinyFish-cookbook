import { parseEnvNumber } from "@/lib/env";

export type AnsweredInDocs = "true" | "false" | "partial";

export type Importance = "high" | "medium";

export type SelfGeneratedQuestion = {
  question: string;
  answeredInDocs: AnsweredInDocs;
  partialAnswer?: string | null;
  importance: Importance;
};

export type TinyFishAnalysis = {
  selfGeneratedQuestions: SelfGeneratedQuestion[];
};

type TinyFishRunResponse = {
  result?: unknown;
  resultJson?: unknown;
  status?: string;
};

const DEFAULT_BASE_URL = "https://agent.tinyfish.ai";
const DEFAULT_TIMEOUT_MS = parseEnvNumber("TINYFISH_TIMEOUT_MS", 180000, {
  min: 1000,
});
const DEFAULT_MAX_RETRIES = parseEnvNumber("TINYFISH_MAX_RETRIES", 0, { min: 0 });
const DEFAULT_BACKOFF_MS = parseEnvNumber("TINYFISH_BACKOFF_MS", 500, { min: 0 });

export type RunOptions = {
  timeoutMs?: number;
  maxRetries?: number;
  browserProfile?: "lite" | "stealth";
};

class TinyFishError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isRetryable(error: unknown) {
  if (error instanceof TinyFishError) {
    return error.statusCode === 429 || (error.statusCode ?? 0) >= 500;
  }
  return true;
}

export function buildAnalysisGoal(): string {
  return [
    "Evaluate how well an answer engine could understand and cite this page.",
    "Generate exactly 6 user questions in a stable, deterministic order.",
    "For each question, return:",
    "answeredInDocs (true | false | \"partial\"),",
    "partialAnswer (max 120 chars),",
    "importance (high | medium).",
    "Return only JSON:",
    "{\"selfGeneratedQuestions\":[{\"question\":\"...\",\"answeredInDocs\":\"partial\",\"partialAnswer\":\"...\",\"importance\":\"high\"}]}",
  ].join(" ");
}

function normalizeAnswered(value: unknown): AnsweredInDocs {
  if (value === "partial") return "partial";
  if (value === true || value === "true") return "true";
  return "false";
}

function normalizeImportance(value: unknown): Importance {
  return value === "high" ? "high" : "medium";
}

export function normalizeAnalysis(payload: unknown): TinyFishAnalysis {
  const data = payload as TinyFishAnalysis | undefined;
  const rawQuestions =
    data?.selfGeneratedQuestions && Array.isArray(data.selfGeneratedQuestions)
      ? data.selfGeneratedQuestions
      : [];

  const normalized = rawQuestions.map((q) => ({
    question: String(q.question ?? "")
      .trim()
      .replace(/\s+/g, " "),
    answeredInDocs: normalizeAnswered(q.answeredInDocs),
    partialAnswer:
      q.partialAnswer === null || q.partialAnswer === undefined
        ? null
        : String(q.partialAnswer).slice(0, 140),
    importance: normalizeImportance(q.importance),
  }));

  return { selfGeneratedQuestions: normalized };
}

export async function runTinyFishAnalysis(
  url: string,
  options: RunOptions = {}
): Promise<TinyFishAnalysis> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TINYFISH_API_KEY");
  }

  const baseUrl = process.env.TINYFISH_BASE_URL || DEFAULT_BASE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/v1/automation/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          url,
          goal: buildAnalysisGoal(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const raw = await response.text();
        const status = response.status;
        if (status === 401) {
          let detail = "Invalid or expired API key";
          try {
            const body = JSON.parse(raw) as { error?: { code?: string; message?: string } };
            if (body?.error?.message) detail = body.error.message;
          } catch {
            // use default
          }
          throw new TinyFishError(
            `TinyFish API key is invalid or not configured. Add a valid TINYFISH_API_KEY to your .env file. (${detail})`,
            status
          );
        }
        throw new TinyFishError(
          `TinyFish request failed: ${status} ${raw}`,
          status
        );
      }

      const json = (await response.json()) as TinyFishRunResponse;
      const payload = json.result ?? json.resultJson ?? json;
      return normalizeAnalysis(payload);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        error = new TinyFishError("TinyFish request timed out", 504);
      }
      if (attempt >= maxRetries || !isRetryable(error)) throw error;
      const backoff =
        DEFAULT_BACKOFF_MS * Math.pow(2, attempt) +
        Math.floor(Math.random() * DEFAULT_BACKOFF_MS);
      await sleep(backoff);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("TinyFish request failed after retries");
}

/**
 * Run TinyFish with a custom goal and return the raw JSON payload (no normalization).
 * Use for Reddit discovery or other flows that need a custom response shape.
 */
export async function runTinyFishWithGoal(
  url: string,
  goal: string,
  options: RunOptions = {}
): Promise<unknown> {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) {
    throw new Error("Missing TINYFISH_API_KEY");
  }

  const baseUrl = process.env.TINYFISH_BASE_URL || DEFAULT_BASE_URL;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;

  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const requestBody: Record<string, unknown> = { url, goal };
      if (options.browserProfile) {
        requestBody.browser_profile = options.browserProfile;
      }

      const response = await fetch(`${baseUrl}/v1/automation/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        const raw = await response.text();
        const status = response.status;
        if (status === 401) {
          let detail = "Invalid or expired API key";
          try {
            const body = JSON.parse(raw) as { error?: { code?: string; message?: string } };
            if (body?.error?.message) detail = body.error.message;
          } catch {
            // use default
          }
          throw new TinyFishError(
            `TinyFish API key is invalid or not configured. Add a valid TINYFISH_API_KEY to your .env file. (${detail})`,
            status
          );
        }
        throw new TinyFishError(
          `TinyFish request failed: ${status} ${raw}`,
          status
        );
      }

      const json = (await response.json()) as TinyFishRunResponse;
      return json.result ?? json.resultJson ?? json;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        error = new TinyFishError("TinyFish request timed out", 504);
      }
      if (attempt >= maxRetries || !isRetryable(error)) throw error;
      const backoff =
        DEFAULT_BACKOFF_MS * Math.pow(2, attempt) +
        Math.floor(Math.random() * DEFAULT_BACKOFF_MS);
      await sleep(backoff);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("TinyFish request failed after retries");
}
