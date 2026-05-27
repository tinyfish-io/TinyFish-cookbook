import type {
  MachineReadabilitySignals,
  PageLlmoSignals,
} from "@/lib/llmo-types";

function withTimeout(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function normalizeUrl(rawUrl: string): URL | null {
  try {
    return new URL(rawUrl);
  } catch {
    return null;
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function collectSchemaTypes(input: unknown, types: Set<string>) {
  if (!input || typeof input !== "object") return;
  if (Array.isArray(input)) {
    for (const item of input) collectSchemaTypes(item, types);
    return;
  }
  const record = input as Record<string, unknown>;
  const atType = record["@type"];
  if (typeof atType === "string") types.add(atType);
  if (Array.isArray(atType)) {
    for (const v of atType) if (typeof v === "string") types.add(v);
  }
  for (const value of Object.values(record)) collectSchemaTypes(value, types);
}

function parseJsonLdTypes(html: string): string[] {
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  const types = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    const raw = (match[1] ?? "").trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw) as unknown;
      collectSchemaTypes(parsed, types);
    } catch {
      // Ignore invalid JSON-LD blocks.
    }
  }
  return Array.from(types.values()).sort();
}

function headingLevels(html: string): number[] {
  const pattern = /<h([1-6])\b/gi;
  const levels: number[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(html)) !== null) {
    levels.push(Number(match[1]));
  }
  return levels;
}

function hasSkippedHeadingLevels(levels: number[]): boolean {
  if (levels.length <= 1) return false;
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i] - levels[i - 1] > 1) return true;
  }
  return false;
}

function hasMeta(html: string, values: string[]): boolean {
  const lower = html.toLowerCase();
  return values.some((v) => lower.includes(v.toLowerCase()));
}

function countFactStatements(text: string): number {
  if (!text) return 0;
  const sentences = text.split(/[.!?]/).map((s) => s.trim()).filter(Boolean);
  const factPattern =
    /\b(is|are|includes?|supports?|offers?|provides?|costs?|pricing|founded|since|integrates?)\b/i;
  return sentences.filter((s) => factPattern.test(s)).length;
}

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const response = await fetch(url, { signal: withTimeout(timeoutMs) });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

export async function collectPageLlmoSignals(url: string): Promise<PageLlmoSignals> {
  const html = (await fetchText(url, 10000)) ?? "";
  const text = stripHtml(html);
  const types = parseJsonLdTypes(html);
  const levels = headingLevels(html);

  return {
    url,
    structuredData: {
      hasJsonLd: types.length > 0,
      types,
      hasOrganization: types.some((t) => t.toLowerCase() === "organization"),
      hasWebSite: types.some((t) => t.toLowerCase() === "website"),
      hasArticle: types.some((t) => t.toLowerCase() === "article"),
      hasProduct: types.some((t) => t.toLowerCase() === "product"),
      hasFaqPage: types.some((t) => t.toLowerCase() === "faqpage"),
    },
    extractability: {
      hasH1: levels.includes(1),
      h1Count: levels.filter((n) => n === 1).length,
      headingLevels: levels,
      hasSkippedHeadingLevels: hasSkippedHeadingLevels(levels),
      paragraphCount: (html.match(/<p\b/gi) ?? []).length,
      factStatementCount: countFactStatements(text),
    },
    authority: {
      hasAuthor: hasMeta(html, ['name="author"', 'property="article:author"', 'itemprop="author"']),
      hasPublishedTime: hasMeta(html, [
        'property="article:published_time"',
        'itemprop="datepublished"',
        'name="publishdate"',
      ]),
      hasModifiedTime: hasMeta(html, [
        'property="article:modified_time"',
        'itemprop="datemodified"',
        'name="last-modified"',
      ]),
      hasCanonical: hasMeta(html, ['rel="canonical"']),
      hasOrganizationPublisher: types.some((t) => t.toLowerCase() === "organization"),
    },
  };
}

export async function collectMachineReadabilitySignals(baseUrl: string): Promise<MachineReadabilitySignals> {
  const url = normalizeUrl(baseUrl);
  if (!url) {
    return {
      hasRobotsTxt: false,
      hasSitemapXml: false,
      hasLlmsTxt: false,
    };
  }

  const root = `${url.protocol}//${url.host}`;
  const [robotsTxt, sitemapXml, llmsTxt] = await Promise.all([
    fetchText(`${root}/robots.txt`, 5000),
    fetchText(`${root}/sitemap.xml`, 5000),
    fetchText(`${root}/llms.txt`, 5000),
  ]);

  const hasSitemapInRobots = (robotsTxt ?? "").toLowerCase().includes("sitemap:");
  return {
    hasRobotsTxt: robotsTxt != null,
    hasSitemapXml: sitemapXml != null || hasSitemapInRobots,
    hasLlmsTxt: llmsTxt != null,
  };
}
