import { TinyFish } from "@tiny-fish/sdk";
import { formatStepMessage, isSystemEvent } from "./utils";

type AgentStreamParams = Parameters<TinyFish["agent"]["stream"]>[0];

type TinyFishStreamEventBase = { type: string };
type TinyFishStreamingUrlEvent = TinyFishStreamEventBase & {
  type: "STREAMING_URL";
  streaming_url: string;
};
type TinyFishProgressEvent = TinyFishStreamEventBase & {
  type: "PROGRESS";
  purpose?: string;
  action?: string;
};
type TinyFishCompleteEvent = TinyFishStreamEventBase & {
  type: "COMPLETE";
  status?: string;
  result?: unknown;
  result_json?: unknown;
  resultJson?: unknown;
  error?: { message?: string } | string;
  message?: string;
};

type TinyFishStreamEvent =
  | TinyFishStreamingUrlEvent
  | TinyFishProgressEvent
  | TinyFishCompleteEvent
  | (TinyFishStreamEventBase & Record<string, unknown>);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toTinyFishEvent(value: unknown): TinyFishStreamEvent | null {
  if (!isRecord(value)) return null;
  if (typeof value.type !== "string") return null;
  return value as TinyFishStreamEvent;
}

export interface TinyFishRequestConfig {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: {
    enabled: boolean;
    country_code?: "US" | "GB" | "CA" | "DE" | "FR" | "JP" | "AU";
  };
}

export interface TinyFishResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  streamingUrl?: string;
}

export interface TinyFishCallbacks {
  onStep?: (message: string) => void;
  onStreamingUrl?: (url: string) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: string) => void;
}

let clientPromise: Promise<TinyFish> | null = null;
async function getClient(apiKey?: string): Promise<TinyFish> {
  // The SDK reads `TINYFISH_API_KEY` from env; keep compatibility with callers
  // that pass `apiKey` separately.
  if (!process.env.TINYFISH_API_KEY && apiKey) {
    process.env.TINYFISH_API_KEY = apiKey;
  }

  if (!clientPromise) {
    clientPromise = Promise.resolve(new TinyFish());
  }
  return clientPromise;
}

/**
 * Execute a TinyFish automation task with callbacks for progress
 */
export async function runTinyFishAutomation(
  config: TinyFishRequestConfig,
  apiKey: string,
  callbacks?: TinyFishCallbacks,
): Promise<TinyFishResponse> {
  let streamingUrl: string | undefined;

  try {
    const client = await getClient(apiKey);

    const stream = await client.agent.stream(config as unknown as AgentStreamParams);

    for await (const rawEvent of stream as AsyncIterable<unknown>) {
      const event = toTinyFishEvent(rawEvent);
      if (!event) continue;

      const rawStreamingUrl = (event as Record<string, unknown>).streaming_url;
      if (event.type === "STREAMING_URL" && typeof rawStreamingUrl === "string") {
        streamingUrl = rawStreamingUrl;
        callbacks?.onStreamingUrl?.(rawStreamingUrl);
        continue;
      }

      if (event.type === "PROGRESS") {
        if (!isSystemEvent(event)) {
          callbacks?.onStep?.(formatStepMessage(event));
        }
        continue;
      }

      if (event.type === "COMPLETE") {
        const status = String((event as TinyFishCompleteEvent).status ?? "").toUpperCase();
        const isSuccess = status === "COMPLETED";
        const complete = event as TinyFishCompleteEvent;
        const result = complete.result ?? complete.result_json ?? complete.resultJson;
        const errorMsg =
          (typeof complete.error === "string"
            ? complete.error
            : complete.error?.message) ||
          complete.message ||
          "Automation failed";

        if (isSuccess) {
          callbacks?.onComplete?.(result);
          return { success: true, result, streamingUrl };
        }

        callbacks?.onError?.(String(errorMsg));
        return { success: false, error: String(errorMsg), streamingUrl };
      }
    }

    return { success: false, error: "Stream ended without completion event", streamingUrl };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    callbacks?.onError?.(errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  }
}

/**
 * Build TinyFish goal for different source types
 */
export function buildScrapeGoal(
  sourceType: "docs" | "github" | "stackoverflow" | "blog",
  topic: string,
): string {
  const goals: Record<string, string> = {
    docs: `Extract technical documentation content about "${topic}".

TASK: Scrape the main content from this documentation page.

Extract:
1. Main concepts and explanations
2. API methods, parameters, return types
3. Code examples and usage patterns
4. Important notes, warnings, or tips
5. Links to related topics

Return JSON:
{
  "title": "Page title",
  "content": "Full extracted content in markdown format",
  "codeExamples": ["code snippet 1", "code snippet 2"],
  "keyPoints": ["important point 1", "important point 2"]
}

Return valid JSON only.`,

    github: `Extract relevant information from this GitHub page about "${topic}".

TASK: Scrape issues, discussions, or README content related to the topic.

Extract:
1. Issue/discussion titles and descriptions
2. Key problems and solutions mentioned
3. Common error messages and fixes
4. Best practices shared by users
5. Code snippets or workarounds

Return JSON:
{
  "title": "Page/repo title",
  "content": "Full extracted content in markdown format",
  "issues": [{"title": "...", "solution": "..."}],
  "gotchas": ["gotcha 1", "gotcha 2"]
}

Return valid JSON only.`,

    stackoverflow: `Extract Q&A content about "${topic}" from this Stack Overflow page.

TASK: Scrape the question, accepted answer, and top-voted answers.

Extract:
1. The question being asked
2. Accepted answer (if any)
3. Top 2-3 answers with high votes
4. Code examples from answers
5. Common mistakes mentioned

Return JSON:
{
  "question": "The main question",
  "acceptedAnswer": "Accepted answer content",
  "topAnswers": ["answer 1", "answer 2"],
  "codeExamples": ["code 1", "code 2"],
  "commonMistakes": ["mistake 1", "mistake 2"]
}

Return valid JSON only.`,

    blog: `Extract article content about "${topic}" from this developer blog post.

TASK: Scrape the full article content.

Extract:
1. Article title and introduction
2. Main content and explanations
3. Code examples and tutorials
4. Pro tips and best practices
5. Conclusions and recommendations

Return JSON:
{
  "title": "Article title",
  "author": "Author name if visible",
  "content": "Full article content in markdown format",
  "codeExamples": ["code 1", "code 2"],
  "tips": ["tip 1", "tip 2"]
}

Return valid JSON only.`,
  };

  return goals[sourceType] || goals.docs;
}

/**
 * Parse scraped result into plain text content
 */
export function parseScrapedContent(result: unknown): string {
  if (!result) return "";

  if (typeof result === "string") {
    return result;
  }

  if (typeof result === "object") {
    const obj = result as Record<string, unknown>;

    // Try to find content field
    const contentField =
      obj.content ||
      obj.text ||
      obj.body ||
      obj.markdown ||
      obj.extracted_content;

    if (typeof contentField === "string") {
      return contentField;
    }

    // Combine multiple fields
    const parts: string[] = [];

    if (obj.title) parts.push(`# ${obj.title}\n`);
    if (obj.question) parts.push(`## Question\n${obj.question}\n`);
    if (obj.acceptedAnswer) parts.push(`## Answer\n${obj.acceptedAnswer}\n`);
    if (obj.content) parts.push(String(obj.content));

    if (Array.isArray(obj.codeExamples)) {
      parts.push("\n## Code Examples\n");
      obj.codeExamples.forEach((code) => {
        parts.push(`\`\`\`\n${code}\n\`\`\`\n`);
      });
    }

    if (Array.isArray(obj.keyPoints)) {
      parts.push("\n## Key Points\n");
      obj.keyPoints.forEach((point) => {
        parts.push(`- ${point}\n`);
      });
    }

    if (Array.isArray(obj.tips)) {
      parts.push("\n## Tips\n");
      obj.tips.forEach((tip) => {
        parts.push(`- ${tip}\n`);
      });
    }

    if (Array.isArray(obj.gotchas)) {
      parts.push("\n## Gotchas\n");
      obj.gotchas.forEach((gotcha) => {
        parts.push(`- ${gotcha}\n`);
      });
    }

    if (Array.isArray(obj.commonMistakes)) {
      parts.push("\n## Common Mistakes\n");
      obj.commonMistakes.forEach((mistake) => {
        parts.push(`- ${mistake}\n`);
      });
    }

    if (parts.length > 0) {
      return parts.join("\n");
    }

    // Fallback: stringify the object
    return JSON.stringify(result, null, 2);
  }

  return String(result);
}

