import type { Competitor, ResearchGoal } from "./types";
import { ensureLocalEnvLoaded } from "./env";

function getApiKey(): string {
  ensureLocalEnvLoaded();
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.error("[openai] OPENAI_API_KEY missing", {
      hasKey: "OPENAI_API_KEY" in process.env,
      nodeEnv: process.env.NODE_ENV || "unknown",
      nextRuntime: process.env.NEXT_RUNTIME || "unknown",
    });
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }
  return key;
}

async function chatCompletion(
  messages: { role: string; content: string }[],
  options?: { response_format?: { type: string } }
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages,
      temperature: 0.3,
      ...(options || {}),
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${text}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function planResearchGoals(
  competitors: Competitor[],
  question: string
): Promise<ResearchGoal[]> {
  const competitorList = competitors
    .map((c, i) => `${i + 1}. ${c.name} (${c.url})`)
    .join("\n");

  const systemPrompt = `You are a competitive research planning assistant. Your job is to take a user's research question about their competitors and create specific, actionable browsing goals for an AI web agent to accomplish on each competitor's website.

The web agent will visit a URL and execute the goal you provide. It can navigate pages, click buttons, read content, and extract information.

IMPORTANT:
- "Competitors" means the companies listed below (the user's competitors), not the competitors of those companies.
- Only use the provided competitor list. Do not invent new companies.
- Goals must be specific and detailed so the agent knows exactly what to look for.
- If the question is about pricing, direct it to the pricing page and extract plan details.
- Ask the browsing agent to capture source URLs (including child pages it visits) where it finds evidence.

You may modify the competitor URL to point to a more specific page (e.g., /login, /pricing, /features) if that would help the agent find the information faster.`;

  const userPrompt = `Competitors:
${competitorList}

User's research question: "${question}"

For each competitor, create a specific browsing goal for the web agent. Return a JSON object with a "goals" array where each item has:
- "competitor_name": the competitor name from the list above
- "competitor_url": the URL the agent should visit (use the provided URL or a specific subpage)
- "goal": detailed instructions for the browsing agent

Return ONLY the JSON object.`;

  const response = await chatCompletion(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    { response_format: { type: "json_object" } }
  );

  try {
    const parsed = JSON.parse(response);
    const goals = Array.isArray(parsed)
      ? parsed
      : parsed.goals || parsed.tasks || Object.values(parsed)[0];
    return goals as ResearchGoal[];
  } catch {
    throw new Error(`Failed to parse OpenAI response as JSON: ${response}`);
  }
}

export async function summarizeCompetitorResult(
  competitorName: string,
  question: string,
  rawResult: unknown
): Promise<string> {
  const systemPrompt = `You are a competitive research analyst. Summarize the raw data extracted from a competitor's website into a clear, concise finding related to the research question. Be specific and factual. Use bullet points for lists. Keep it under 200 words.

Do not include URLs or a Sources section in the summary.`;

  const userPrompt = `Research question: "${question}"
Competitor: ${competitorName}

Raw data from browsing their website:
${JSON.stringify(rawResult, null, 2)}

Provide a clear, concise summary of what was found regarding the research question.`;

  return chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}

export async function generateComparisonReport(
  question: string,
  competitorResults: {
    name: string;
    summary: string;
    rawResult: unknown;
  }[]
): Promise<string> {
  const systemPrompt = `You are a competitive research analyst creating a comparison report. Format your report in clean markdown with:

1. **Executive Summary** - 2-3 sentence overview of findings
2. **Per-Competitor Findings** - Key findings for each competitor
3. **Comparison Table** - A markdown table comparing the key attributes across competitors (use standard pipe table syntax). If a table is not appropriate, omit this section.
4. **Key Insights** - Notable patterns, gaps, or opportunities

Be concise, factual, and actionable. Use markdown formatting for readability.`;

  const findings = competitorResults
    .map(
      (r) => `### ${r.name}
Summary: ${r.summary}
Raw data: ${JSON.stringify(r.rawResult, null, 2)}`
    )
    .join("\n\n");

  const userPrompt = `Research question: "${question}"

Competitor findings:
${findings}

Generate a comprehensive comparison report.`;

  return chatCompletion([
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt },
  ]);
}
