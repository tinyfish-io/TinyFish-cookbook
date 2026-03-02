import type { CodeAnalysis, SearchResult } from './types';

export function buildGitHubGoal(
  url: string,
  analysis: CodeAnalysis
): { url: string; goal: string } {
  const libs = analysis.libraries.join(', ');
  const apis = analysis.apis.join(', ');

  const goal = `You are analyzing a GitHub repository to determine how it relates to specific libraries and APIs.

TARGET LIBRARIES: ${libs}
TARGET APIs/SYMBOLS: ${apis}
LANGUAGE: ${analysis.language}

INSTRUCTIONS:
1. Go to the repository page and read ONLY the README. Do NOT click into source files, folders, or other pages.
2. From the README and repo description, extract: what the project does, any code examples shown, and how it relates to the target libraries/APIs.
3. Score relevance 0-100 based on: Does the README mention/demonstrate the target libraries? Are there code examples in the README?

Return a JSON object with these exact keys:
{
  "title": "repository full name (owner/repo)",
  "sourceUrl": "the repository URL",
  "platform": "github",
  "relevanceScore": 0-100,
  "alignmentExplanation": "2-3 sentences explaining how this repo relates to the target libraries/APIs",
  "repoName": "owner/repo",
  "repoDescription": "repo description text",
  "stars": number or null,
  "repoLanguage": "primary language",
  "readmeExcerpt": "first 300 chars of README",
  "codeSnippets": [
    {
      "code": "relevant code excerpt from the README (max 500 chars)",
      "language": "language of the snippet",
      "context": "README"
    }
  ]
}

IMPORTANT: Only read the README. Do not navigate into any source files or subdirectories. If the README has no relevant content, set relevanceScore to 0.`;

  return { url, goal };
}

export function buildSOReasoningGoal(
  searchResult: SearchResult,
  analysis: CodeAnalysis
): { url: string; goal: string } {
  const libs = analysis.libraries.join(', ');
  const apis = analysis.apis.join(', ');
  const apiData = searchResult.apiData;

  const goal = `You are a reasoning agent analyzing a Stack Overflow post to determine its relevance to specific libraries and APIs.

You do NOT need to navigate anywhere. All the information you need is provided below.

STACK OVERFLOW POST DATA:
- Title: ${searchResult.title}
- URL: ${searchResult.url}
- Score: ${searchResult.score ?? 'unknown'}
- Answer count: ${searchResult.answerCount ?? 'unknown'}
- Answered: ${searchResult.isAnswered ?? 'unknown'}
- Tags: ${searchResult.tags?.join(', ') ?? 'none'}
- Excerpt: ${searchResult.snippet || apiData?.body_excerpt || 'No excerpt available'}

TARGET LIBRARIES: ${libs}
TARGET APIs/SYMBOLS: ${apis}
LANGUAGE: ${analysis.language}

TASK:
Analyze the post data above and determine how relevant it is to a developer trying to understand the target libraries and APIs.

Score the relevance from 0-100 based on:
- Do the tags match the target libraries?
- Does the title/excerpt discuss the target APIs?
- Would this post help someone understand how to use these libraries?
- Is the post well-received (high score, accepted answer)?

Return a JSON object with these exact keys:
{
  "title": "${searchResult.title}",
  "sourceUrl": "${searchResult.url}",
  "platform": "stackoverflow",
  "relevanceScore": 0-100,
  "alignmentExplanation": "2-3 sentences explaining how this SO post relates to the target libraries/APIs",
  "questionTitle": "${searchResult.title}",
  "votes": ${searchResult.score ?? 0},
  "tags": ${JSON.stringify(searchResult.tags ?? [])},
  "isAccepted": ${searchResult.isAnswered ?? false},
  "codeSnippets": [
    {
      "code": "any code found in the excerpt",
      "language": "${analysis.language}",
      "context": "Stack Overflow question/answer excerpt"
    }
  ]
}

If the excerpt contains no code, return an empty codeSnippets array.`;

  return { url: 'https://example.com', goal };
}
