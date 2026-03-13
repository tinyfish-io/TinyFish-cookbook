import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  textNodeName: "#text",
  trimValues: true,
});

const FETCH_TIMEOUT_MS = 10000;
const FETCH_MAX_RETRIES = 2;
const FETCH_BACKOFF_MS = 500;

type SitemapResult = {
  urls: string[];
  totalFound: number;
};

function toArray<T>(value: T | T[] | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function normalizeUrl(value: string, baseUrl: string): string | null {
  try {
    const normalized = new URL(value, baseUrl);
    return normalized.toString();
  } catch {
    return null;
  }
}

function extractUrlsFromSitemap(xml: string, baseUrl: string): string[] {
  const parsed = parser.parse(xml) as {
    urlset?: { url?: { loc?: string } | { loc?: string }[] };
  };
  const items = toArray(parsed.urlset?.url);
  return items
    .map((item) => normalizeUrl(String(item.loc ?? ""), baseUrl))
    .filter((url): url is string => Boolean(url));
}

function extractSitemapIndex(xml: string, baseUrl: string): string[] {
  const parsed = parser.parse(xml) as {
    sitemapindex?: { sitemap?: { loc?: string } | { loc?: string }[] };
  };
  const items = toArray(parsed.sitemapindex?.sitemap);
  return items
    .map((item) => normalizeUrl(String(item.loc ?? ""), baseUrl))
    .filter((url): url is string => Boolean(url));
}

async function fetchXml(url: string): Promise<string> {
  for (let attempt = 0; attempt <= FETCH_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        headers: { Accept: "application/xml" },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch sitemap: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      if (attempt >= FETCH_MAX_RETRIES) throw error;
      const backoff =
        FETCH_BACKOFF_MS * Math.pow(2, attempt) +
        Math.floor(Math.random() * FETCH_BACKOFF_MS);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Failed to fetch sitemap after retries");
}

export async function discoverSitemapUrls(
  baseUrl: string,
  limit: number
): Promise<SitemapResult> {
  const sitemapUrl = new URL("/sitemap.xml", baseUrl).toString();
  const xml = await fetchXml(sitemapUrl);

  const directUrls = extractUrlsFromSitemap(xml, baseUrl);
  if (directUrls.length) {
    return {
      urls: directUrls.slice(0, limit),
      totalFound: directUrls.length,
    };
  }

  const indexUrls = extractSitemapIndex(xml, baseUrl);
  const collected: string[] = [];
  let totalFound = 0;

  for (const indexUrl of indexUrls) {
    if (collected.length >= limit) break;
    const indexXml = await fetchXml(indexUrl);
    const urls = extractUrlsFromSitemap(indexXml, baseUrl);
    totalFound += urls.length;
    for (const url of urls) {
      if (collected.length >= limit) break;
      collected.push(url);
    }
  }

  return { urls: collected, totalFound };
}
