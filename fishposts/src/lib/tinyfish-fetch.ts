/**
 * TinyFish Fetch API client — render pages and extract clean text.
 * Falls back to TinyFish agent automation if fetch fails.
 */

import { runAutomation } from "./tinyfish";

interface FetchResult {
  url: string;
  final_url: string;
  title: string | null;
  description: string | null;
  language: string | null;
  text: string;
}

interface FetchResponse {
  results: FetchResult[];
  errors: Array<{ url: string; error: string }>;
}

function getApiKey(): string {
  const key = process.env.TINYFISH_API_KEY;
  if (!key) throw new Error("TINYFISH_API_KEY is not set");
  return key;
}

/**
 * Fetch a URL using TinyFish Fetch API (fast, no guard).
 * Returns extracted markdown text.
 */
async function fetchViaAPI(url: string): Promise<{ title: string | null; text: string }> {
  const res = await fetch("https://agent.tinyfish.ai/v1/fetch", {
    method: "POST",
    headers: {
      "X-API-Key": getApiKey(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      urls: [url],
      format: "markdown",
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Fetch API error ${res.status}: ${errText}`);
  }

  const data: FetchResponse = await res.json();

  if (data.errors?.length > 0) {
    throw new Error(`Fetch failed: ${data.errors[0].error}`);
  }

  if (!data.results?.length) {
    throw new Error("Fetch returned no results");
  }

  const result = data.results[0];
  return {
    title: result.title,
    text: result.text || "",
  };
}

/**
 * Fallback: use TinyFish agent to browse and extract page content.
 * Slower (~30s+) but handles anti-bot sites.
 */
async function fetchViaAgent(url: string): Promise<{ title: string | null; text: string }> {
  const goal = `Visit this page and extract its content.

1. Read all visible text on the page.
2. Note the page title, main heading, and key content.
3. If a cookie banner appears, dismiss it first.

Return a JSON object:
{
  "title": "page title",
  "text": "main content of the page, including headings, key claims, marketing copy, and notable details"
}

Keep the text under 2000 characters. Focus on the most interesting/notable content.`;

  let resultText = "";

  await runAutomation(url, goal, (event) => {
    if (event.type === "COMPLETE" || event.status === "COMPLETED") {
      resultText = JSON.stringify(event.resultJson ?? event);
    }
  });

  // Try to parse structured result
  try {
    const parsed = JSON.parse(resultText);
    const result = parsed.resultJson || parsed.result || parsed;
    if (typeof result === "object" && result !== null) {
      // Walk through nested fields to find text
      const text = result.text || result.content || result.summary ||
        (typeof result.result === "string" ? result.result : null);
      if (text) {
        return { title: result.title || null, text: String(text) };
      }
    }
  } catch { /* not JSON */ }

  // Fallback: return raw text
  if (resultText.length > 50) {
    return { title: null, text: resultText.slice(0, 2000) };
  }

  throw new Error("Agent could not extract page content");
}

/**
 * Fetch page content with automatic fallback.
 * Tries Fetch API first (fast), falls back to agent (reliable).
 */
export async function fetchPageContent(
  url: string,
  onProgress?: (msg: string) => void,
): Promise<{ title: string | null; text: string; method: "fetch_api" | "agent" }> {
  // Normalize URL
  let normalizedUrl = url;
  if (!normalizedUrl.startsWith("http://") && !normalizedUrl.startsWith("https://")) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  // Try Fetch API first
  try {
    onProgress?.("Reading the page...");
    const result = await fetchViaAPI(normalizedUrl);
    if (result.text.length > 30) {
      return { ...result, method: "fetch_api" };
    }
    throw new Error("Fetch returned too little content");
  } catch (fetchErr) {
    console.log(`[FishPosts] Fetch API failed for ${normalizedUrl}: ${fetchErr instanceof Error ? fetchErr.message : fetchErr}. Falling back to agent.`);
  }

  // Fallback to agent
  onProgress?.("Page protected — sending the fish agent...");
  const result = await fetchViaAgent(normalizedUrl);
  return { ...result, method: "agent" };
}
