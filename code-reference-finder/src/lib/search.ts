import {
  GITHUB_API_URL,
  STACKEXCHANGE_API_URL,
  GITHUB_RESULTS_PER_QUERY,
  STACKOVERFLOW_RESULTS_PER_QUERY,
  MAX_AGENTS,
} from './constants';
import type { SearchQuery, SearchResult, StackExchangeItem } from './types';

interface GitHubRepoItem {
  html_url: string;
  full_name: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = 3
): Promise<Response> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const response = await fetch(url, options);

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : (attempt + 1) * 5000; // 5s, 10s, 15s
      console.warn(`GitHub 429 rate-limited. Retrying in ${waitMs}ms (attempt ${attempt + 1}/${retries})`);
      await delay(waitMs);
      continue;
    }

    return response;
  }

  return fetch(url, options);
}

async function searchGitHub(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    q: query,
    sort: 'stars',
    per_page: String(GITHUB_RESULTS_PER_QUERY),
  });

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
  };

  const token = process.env.GITHUB_TOKEN;
  if (token && !token.includes('placeholder')) {
    // Use Bearer prefix — works for both classic (ghp_) and fine-grained (github_pat_) tokens
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetchWithRetry(
    `${GITHUB_API_URL}/search/repositories?${params}`,
    { headers }
  );

  if (!response.ok) {
    console.error(`GitHub search failed: ${response.status}`);
    return [];
  }

  const data = await response.json();
  const items: GitHubRepoItem[] = data.items ?? [];

  return items.map((item) => ({
    platform: 'github' as const,
    url: item.html_url,
    title: item.full_name,
    snippet: item.description ?? '',
    stars: item.stargazers_count,
    language: item.language ?? undefined,
  }));
}

async function searchStackOverflow(query: string): Promise<SearchResult[]> {
  const params = new URLSearchParams({
    order: 'desc',
    sort: 'votes',
    q: query,
    site: 'stackoverflow',
    pagesize: String(STACKOVERFLOW_RESULTS_PER_QUERY),
    filter: '!nNPvSNdWme',
  });

  const key = process.env.STACKEXCHANGE_KEY;
  if (key && !key.includes('placeholder')) {
    params.set('key', key);
  }

  try {
    const response = await fetch(`${STACKEXCHANGE_API_URL}/search/advanced?${params}`, {
      headers: { 'User-Agent': 'CodeReferenceFinder/1.0' },
    });

    if (!response.ok) {
      console.error(`SO search failed: ${response.status} for "${query}"`);
      return [];
    }

    // Node.js fetch decompresses gzip automatically — just use .json()
    const data = await response.json();

    if (data.error_id) {
      console.error(`SO API error: ${data.error_name} — ${data.error_message}`);
      return [];
    }

    const items: StackExchangeItem[] = data.items ?? [];

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
  } catch (err) {
    console.error(`SO search error for "${query}":`, err);
    return [];
  }
}

function deduplicate(results: SearchResult[]): SearchResult[] {
  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });
}

export async function executeSearches(queries: SearchQuery[]): Promise<SearchResult[]> {
  const githubQueries = queries.filter((q) => q.target === 'github');
  const soQueries = queries.filter((q) => q.target === 'stackoverflow');
  const halfTarget = Math.ceil(MAX_AGENTS / 2); // 5

  // Run SO queries in parallel (no strict rate limits)
  const soResults = (await Promise.all(
    soQueries.map((q) => searchStackOverflow(q.query))
  )).flat();

  // Run GitHub queries sequentially with a 2s gap to avoid 429 rate limiting
  const githubResults: SearchResult[] = [];
  for (let i = 0; i < githubQueries.length; i++) {
    const results = await searchGitHub(githubQueries[i].query);
    githubResults.push(...results);
    if (i < githubQueries.length - 1) {
      await delay(2000);
    }
  }

  const dedupedGH = deduplicate(githubResults);
  const dedupedSO = deduplicate(soResults);

  // Strict 5+5 split: take up to 5 from each platform
  const pickedGH = dedupedGH.slice(0, halfTarget);
  const pickedSO = dedupedSO.slice(0, halfTarget);

  return [...pickedGH, ...pickedSO];
}
