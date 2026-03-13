import { normalizeAnalysis, TinyFishAnalysis } from "@/lib/tinyfish";
import { parseEnvNumber } from "@/lib/env";

const DEFAULT_MODEL = "gpt-4o-mini";
const DEFAULT_TIMEOUT_MS = parseEnvNumber("OPENAI_TIMEOUT_MS", 30000, {
  min: 1000,
});
const DEFAULT_MAX_RETRIES = parseEnvNumber("OPENAI_MAX_RETRIES", 1, { min: 0 });
const DEFAULT_BACKOFF_MS = parseEnvNumber("OPENAI_BACKOFF_MS", 500, { min: 0 });

class OpenAiError extends Error {
  statusCode?: number;
  constructor(message: string, statusCode?: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

function isRetryable(error: unknown) {
  if (error instanceof OpenAiError) {
    return error.statusCode === 429 || (error.statusCode ?? 0) >= 500;
  }
  return error instanceof Error && error.name === "AbortError";
}

function buildCleanupPrompt(input: TinyFishAnalysis): string {
  return [
    "You will receive JSON with selfGeneratedQuestions.",
    "Normalize it to strict JSON with the same shape.",
    "Rules:",
    "- Keep exactly 6 questions in the same order if possible.",
    '- answeredInDocs must be "true", "false", or "partial".',
    '- importance must be "high" or "medium".',
    "- partialAnswer must be <= 120 chars.",
    "Return JSON only with key selfGeneratedQuestions.",
    "Input JSON:",
    JSON.stringify(input),
  ].join(" ");
}

export async function runOpenAiCleanup(
  input: TinyFishAnalysis
): Promise<TinyFishAnalysis> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY");
  }

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL;
  const sleep = (ms: number) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  for (let attempt = 0; attempt <= DEFAULT_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                "You are a strict JSON normalizer for audit outputs. Return JSON only.",
            },
            {
              role: "user",
              content: buildCleanupPrompt(input),
            },
          ],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const message = await response.text();
        throw new OpenAiError(
          `OpenAI request failed: ${response.status} ${message}`,
          response.status
        );
      }

      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error("OpenAI response missing content");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch {
        throw new Error("OpenAI returned non-JSON output");
      }

      return normalizeAnalysis(parsed);
    } catch (error) {
      if (attempt >= DEFAULT_MAX_RETRIES || !isRetryable(error)) {
        throw error;
      }
      const backoff =
        DEFAULT_BACKOFF_MS * Math.pow(2, attempt) +
        Math.floor(Math.random() * DEFAULT_BACKOFF_MS);
      await sleep(backoff);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("OpenAI request failed after retries");
}
