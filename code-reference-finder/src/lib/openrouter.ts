import { OPENROUTER_API_URL, OPENROUTER_MODEL, OPENROUTER_TEMPERATURE } from './constants';
import type { CodeAnalysis, SearchQuery } from './types';

function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    // Fallback: extract JSON object from markdown code blocks or surrounding text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error('Could not parse JSON from OpenRouter response');
  }
}

async function callOpenRouter(systemPrompt: string, userPrompt: string): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey || apiKey.includes('placeholder')) {
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

export async function analyzeCode(code: string): Promise<CodeAnalysis> {
  const systemPrompt = `You are a code analysis assistant.
Analyze the following code snippet and return a structured analysis.

Identify:
1. The programming language
2. All external libraries, packages, and frameworks imported or used
3. All APIs, hooks, classes, and notable symbols invoked
4. Real-world usage patterns present (e.g. data fetching, state management, authentication, middleware chaining)

Do NOT return any URLs. Do NOT search the web. Only analyze the code provided.

Return ONLY a JSON object with this exact shape (no markdown, no explanation):
{
  "language": "...",
  "libraries": ["library1", "library2"],
  "apis": ["api1", "api2"],
  "patterns": ["pattern1", "pattern2"]
}`;

  const content = await callOpenRouter(systemPrompt, code);
  const parsed = extractJSON(content) as CodeAnalysis;

  return {
    language: parsed.language || 'unknown',
    libraries: Array.isArray(parsed.libraries) ? parsed.libraries : [],
    apis: Array.isArray(parsed.apis) ? parsed.apis : [],
    patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
  };
}

export async function generateSearchQueries(analysis: CodeAnalysis): Promise<SearchQuery[]> {
  const systemPrompt = `You are a search query strategist for developer tools.
Given the structured analysis of a code snippet, generate search queries that will surface high-quality real-world usage examples from GitHub and Stack Overflow.

Requirements:
- Generate exactly 10 search queries: 5 with target "github" and 5 with target "stackoverflow"
- Keep queries SHORT (2-4 words max). Shorter queries return more results.
- For GitHub: use library/framework names only, e.g. "tanstack react-query", "express middleware typescript"
- For Stack Overflow: use concise problem keywords, e.g. "useQuery refetch interval", "prisma findMany include"
- Do NOT write full sentences or long phrases as queries
- For each query, indicate the intended target: "github" or "stackoverflow"
- Provide ranking heuristics: what signals indicate a high-quality result

Do NOT return any URLs. Do NOT invent links. Only return queries and heuristics.

Return ONLY a JSON object with this exact shape (no markdown, no explanation):
{
  "queries": [
    {
      "query": "search terms here",
      "target": "github",
      "heuristic": "what makes a good result for this query"
    }
  ]
}`;

  const userPrompt = `Language: ${analysis.language}
Libraries: ${analysis.libraries.join(', ')}
APIs: ${analysis.apis.join(', ')}
Patterns: ${analysis.patterns.join(', ')}`;

  const content = await callOpenRouter(systemPrompt, userPrompt);
  const parsed = extractJSON(content) as { queries: SearchQuery[] };

  if (!Array.isArray(parsed.queries)) {
    throw new Error('OpenRouter did not return a queries array');
  }

  const all = parsed.queries
    .filter((q) => q.query && q.target && q.heuristic)
    .map((q) => {
      // Normalize target: LLMs may return "GitHub", "StackOverflow", "stack_overflow", etc.
      const t = q.target.toLowerCase().replace(/[\s_-]/g, '');
      const target = t.includes('stack') ? 'stackoverflow' : 'github';
      return { ...q, target } as SearchQuery;
    });

  // Guarantee exactly 5 of each platform
  const ghQueries = all.filter((q) => q.target === 'github').slice(0, 5);
  const soQueries = all.filter((q) => q.target === 'stackoverflow').slice(0, 5);

  return [...ghQueries, ...soQueries];
}
