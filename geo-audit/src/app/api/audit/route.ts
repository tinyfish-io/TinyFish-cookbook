import { NextResponse } from "next/server";
import { runAuditJob } from "@/lib/audit-runner";
import { parseEnvNumber } from "@/lib/env";
import { runRedditDiscovery } from "@/lib/reddit-discovery";
import { runLlmCitationCheck } from "@/lib/llm-citations";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes max execution time (Vercel Pro limit)

const globalForCache = global as unknown as {
  auditCache?: Map<string, { response: unknown; ts: number }>;
};
const auditCache = globalForCache.auditCache ?? new Map();
globalForCache.auditCache = auditCache;

const CACHE_TTL_SECONDS = parseEnvNumber("AUDIT_CACHE_TTL_SECONDS", 120, {
  min: 30,
});
const MAX_SITEMAP_PAGES = parseEnvNumber("AUDIT_MAX_SITEMAP_PAGES", 10, {
  min: 1,
});
const CONCURRENCY_LIMIT = parseEnvNumber("AUDIT_CONCURRENCY_LIMIT", 3, {
  min: 1,
});
const USE_OPENAI_CLEANUP = process.env.USE_OPENAI_CLEANUP === "true";
const TINYFISH_TIMEOUT_MS = parseEnvNumber("TINYFISH_TIMEOUT_MS", 180000, {
  min: 1000,
});
const TINYFISH_MAX_RETRIES = parseEnvNumber("TINYFISH_MAX_RETRIES", 0, {
  min: 0,
});
const TINYFISH_SINGLE_MAX_RETRIES = 0;

export async function POST(request: Request) {
  let payload: {
    url?: string;
    scope?: string;
    sitemap?: boolean;
    includeReddit?: boolean;
    includeLlmCitations?: boolean;
  } | null = null;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = payload?.url?.trim();
  if (!url) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid url" }, { status: 400 });
  }

  const includeReddit = payload?.includeReddit === true;
  const includeLlmCitations = payload?.includeLlmCitations === true;

  try {
    const cacheKey = `${url.toLowerCase()}:${payload?.sitemap ? "sitemap" : "single"}:${payload?.scope ?? ""}:${USE_OPENAI_CLEANUP ? "openai" : "tinyfish"}${includeReddit ? ":reddit" : ""}${includeLlmCitations ? ":llm" : ""}`;
    const cached = auditCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL_SECONDS * 1000) {
      return NextResponse.json(cached.response);
    }

    const result = await runAuditJob(
      {
        url,
        scope: payload?.scope,
        sitemap: payload?.sitemap,
        useOpenAiCleanup: USE_OPENAI_CLEANUP,
      },
      {
        maxSitemapPages: MAX_SITEMAP_PAGES,
        concurrencyLimit: CONCURRENCY_LIMIT,
        tinyfishTimeoutMs: TINYFISH_TIMEOUT_MS,
        tinyfishRetries: payload?.sitemap
          ? TINYFISH_MAX_RETRIES
          : TINYFISH_SINGLE_MAX_RETRIES,
      }
    );

    let responseBody = result.body as Record<string, unknown>;

    if (result.status === 200 && includeReddit) {
      const auditUrl = typeof responseBody.baseUrl === "string" ? responseBody.baseUrl : url;
      try {
        const redditResult = await runRedditDiscovery(auditUrl, {
          maxPosts: 8,
          analyzeCount: 0,
          timeoutMs: 120_000,
        });
        responseBody = { ...responseBody, reddit: redditResult };
      } catch (redditErr) {
        const errMsg = redditErr instanceof Error ? redditErr.message : "Reddit discovery failed";
        responseBody = {
          ...responseBody,
          reddit: { redditPostUrls: [], error: errMsg },
        };
      }
    }

    if (result.status === 200 && includeLlmCitations) {
      const auditUrl = typeof responseBody.baseUrl === "string" ? responseBody.baseUrl : url;
      try {
        const llmResult = await Promise.race([
          runLlmCitationCheck(auditUrl, undefined),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("LLM citation check timed out")), 90_000)
          ),
        ]);
        responseBody = { ...responseBody, llmCitations: llmResult };
      } catch (llmErr) {
        const errMsg = llmErr instanceof Error ? llmErr.message : "LLM citation check failed";
        responseBody = { ...responseBody, llmCitations: { error: errMsg } };
      }
    }

    if (result.status === 200) {
      auditCache.set(cacheKey, { response: responseBody, ts: Date.now() });
    }

    return NextResponse.json(responseBody, { status: result.status });
  } catch (error) {
    console.error("Audit API error:", error);
    
    // Handle specific error types with better messages
    let message = "Unexpected error occurred";
    let status = 500;
    
    if (error instanceof Error) {
      message = error.message;

      // Check for TinyFish API key errors (401)
      if (
        message.includes("TINYFISH_API_KEY") ||
        message.includes("Invalid or expired API key")
      ) {
        status = 401;
        message =
          "TinyFish API key is invalid or not set. Add TINYFISH_API_KEY to your .env file (see .env.example).";
      }
      // Check for timeout errors
      else if (message.includes("timed out") || message.includes("timeout")) {
        status = 504;
        message =
          "The audit took too long to complete. Try a simpler page, or increase TINYFISH_TIMEOUT_MS in .env (e.g. 240000 for 4 minutes).";
      }
      // Other TinyFish API errors
      else if (message.includes("TinyFish")) {
        status = 502;
        message = `TinyFish API error: ${message}`;
      }
    }
    
    return NextResponse.json({ error: message }, { status });
  }
}
