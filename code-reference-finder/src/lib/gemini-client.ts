import { GoogleGenerativeAI } from "@google/generative-ai";
import type { CodeAnalysis, SearchQuery } from "./types";

function getGemini() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not configured");
  const genAI = new GoogleGenerativeAI(apiKey);
  return genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
}

function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Could not parse JSON from Gemini response");
  }
}

async function callGemini(systemPrompt: string, userPrompt: string): Promise<string> {
  const model = getGemini();
  const result = await model.generateContent(`${systemPrompt}\n\n${userPrompt}`);
  return result.response.text() ?? "";
}

export async function analyzeCode(code: string): Promise<CodeAnalysis> {
  const content = await callGemini(
    `You are a code analysis assistant.
Analyze the following code snippet and return a structured analysis.

Identify:
1. The programming language
2. All external libraries, packages, and frameworks imported or used
3. All APIs, hooks, classes, and notable symbols invoked
4. Real-world usage patterns present (e.g. data fetching, state management, authentication, middleware chaining)

Do NOT return any URLs. Only analyze the code provided.

Return ONLY a JSON object (no markdown, no explanation):
{
  "language": "...",
  "libraries": ["library1", "library2"],
  "apis": ["api1", "api2"],
  "patterns": ["pattern1", "pattern2"]
}`,
    code
  );

  const parsed = extractJSON(content) as CodeAnalysis;
  return {
    language: parsed.language || "unknown",
    libraries: Array.isArray(parsed.libraries) ? parsed.libraries : [],
    apis: Array.isArray(parsed.apis) ? parsed.apis : [],
    patterns: Array.isArray(parsed.patterns) ? parsed.patterns : [],
  };
}

export async function generateSearchQueries(analysis: CodeAnalysis): Promise<SearchQuery[]> {
  const content = await callGemini(
    `You are a search query strategist for developer tools.
Given a code analysis, generate search queries that surface high-quality real-world usage examples from GitHub and Stack Overflow.

Requirements:
- Generate exactly 10 queries: 5 with target "github" and 5 with target "stackoverflow"
- Keep queries SHORT (2-4 words max). Shorter = more results.
- GitHub: library/framework names only, e.g. "tanstack react-query", "express middleware typescript"
- Stack Overflow: concise problem keywords, e.g. "useQuery refetch interval", "prisma findMany include"
- Do NOT write full sentences or long phrases
- For each query, indicate target: "github" or "stackoverflow"
- Provide ranking heuristics: what signals indicate a high-quality result

Do NOT return any URLs. Only return queries and heuristics.

Return ONLY a JSON object (no markdown, no explanation):
{
  "queries": [
    {
      "query": "search terms here",
      "target": "github",
      "heuristic": "what makes a good result for this query"
    }
  ]
}`,
    `Language: ${analysis.language}
Libraries: ${analysis.libraries.join(", ")}
APIs: ${analysis.apis.join(", ")}
Patterns: ${analysis.patterns.join(", ")}`
  );

  const parsed = extractJSON(content) as { queries: SearchQuery[] };
  if (!Array.isArray(parsed.queries)) throw new Error("Gemini did not return a queries array");

  const all = parsed.queries
    .filter((q) => q.query && q.target && q.heuristic)
    .map((q) => {
      const t = q.target.toLowerCase().replace(/[\s_-]/g, "");
      const target = t.includes("stack") ? "stackoverflow" : "github";
      return { ...q, target } as SearchQuery;
    });

  const ghQueries = all.filter((q) => q.target === "github").slice(0, 5);
  const soQueries = all.filter((q) => q.target === "stackoverflow").slice(0, 5);
  return [...ghQueries, ...soQueries];
}
