// OpenRouter models - prioritize fast, capable models for JSON generation
const OPENROUTER_MODELS = [
  "google/gemini-2.0-flash-001",
  "meta-llama/llama-3.1-70b-instruct",
  "meta-llama/llama-3.1-8b-instruct",
];

interface OpenRouterMessage {
  role: "system" | "user";
  content: string;
}

export async function callOpenRouterWithRetry(
  promptOrMessages: string | OpenRouterMessage[],
  apiKey: string,
  maxRetries: number = 2
): Promise<{ text: string }> {
  let lastError: Error | null = null;

  const messages: OpenRouterMessage[] =
    typeof promptOrMessages === "string"
      ? [{ role: "user", content: promptOrMessages }]
      : promptOrMessages;

  for (const model of OPENROUTER_MODELS) {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "HTTP-Referer": "https://localhost:3000",
              "X-Title": "Customer Discovery App",
            },
            body: JSON.stringify({
              model,
              messages,
              temperature: 0.2,
              max_tokens: 8192,
            }),
          }
        );

        if (response.ok) {
          const data = await response.json();
          const text = data.choices?.[0]?.message?.content;

          if (!text) {
            throw new Error("No text in OpenRouter response");
          }

          return { text };
        }

        const errorBody = await response.text();

        if (response.status === 429) {
          const retryMatch = errorBody.match(/retry in (\d+)/i);
          const retryDelay = retryMatch
            ? parseInt(retryMatch[1]) * 1000
            : 3000;

          if (retryDelay <= 10000 && attempt < maxRetries - 1) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
            continue;
          }
          break;
        }

        lastError = new Error(`API error ${response.status}: ${errorBody}`);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        await new Promise((resolve) =>
          setTimeout(resolve, 1000 * (attempt + 1))
        );
      }
    }
  }

  throw lastError || new Error("All OpenRouter models failed");
}

export function parseOpenRouterJson<T>(text: string): T {
  try {
    return JSON.parse(text);
  } catch {
    const cleanedContent = text
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    try {
      return JSON.parse(cleanedContent);
    } catch {
      const jsonMatch = cleanedContent.match(/[\[{][\s\S]*[\]}]/);
      if (jsonMatch) {
        let jsonStr = jsonMatch[0];

        if (!jsonStr.endsWith("]") && !jsonStr.endsWith("}")) {
          const lastCompleteIndex = Math.max(
            jsonStr.lastIndexOf("},"),
            jsonStr.lastIndexOf("}]")
          );
          if (lastCompleteIndex > 0) {
            jsonStr = jsonStr.substring(0, lastCompleteIndex + 1);
            if (jsonStr.startsWith("[")) {
              jsonStr += "]";
            }
          }
        }
        return JSON.parse(jsonStr);
      }
      throw new Error("No valid JSON found in response");
    }
  }
}
