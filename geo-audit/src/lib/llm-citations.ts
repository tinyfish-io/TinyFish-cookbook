/**
 * Second-layer GEO: check if OpenAI (ChatGPT) cites the company/site when
 * asked relevant questions. Used to measure "generative engine presence"
 * beyond on-site readiness.
 */

const PROVIDER_TIMEOUT_MS = 25_000;
const MAX_TOPICS = 5;

export type ProviderCitationResult = {
  cited: boolean;
  snippet: string | null;
  error: string | null;
  configured: boolean;
};

export type TopicCitationResult = {
  query: string;
  openai: ProviderCitationResult;
  gemini: ProviderCitationResult;
  claude: ProviderCitationResult;
};

export type LlmCitationCheckResult = {
  url: string;
  domain: string;
  brand: string;
  topics: TopicCitationResult[];
  summary: {
    openai: { cited: number; total: number };
    gemini: { cited: number; total: number };
    claude: { cited: number; total: number };
  };
};

/** Derive domain and a human-readable brand from URL for citation matching. */
export function deriveBrandFromUrl(url: string): { domain: string; brand: string } {
  let parsed: URL;
  try {
    parsed = new URL(url.toLowerCase().startsWith("http") ? url : `https://${url}`);
  } catch {
    return { domain: url, brand: url };
  }
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const domain = host;

  // Brand: first segment (e.g. stripe from stripe.com, vercel from vercel.com)
  const segment = host.split(".")[0] ?? host;
  const brand =
    segment.charAt(0).toUpperCase() + segment.slice(1).toLowerCase();

  return { domain, brand };
}

/** Check if response text mentions the domain or brand (case-insensitive). */
export function checkCitationInText(
  text: string,
  domain: string,
  brand: string
): boolean {
  const lower = text.toLowerCase();
  const domainNorm = domain.toLowerCase();
  const brandNorm = brand.toLowerCase();
  return lower.includes(domainNorm) || lower.includes(brandNorm);
}

/** Truncate for snippet display. */
function snippet(text: string, maxLen: number): string {
  const t = text.trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen).trim() + "…";
}

async function queryOpenAI(userQuery: string): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        messages: [{ role: "user", content: userQuery }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`OpenAI ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : "";
  } finally {
    clearTimeout(timeout);
  }
}

async function queryGemini(userQuery: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not set");

  const model = process.env.GEMINI_MODEL ?? "gemini-1.5-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userQuery }] }],
          generationConfig: { temperature: 0.3 },
        }),
        signal: controller.signal,
      }
    );

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Gemini ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : "";
  } finally {
    clearTimeout(timeout);
  }
}

async function queryClaude(userQuery: string): Promise<string> {
  const apiKey = process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error("CLAUDE_API_KEY not set");

  const model = process.env.CLAUDE_MODEL ?? "claude-3-5-haiku-20241022";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        messages: [{ role: "user", content: userQuery }],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Claude ${res.status}: ${body.slice(0, 200)}`);
    }

    const json = (await res.json()) as {
      content?: Array<{ type: string; text?: string }>;
    };
    const block = json.content?.find((b) => b.type === "text");
    const text = block?.text;
    return typeof text === "string" ? text : "";
  } finally {
    clearTimeout(timeout);
  }
}

function buildDefaultQueries(brand: string, domain: string): string[] {
  return [
    `What is ${brand} and what do they offer?`,
    `Recommend ${brand} or similar alternatives.`,
    `Have you heard of ${domain}? What are they known for?`,
  ];
}

function buildProviderResult(
  configured: boolean,
  text: string | null,
  error: string | null,
  domain: string,
  brand: string
): ProviderCitationResult {
  if (!configured) {
    return { cited: false, snippet: null, error: null, configured: false };
  }
  if (error) {
    return { cited: false, snippet: null, error, configured: true };
  }
  return {
    cited: checkCitationInText(text ?? "", domain, brand),
    snippet: text ? snippet(text, 280) : null,
    error: null,
    configured: true,
  };
}

/**
 * Run the second-layer GEO check: for each topic, query OpenAI, Gemini, and
 * Claude and check if the response cites the domain or brand.
 */
export async function runLlmCitationCheck(
  url: string,
  topics?: string[]
): Promise<LlmCitationCheckResult> {
  const { domain, brand } = deriveBrandFromUrl(url);
  const rawQueries = topics?.length ? topics : buildDefaultQueries(brand, domain);
  const queries = rawQueries.slice(0, MAX_TOPICS);

  const summary = {
    openai: { cited: 0, total: 0 },
    gemini: { cited: 0, total: 0 },
    claude: { cited: 0, total: 0 },
  };
  const topicsResults: TopicCitationResult[] = [];
  const openaiConfigured = Boolean(process.env.OPENAI_API_KEY);
  const geminiConfigured = Boolean(process.env.GEMINI_API_KEY);
  const claudeConfigured = Boolean(process.env.CLAUDE_API_KEY);

  for (const query of queries) {
    const runWithCatch = <T>(p: Promise<T>): Promise<{ text: T; error: null } | { text: null; error: string }> =>
      p.then((text) => ({ text, error: null })).catch((e) => ({ text: null, error: e instanceof Error ? e.message : String(e) }));

    const [openaiRes, geminiRes, claudeRes] = await Promise.all([
      openaiConfigured ? runWithCatch(queryOpenAI(query)) : Promise.resolve({ text: null, error: null }),
      geminiConfigured ? runWithCatch(queryGemini(query)) : Promise.resolve({ text: null, error: null }),
      claudeConfigured ? runWithCatch(queryClaude(query)) : Promise.resolve({ text: null, error: null }),
    ]);

    const openai = buildProviderResult(
      openaiConfigured,
      openaiRes.text,
      openaiRes.error,
      domain,
      brand
    );
    const gemini = buildProviderResult(
      geminiConfigured,
      geminiRes.text,
      geminiRes.error,
      domain,
      brand
    );
    const claude = buildProviderResult(
      claudeConfigured,
      claudeRes.text,
      claudeRes.error,
      domain,
      brand
    );

    if (openaiConfigured) {
      summary.openai.total += 1;
      if (openai.cited) summary.openai.cited += 1;
    }
    if (geminiConfigured) {
      summary.gemini.total += 1;
      if (gemini.cited) summary.gemini.cited += 1;
    }
    if (claudeConfigured) {
      summary.claude.total += 1;
      if (claude.cited) summary.claude.cited += 1;
    }
    topicsResults.push({ query, openai, gemini, claude });
  }

  return {
    url,
    domain,
    brand,
    topics: topicsResults,
    summary,
  };
}
