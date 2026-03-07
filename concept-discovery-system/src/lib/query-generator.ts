import type { SearchQuery } from '@/types';

/**
 * Common stopwords to remove from queries
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'will', 'with', 'using', 'helps', 'help', 'user', 'users',
]);

/**
 * Extract keywords from input text
 */
function extractKeywords(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * Get the primary topic (first 2-3 keywords)
 */
function getPrimaryTopic(keywords: string[]): string {
  return keywords.slice(0, 3).join(' ');
}

/**
 * Deterministic search query generation
 * Fast, free, and predictable alternative to LLM
 */
export function generateSearchQueries(userInput: string): SearchQuery[] {
  const keywords = extractKeywords(userInput);
  const primaryTopic = getPrimaryTopic(keywords);

  // Core concept (2-3 words)
  const coreWords = keywords.slice(0, 2).join(' ');

  // Detect common tech keywords for filters
  const hasTech = keywords.some((k) =>
    ['react', 'vue', 'angular', 'typescript', 'javascript', 'python', 'node', 'nextjs'].includes(k)
  );
  const techKeyword = hasTech
    ? keywords.find((k) =>
        ['react', 'vue', 'angular', 'typescript', 'javascript', 'python', 'node', 'nextjs'].includes(k)
      )
    : undefined;

  const queries: SearchQuery[] = [
    // GitHub - Use primary topic + optional tech filter (returns 4 browser agents)
    {
      platform: 'github',
      query: primaryTopic,
      filters: techKeyword
        ? { language: techKeyword.charAt(0).toUpperCase() + techKeyword.slice(1) }
        : {},
    },

    // Dev.to - Use single tag (returns 3 browser agents)
    {
      platform: 'devto',
      query: keywords[0] || primaryTopic,
    },

    // Stack Overflow - Use concise problem keywords (returns 3 reasoning agents)
    {
      platform: 'stackoverflow',
      query: coreWords,
    },
  ];

  return queries;
}
