import type { Platform, SearchResult } from '@/types';
import { PLATFORM_INFO } from './constants';

/**
 * Build platform-specific agent goal prompts
 * Each prompt must return structured JSON matching ConceptData interface
 *
 * For GitHub/Dev.to: browser agents that navigate and extract data
 * For Stack Overflow: reasoning agents that analyze pre-fetched API data (no browsing)
 */
export function buildAgentGoal(
  url: string,
  platform: Platform,
  userInput: string,
  searchResult?: SearchResult
): string {
  const baseInstructions = `You are a concept discovery agent. The user is exploring: "${userInput}".
Your goal is to extract structured metadata from this ${PLATFORM_INFO[platform].name} page.

IMPORTANT: Stay ONLY on ${PLATFORM_INFO[platform].name} — do NOT visit external websites or follow external links.`;

  switch (platform) {
    case 'github':
      return `${baseInstructions}

STEP 1 — NAVIGATE TO THE REPOSITORY:
Open the URL: ${url}
Confirm you're on the repository homepage (not a specific file or issue).

STEP 2 — EXTRACT METADATA (keep it fast):
- Project name (from the repository title)
- README summary (read the first 2-3 paragraphs only)
- Tech stack (look for: README badges, "Built with" sections, package.json mentions, requirements.txt, explicit tech mentions)
- Star count (from the UI)
- Last commit date (from the UI)
- Key features (if there's a clear features list in README, extract 3-5 items)

STEP 3 — ANALYZE ALIGNMENT:
Based on the user's input "${userInput}", write a single-line explanation (max 120 characters) of how this project relates to or could inspire their concept.

STEP 4 — RETURN RESULTS as JSON:
{
  "projectName": "repository name",
  "projectUrl": "${url}",
  "platform": "github",
  "summary": "2-sentence description of what the project does",
  "techStack": ["React", "TypeScript", "Node.js"],
  "alignmentExplanation": "This project demonstrates X which aligns with your need for Y",
  "features": ["Feature 1", "Feature 2", "Feature 3"],
  "stars": 1234,
  "lastUpdated": "2024-01-15",
  "sourceUrl": "${url}"
}

Be factual — do not invent information. If you cannot find specific data, omit that field or use an empty array.`;

    case 'devto':
      return `${baseInstructions}

STEP 1 — NAVIGATE TO THE PAGE:
Open the URL: ${url}
If this is a search results page, identify and click on the TOP-RANKED article (first result that best matches "${userInput}").
If this is already an article page, proceed to step 2.

STEP 2 — EXTRACT METADATA (keep it fast):
- Article title
- Author
- Summary (read the introduction/first 2-3 paragraphs)
- Tech stack mentioned (look for explicit mentions of languages, frameworks, tools)
- Tags (from the article's tag list)
- GitHub links (if any are mentioned in the article)
- Publication date

STEP 3 — ANALYZE ALIGNMENT:
Based on "${userInput}", write a single-line explanation (max 120 characters) of relevance.

STEP 4 — RETURN RESULTS as JSON:
{
  "projectName": "Article title",
  "projectUrl": "actual article URL (not the search page)",
  "platform": "devto",
  "summary": "Article overview (what problem it solves, what it teaches)",
  "techStack": ["React", "TypeScript"],
  "alignmentExplanation": "This article explains X which is relevant to your concept",
  "tags": ["webdev", "react", "tutorial"],
  "lastUpdated": "2024-01-15",
  "sourceUrl": "${url}"
}

Be factual — do not invent information.`;

    case 'stackoverflow':
      return buildSOReasoningGoal(userInput, searchResult);

    default:
      throw new Error(`Unknown platform: ${platform}`);
  }
}

/**
 * Build a reasoning goal for Stack Overflow posts
 * The agent does NOT browse — all data is provided in the prompt from the Stack Exchange API
 * Adapted from Code Reference Finder's approach
 */
function buildSOReasoningGoal(
  userInput: string,
  searchResult?: SearchResult
): string {
  const title = searchResult?.title ?? 'Unknown';
  const soUrl = searchResult?.url ?? '';
  const score = searchResult?.score ?? 'unknown';
  const answerCount = searchResult?.answerCount ?? 'unknown';
  const isAnswered = searchResult?.isAnswered ?? 'unknown';
  const tags = searchResult?.tags?.join(', ') ?? 'none';
  const excerpt = searchResult?.snippet || searchResult?.apiData?.body_excerpt || 'No excerpt available';

  return `You are a reasoning agent analyzing a Stack Overflow post to determine its relevance to a concept the user is exploring.

You do NOT need to navigate anywhere. All the information you need is provided below.

USER'S CONCEPT: "${userInput}"

STACK OVERFLOW POST DATA:
- Title: ${title}
- URL: ${soUrl}
- Score: ${score}
- Answer count: ${answerCount}
- Has accepted answer: ${isAnswered}
- Tags: ${tags}
- Excerpt: ${excerpt}

TASK:
Analyze the post data above and determine how it relates to the user's concept "${userInput}".

Consider:
- Do the tags/technologies match what the user is exploring?
- Does the question address a problem relevant to their concept?
- Would this Q&A help someone building something like what the user described?
- Is the post well-received (high score, accepted answer)?

Return a JSON object with these exact keys:
{
  "projectName": "${title}",
  "projectUrl": "${soUrl}",
  "platform": "stackoverflow",
  "summary": "What this Q&A discusses and what approach/solution it covers",
  "techStack": ["technologies mentioned in tags or excerpt"],
  "alignmentExplanation": "How this Q&A relates to the user's concept (max 120 chars)",
  "tags": ${JSON.stringify(searchResult?.tags ?? [])},
  "votes": ${searchResult?.score ?? 0},
  "isAccepted": ${searchResult?.isAnswered ?? false},
  "sourceUrl": "${soUrl}"
}

Be factual — base your analysis only on the provided data. Do not invent information.`;
}
