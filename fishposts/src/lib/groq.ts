/* ================================================================
   Groq LLM API — generates meme text, comedy content, and more.
   No content guard — Groq handles all creative/satirical writing.
   ================================================================ */

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "llama-3.3-70b-versatile";

export interface MemeTextResult {
  template_id: string;
  template_name: string;
  texts: string[];
}

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

/**
 * Generate meme text + pick a template via Groq.
 * Returns template_id and an array of texts (one per box).
 */
export async function generateMemeText(
  systemPrompt: string,
  userMessage: string,
): Promise<MemeTextResult> {
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

  try {
    const parsed = JSON.parse(content);
    // Support new format: { texts: [...] }
    if (parsed.template_id && Array.isArray(parsed.texts) && parsed.texts.length > 0) {
      return {
        template_id: String(parsed.template_id),
        template_name: parsed.template_name || "",
        texts: parsed.texts.map(String),
      };
    }
    // Fallback: old format { top_text, bottom_text }
    if (parsed.template_id && parsed.top_text && parsed.bottom_text) {
      return {
        template_id: String(parsed.template_id),
        template_name: parsed.template_name || "",
        texts: [parsed.top_text, parsed.bottom_text],
      };
    }
  } catch { /* fallback below */ }

  // Try to find JSON with texts array
  const jsonMatch = content.match(/\{[\s\S]*?"template_id"[\s\S]*?"texts"[\s\S]*?\]/);
  if (jsonMatch) {
    try {
      // Find the complete JSON object
      const fullMatch = content.match(/\{[\s\S]*?"template_id"[\s\S]*?\}/);
      if (fullMatch) {
        const parsed = JSON.parse(fullMatch[0]);
        if (Array.isArray(parsed.texts) && parsed.texts.length > 0) {
          return {
            template_id: String(parsed.template_id),
            template_name: parsed.template_name || "",
            texts: parsed.texts.map(String),
          };
        }
      }
    } catch { /* give up */ }
  }

  throw new Error("Groq returned invalid meme format");
}
