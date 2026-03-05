import { GITHUB_API_URL, STACKEXCHANGE_API_URL, STACKOVERFLOW_RESULTS_PER_QUERY } from './constants';
import type { SearchQuery, SearchResult, StackExchangeItem } from '@/types';

/**
 * Search GitHub repositories
 */
async function searchGitHub(
  query: string,
  filters?: Record<string, string>
): Promise<SearchResult[]> {
  try {
    let q = query;
    if (filters?.language) {
      q += ` language:${filters.language}`;
    }
    if (filters?.stars) {
      q += ` stars:${filters.stars}`;
    }

    const params = new URLSearchParams({
      q,
      sort: 'stars',
      order: 'desc',
      per_page: '4',
    });

    const headers: Record<string, string> = {
      Accept: 'application/vnd.github+json',
    };

    const token = import.meta.env.VITE_GITHUB_TOKEN;
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
      `${GITHUB_API_URL}/search/repositories?${params}`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    return data.items.slice(0, 4).map((item: any) => ({
      platform: 'github' as const,
      url: item.html_url,
      title: item.full_name,
      snippet: item.description || '',
    }));
  } catch (error) {
    console.error('GitHub search error:', error);
    return [];
  }
}

/**
 * Search Dev.to articles
 */
async function searchDevTo(query: string): Promise<SearchResult[]> {
  try {
    const searchQuery = query.toLowerCase().split(' ').slice(0, 2).join(' ');

    console.log('[Dev.to] Searching for:', searchQuery);

    return [
      {
        platform: 'devto' as const,
        url: `https://dev.to/search?q=${encodeURIComponent(searchQuery)}`,
        title: `Dev.to Search: ${searchQuery}`,
        snippet: `Search results for ${searchQuery}`,
      },
      {
        platform: 'devto' as const,
        url: `https://dev.to/t/${encodeURIComponent(query.split(' ')[0])}`,
        title: `Dev.to Tag: ${query.split(' ')[0]}`,
        snippet: `Articles tagged with ${query.split(' ')[0]}`,
      },
      {
        platform: 'devto' as const,
        url: `https://dev.to/search?q=${encodeURIComponent(searchQuery)}&sort=relevant`,
        title: `Dev.to Relevant: ${searchQuery}`,
        snippet: `Relevant articles for ${searchQuery}`,
      },
    ];
  } catch (error) {
    console.error('Dev.to search error:', error);
    return [];
  }
}

/**
 * Search Stack Overflow via Stack Exchange API
 * Returns results with full API data for reasoning agents (no browsing needed)
 */
async function searchStackOverflow(query: string, filters?: Record<string, string>): Promise<SearchResult[]> {
  try {
    const key = import.meta.env.VITE_STACKEXCHANGE_KEY;
    const tags = filters?.tagged ? filters.tagged.split(';') : [];

    // Shorten query to max 2 words — SO API chokes on long queries
    const shortQuery = query.split(/\s+/).slice(0, 2).join(' ');

    // Strategy: tag + query together gives best results (tag narrows topic, query adds specificity)
    const attempts: { tagged?: string; q?: string; sort: string }[] = [];
    // 1. Best: tag + short query combined (topic-filtered AND text-matched)
    for (const tag of tags) {
      attempts.push({ tagged: tag, q: shortQuery, sort: 'relevance' });
    }
    // 2. Fallback: just short query, sorted by relevance
    attempts.push({ q: shortQuery, sort: 'relevance' });

    for (const attempt of attempts) {
      const params = new URLSearchParams({
        order: 'desc',
        sort: attempt.sort === 'relevance' ? 'relevance' : 'votes',
        site: 'stackoverflow',
        pagesize: String(STACKOVERFLOW_RESULTS_PER_QUERY),
        filter: '!nNPvSNdWme',
      });

      if (attempt.q) params.set('q', attempt.q);
      if (attempt.tagged) params.set('tagged', attempt.tagged);
      if (key) params.set('key', key);

      const label = attempt.tagged ? `tag:${attempt.tagged}` : `q:"${attempt.q}"`;
      console.log(`[Stack Overflow] Trying ${label}`);

      const response = await fetch(
        `${STACKEXCHANGE_API_URL}/search/advanced?${params}`,
        { headers: { 'Accept': 'application/json' } }
      );

      if (!response.ok) {
        console.error(`SO search failed: ${response.status}`);
        continue;
      }

      const data = await response.json();

      if (data.error_id) {
        console.error(`SO API error: ${data.error_name} — ${data.error_message}`);
        continue;
      }

      const items: StackExchangeItem[] = data.items ?? [];

      if (items.length > 0) {
        console.log(`[Stack Overflow] Found ${items.length} results via ${label}`);
        return items.map((item) => ({
          platform: 'stackoverflow' as const,
          url: item.link,
          title: item.title,
          snippet: item.body_excerpt ?? '',
          score: item.score,
          answerCount: item.answer_count,
          tags: item.tags,
          isAnswered: item.is_answered,
          apiData: item,
        }));
      }

      console.log(`[Stack Overflow] 0 results via ${label}, trying next...`);
    }

    console.log('[Stack Overflow] No results found after all attempts');
    return [];
  } catch (error) {
    console.error('Stack Overflow search error:', error);
    return [];
  }
}

/**
 * Execute searches across all platforms
 */
export async function executeSearches(
  queries: SearchQuery[]
): Promise<SearchResult[]> {
  const searchPromises = queries.map((query) => {
    switch (query.platform) {
      case 'github':
        return searchGitHub(query.query, query.filters);
      case 'devto':
        return searchDevTo(query.query);
      case 'stackoverflow':
        return searchStackOverflow(query.query, query.filters);
      default:
        return Promise.resolve([]);
    }
  });

  const results = await Promise.all(searchPromises);
  const flatResults = results.flat();

  return flatResults.slice(0, 10);
}
