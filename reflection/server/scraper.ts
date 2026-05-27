/**
 * TinyFish Web Scraping Service
 * Fetches content from RSS feeds, blogs, and news sites
 */

interface ScrapedContent {
  title: string;
  summary?: string;
  fullContent?: string;
  url: string;
  author?: string;
  publishedAt: Date;
}

/**
 * Scrape content from a URL using TinyFish API
 */
export async function scrapeContent(
  url: string,
  type: "rss" | "blog" | "newsletter" | "news" | "linkedin" | "x" | "podcast"
): Promise<ScrapedContent[]> {
  const apiKey = process.env.TINYFISH_API_KEY;
  
  if (!apiKey) {
    throw new Error("TINYFISH_API_KEY environment variable is not set");
  }

  const goal = getScrapingGoal(type);

  try {
    const response = await fetch("https://agent.tinyfish.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        goal,
      }),
    });

    if (!response.ok) {
      throw new Error(`TinyFish API error: ${response.statusText}`);
    }

    // Parse SSE stream
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let result = "";

    if (!reader) {
      throw new Error("No response body");
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split("\n");

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const data = JSON.parse(line.slice(6));
            
            // Check for completion event
            if (data.type === "complete" && data.result) {
              result = data.result;
            }
          } catch (e) {
            // Skip invalid JSON
            console.warn("Failed to parse SSE data:", e);
          }
        }
      }
    }

    // Parse the result
    return parseScrapedResult(result, url);
  } catch (error) {
    console.error("TinyFish scraping error:", error);
    throw error;
  }
}

/**
 * Get scraping goal based on content type
 */
function getScrapingGoal(type: "rss" | "blog" | "newsletter" | "news" | "linkedin" | "x" | "podcast"): string {
  switch (type) {
    case "rss":
      return `Extract all recent articles from this RSS feed. For each article, return: title, summary (if available), full content, URL, author, and published date. Return as a JSON array.`;
    
    case "blog":
      return `Extract the latest blog posts from this website. For each post, return: title, excerpt/summary, full content, URL, author, and published date. Return as a JSON array.`;
    
    case "newsletter":
      return `Extract newsletter content including: title, summary, full content, URL, author, and date. Return as a JSON array.`;
    
    case "news":
      return `Extract the latest news articles from this site. For each article, return: headline (as title), summary, full content, URL, author, and published date. Return as a JSON array.`;
    
    case "linkedin":
      return `Extract recent LinkedIn posts or articles from this profile/page. For each post, return: title/headline, summary, full content, URL, author, and published date. Return as a JSON array.`;
    
    case "x":
      return `Extract recent posts/tweets from this X (Twitter) profile. For each post, return: title (first line of tweet), full content (complete tweet text), URL, author, and published date. Return as a JSON array.`;
    
    case "podcast":
      return `Extract recent podcast episodes from this feed. For each episode, return: title, summary/description, show notes (as full content), URL, author/host, and published date. Return as a JSON array.`;
    
    default:
      return `Extract recent content items with: title, summary, full content, URL, author, and published date. Return as a JSON array.`;
  }
}

/**
 * Parse scraped result into structured content
 */
function parseScrapedResult(result: string, sourceUrl: string): ScrapedContent[] {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(result);
    
    if (Array.isArray(parsed)) {
      return parsed.map((item) => normalizeContent(item, sourceUrl));
    } else if (typeof parsed === "object") {
      return [normalizeContent(parsed, sourceUrl)];
    }
    
    // If not JSON, try to extract content from text
    return extractContentFromText(result, sourceUrl);
  } catch (error) {
    console.warn("Failed to parse scraped result as JSON:", error);
    return extractContentFromText(result, sourceUrl);
  }
}

/**
 * Normalize scraped content to standard format
 */
function normalizeContent(item: any, sourceUrl: string): ScrapedContent {
  return {
    title: item.title || item.headline || item.name || "Untitled",
    summary: item.summary || item.excerpt || item.description,
    fullContent: item.content || item.fullContent || item.body || item.text,
    url: item.url || item.link || sourceUrl,
    author: item.author || item.creator || item.by,
    publishedAt: parseDate(item.publishedAt || item.date || item.published || item.pubDate),
  };
}

/**
 * Parse various date formats
 */
function parseDate(dateStr: string | Date | undefined): Date {
  if (!dateStr) {
    return new Date();
  }
  
  if (dateStr instanceof Date) {
    return dateStr;
  }
  
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? new Date() : parsed;
}

/**
 * Extract content from plain text when JSON parsing fails
 */
function extractContentFromText(text: string, sourceUrl: string): ScrapedContent[] {
  // Simple fallback: create a single content item from the text
  return [
    {
      title: "Scraped Content",
      summary: text.slice(0, 200) + "...",
      fullContent: text,
      url: sourceUrl,
      publishedAt: new Date(),
    },
  ];
}

/**
 * Scrape RSS feed specifically (optimized for RSS)
 */
export async function scrapeRSSFeed(url: string): Promise<ScrapedContent[]> {
  return scrapeContent(url, "rss");
}

/**
 * Scrape blog posts
 */
export async function scrapeBlog(url: string): Promise<ScrapedContent[]> {
  return scrapeContent(url, "blog");
}

/**
 * Scrape news site
 */
export async function scrapeNews(url: string): Promise<ScrapedContent[]> {
  return scrapeContent(url, "news");
}
