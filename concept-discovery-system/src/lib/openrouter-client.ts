import { OPENROUTER_API_URL, OPENROUTER_MODEL, OPENROUTER_TEMPERATURE } from './constants';
import type { SearchQuery, ConceptData } from '@/types';

function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse JSON from OpenRouter response');
  }
}

async function callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured');
  }

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: OPENROUTER_TEMPERATURE,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenRouter API error ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? '';
}

interface LLMQuery {
  query: string;
  platform: string;
  language?: string;
  tags?: string[];
}

/**
 * Generate targeted search queries using OpenRouter LLM
 * Falls back to null if the API key is not set (caller should use deterministic fallback)
 */
export async function generateSmartQueries(userInput: string): Promise<SearchQuery[]> {
  const systemPrompt = `You are a search query strategist. The user describes a project idea. Generate search queries to find SIMILAR existing projects and discussions.

STEP 1 — Extract the BIG-PICTURE PRODUCT KEYWORD. This is the major product category — what type of thing is being built. Strip away all modifiers, implementation details, and secondary features. Keep only 1-3 words that describe the core product type.

Examples:
- "API testing tool with visual workflow builder" → "API testing tool"
- "Personal finance tracking app with AI insights" → "finance app"
- "Real-time collaborative code editor" → "code editor"
- "Chrome extension for productivity tracking" → "chrome extension"
- "AI-powered resume builder with ATS optimization" → "resume builder"
- "Decentralized social media platform" → "social media platform"
- "CLI tool for database migrations" → "database migration"
- "Visual git history explorer" → "git visualization"

STEP 2 — Generate exactly 3 queries:

1. GitHub: the product keyword (2-4 words). Optionally include "language" if a programming language is implied.
2. Dev.to: the product keyword, optionally with tech context (2-4 words).
3. Stack Overflow: the product keyword (1-3 words) PLUS a "tags" array of 2-3 real Stack Overflow tags.
   - Tags MUST be real SO tags (lowercase, hyphenated).
   - Think: what tags would a Stack Overflow question about this product have?
   - Examples: "api-testing", "rest", "postman", "react", "markdown", "websocket", "chrome-extension", "git"

Return ONLY JSON (no markdown):
{
  "queries": [
    { "query": "API testing tool", "platform": "github", "language": "TypeScript" },
    { "query": "API testing tool", "platform": "devto" },
    { "query": "API testing", "platform": "stackoverflow", "tags": ["api-testing", "rest", "automated-tests"] }
  ]
}`;

  const content = await callOpenRouter(systemPrompt, userInput);
  const parsed = extractJSON(content) as { queries: LLMQuery[] };

  if (!Array.isArray(parsed.queries)) {
    throw new Error('OpenRouter did not return a queries array');
  }

  return parsed.queries
    .filter((q) => q.query && q.platform)
    .map((q) => {
      const t = q.platform.toLowerCase().replace(/[\s_-]/g, '');
      let platform: SearchQuery['platform'];
      if (t.includes('stack')) platform = 'stackoverflow';
      else if (t.includes('dev')) platform = 'devto';
      else platform = 'github';

      const result: SearchQuery = { platform, query: q.query };

      if (platform === 'github' && q.language) {
        result.filters = { language: q.language };
      }

      if (platform === 'stackoverflow' && q.tags && q.tags.length > 0) {
        result.filters = { ...result.filters, tagged: q.tags.join(';') };
      }

      return result;
    });
}

export interface AnalysisResult {
  scores: {
    competition: number;
    validation: number;
    maintenance: number;
  };
  overall: number;
  analysis: string;
}

/**
 * Generate a brief analysis of the user's idea based on discovered projects.
 * Called once all agents have completed.
 */
export async function generateAnalysis(
  userInput: string,
  projects: ConceptData[]
): Promise<AnalysisResult> {
  const systemPrompt = `You are a startup/product analyst. The user described a project idea and we discovered similar existing projects across GitHub, Dev.to, and Stack Overflow.

You must return ONLY valid JSON (no markdown, no code fences) with this exact structure:
{
  "scores": {
    "competition": <0-100>,
    "validation": <0-100>,
    "maintenance": <0-100>
  },
  "overall": <1.0-10.0>,
  "analysis": "<markdown text>"
}

SCORING GUIDE:
- **competition** (0-100): How much competition exists. HIGH score = LOTS of competition (bad). Consider: number of similar projects found, their star counts, how established they are.
  - 0-30: Low competition (few or no similar projects)
  - 31-60: Moderate competition (some players, room to enter)
  - 61-100: High competition (crowded market, dominant players)

- **validation** (0-100): How validated/proven is this market. HIGH score = strong market demand (good). Consider: SO question activity, article engagement, GitHub stars on similar projects.
  - 0-30: Weak validation (little community interest)
  - 31-60: Moderate validation (some interest and discussion)
  - 61-100: Strong validation (active community, proven demand)

- **maintenance** (0-100): How maintainable/feasible is this to build and sustain. HIGH score = easy to maintain (good). Consider: tech complexity, ecosystem maturity, scope.
  - 0-30: Hard to maintain (complex, broad scope)
  - 31-60: Moderate effort
  - 61-100: Easy to maintain (focused scope, mature ecosystem)

- **overall** (1.0-10.0): Overall idea attractiveness. A single decimal number. Weigh all factors — high validation + low competition = great, high competition + low validation = avoid.

For the "analysis" field, write a SHORT analysis (150-200 words max) covering:
1. **Market Landscape** — How crowded is this space? Are there dominant players?
2. **Differentiation Opportunity** — What gaps exist that the user's idea could fill?
3. **Verdict** — Is this a good idea to build? Give a clear, honest take.

Use markdown in the analysis field (**bold**, bullet lists, etc). Keep it concise and useful.`;

  const projectSummaries = projects.map((p) => {
    let info = `- [${p.platform.toUpperCase()}] "${p.projectName}"`;
    if (p.summary) info += `: ${p.summary}`;
    if (p.stars) info += ` (${p.stars.toLocaleString()} stars)`;
    if (p.votes !== undefined) info += ` (${p.votes} votes)`;
    if (p.techStack?.length) info += ` | Tech: ${p.techStack.slice(0, 4).join(', ')}`;
    return info;
  }).join('\n');

  const userPrompt = `User's idea: "${userInput}"

Discovered ${projects.length} similar projects:
${projectSummaries}`;

  const content = await callOpenRouter(systemPrompt, userPrompt);
  const parsed = extractJSON(content) as AnalysisResult;

  // Clamp scores to valid ranges
  parsed.scores.competition = Math.max(0, Math.min(100, Math.round(parsed.scores.competition)));
  parsed.scores.validation = Math.max(0, Math.min(100, Math.round(parsed.scores.validation)));
  parsed.scores.maintenance = Math.max(0, Math.min(100, Math.round(parsed.scores.maintenance)));
  parsed.overall = Math.max(1, Math.min(10, Math.round(parsed.overall * 10) / 10));

  return parsed;
}
