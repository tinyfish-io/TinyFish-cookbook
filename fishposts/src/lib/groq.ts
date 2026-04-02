/* ================================================================
   Groq LLM API — used by text modes to generate comedy from
   TinyFish's research observations
   ================================================================ */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export async function generateWithGroq(
  systemPrompt: string,
  userMessage: string,
): Promise<{ title?: string; lines: string[] }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY not set");

  const res = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
      temperature: 1.0,
      max_tokens: 500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Groq API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content || "";

  // Parse the JSON response
  try {
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
      return { title: parsed.title, lines: parsed.lines };
    }
  } catch {
    /* fallback below */
  }

  // Fallback: try to find JSON in the response
  const jsonMatch = content.match(/\{[\s\S]*?"lines"\s*:\s*\[[\s\S]*?\][\s\S]*?\}/);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed.lines) && parsed.lines.length > 0) {
        return { title: parsed.title, lines: parsed.lines };
      }
    } catch {
      /* give up */
    }
  }

  throw new Error("Groq returned invalid response format");
}
