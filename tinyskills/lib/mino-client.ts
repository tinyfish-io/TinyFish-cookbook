/**
 * Mino API client for SkillForge
 * Handles SSE streaming for scraping operations
 */

import {
  parseSSELine,
  isCompleteEvent,
  isErrorEvent,
  formatStepMessage,
  isSystemEvent,
} from "./utils";

const MINO_API_URL = "https://mino.ai/v1/automation/run-sse";

export interface MinoRequestConfig {
  url: string;
  goal: string;
  browser_profile?: "lite" | "stealth";
  proxy_config?: {
    enabled: boolean;
    country_code?: "US" | "GB" | "CA" | "DE" | "FR" | "JP" | "AU";
  };
}

export interface MinoResponse {
  success: boolean;
  result?: unknown;
  error?: string;
  streamingUrl?: string;
}

export interface MinoCallbacks {
  onStep?: (message: string) => void;
  onStreamingUrl?: (url: string) => void;
  onComplete?: (result: unknown) => void;
  onError?: (error: string) => void;
}

/**
 * Execute a Mino automation task with callbacks for progress
 */
export async function runMinoAutomation(
  config: MinoRequestConfig,
  apiKey: string,
  callbacks?: MinoCallbacks
): Promise<MinoResponse> {
  let streamingUrl: string | undefined;

  try {
    const response = await fetch(MINO_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(config),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API request failed: ${response.status} ${errorText}`);
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const event = parseSSELine(line);
        if (!event) continue;

        // Capture streaming URL if available
        if (event.streamingUrl) {
          streamingUrl = event.streamingUrl;
          callbacks?.onStreamingUrl?.(event.streamingUrl);
        }

        // Forward step progress (filter system events)
        if (event.type === "STEP" && !isSystemEvent(event)) {
          callbacks?.onStep?.(formatStepMessage(event));
        }

        // Check for completion
        if (isCompleteEvent(event)) {
          callbacks?.onComplete?.(event.resultJson);
          return {
            success: true,
            result: event.resultJson,
            streamingUrl,
          };
        }

        // Check for errors
        if (isErrorEvent(event)) {
          const errorMsg = event.message || "Automation failed";
          callbacks?.onError?.(errorMsg);
          return {
            success: false,
            error: errorMsg,
            streamingUrl,
          };
        }
      }
    }

    // If we reach here without completion, it's an unexpected end
    return {
      success: false,
      error: "Stream ended without completion event",
      streamingUrl,
    };
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
 * Build Mino goal for different source types
 */
export function buildScrapeGoal(
  sourceType: "docs" | "github" | "stackoverflow" | "blog",
  topic: string
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
