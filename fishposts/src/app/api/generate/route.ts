import { NextRequest } from "next/server";
import { runAutomation, type TinyFishEvent } from "@/lib/tinyfish";
import {
  getPromptConfig,
  VALID_MODES,
  type ContentMode,
  type OutputType,
} from "@/lib/prompts";
import { generateWithGroq } from "@/lib/groq";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 300; // 5 min for long automations

/* ================================================================
   RESULT EXTRACTORS
   ================================================================ */

function extractMemeUrls(
  text: string,
): { imageUrl: string; pageUrl: string } | null {
  const match = text.match(/https:\/\/imgflip\.com\/i\/([a-zA-Z0-9]+)/);
  if (!match) return null;
  return {
    imageUrl: `https://i.imgflip.com/${match[1]}.jpg`,
    pageUrl: match[0],
  };
}

function tryParseLinesJson(
  text: string,
): { title?: string; lines: string[] } | null {
  try {
    const parsed = JSON.parse(text);
    if (parsed && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
      return { title: parsed.title, lines: parsed.lines };
    }
  } catch {
    /* not valid JSON */
  }
  return null;
}

function extractTextContent(
  resultText: string,
): { title?: string; lines: string[] } | null {
  // Strategy 0: Try JSON.parse directly — TinyFish often returns {"lines":[...]} as the result
  const direct = tryParseLinesJson(resultText);
  if (direct) return direct;

  // Also try unescaping first (resultText might be double-stringified)
  try {
    const unescaped = JSON.parse(resultText);
    if (typeof unescaped === "string") {
      const fromStr = tryParseLinesJson(unescaped);
      if (fromStr) return fromStr;
    } else if (typeof unescaped === "object" && unescaped !== null) {
      // Walk top-level fields looking for a nested {lines:[...]} object
      for (const val of Object.values(unescaped)) {
        if (typeof val === "string") {
          const fromField = tryParseLinesJson(val);
          if (fromField) return fromField;
        }
        if (typeof val === "object" && val !== null && Array.isArray((val as Record<string, unknown>).lines)) {
          const arr = (val as Record<string, unknown>).lines as unknown[];
          if (arr.length > 0 && arr.every((x) => typeof x === "string")) {
            return { title: (val as Record<string, unknown>).title as string | undefined, lines: arr as string[] };
          }
        }
      }
    }
  } catch {
    /* not valid JSON */
  }

  // Strategy 1: Try our delimiter pattern
  let match = resultText.match(
    /===FISHPOSTS_RESULT===([\s\S]*?)===FISHPOSTS_RESULT===/,
  );
  if (!match) {
    // JSON-escaped version (inside stringified JSON)
    match = resultText.match(
      /===FISHPOSTS_RESULT===(.*?)===FISHPOSTS_RESULT===/,
    );
  }

  if (match) {
    let content = match[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    try {
      const parsed = JSON.parse(content.trim());
      if (parsed.lines && Array.isArray(parsed.lines)) {
        return { title: parsed.title, lines: parsed.lines };
      }
    } catch {
      const lines = content
        .trim()
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length > 0) return { lines };
    }
  }

  // Strategy 2: Look for JSON with "lines" array anywhere in the result
  const jsonMatch = resultText.match(
    /\{[^{}]*"lines"\s*:\s*\[([^\]]*)\][^{}]*\}/,
  );
  if (jsonMatch) {
    try {
      let jsonStr = jsonMatch[0]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
      const parsed = JSON.parse(jsonStr);
      if (parsed.lines && Array.isArray(parsed.lines) && parsed.lines.length > 0) {
        return { title: parsed.title, lines: parsed.lines };
      }
    } catch { /* try next strategy */ }
  }

  // Strategy 3: Extract meaningful text from resultJson
  // TinyFish result often has a 'result' or 'output' field with the agent's final text
  // The resultText is JSON.stringify'd, so we need to parse through it
  const resultFields = [
    /"result"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"output"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"text"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"summary"\s*:\s*"((?:[^"\\]|\\.)*)"/,
    /"content"\s*:\s*"((?:[^"\\]|\\.)*)"/,
  ];

  for (const regex of resultFields) {
    const fieldMatch = resultText.match(regex);
    if (fieldMatch && fieldMatch[1].length > 50) {
      const text = fieldMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\")
        .replace(/\\t/g, "\t");

      // Split into lines — try numbered items first (1. / 1) / 1/)
      const numbered = text.split(/(?=\d+[.)/]\s)/).filter((l) => l.trim().length > 10);
      if (numbered.length >= 2) {
        return { lines: numbered.map((l) => l.trim()) };
      }

      // Try splitting by double newlines or single newlines
      const byParagraph = text.split(/\n\n+/).filter((l) => l.trim().length > 10);
      if (byParagraph.length >= 2) {
        return { lines: byParagraph.map((l) => l.trim()) };
      }

      const byLine = text.split(/\n/).filter((l) => l.trim().length > 10);
      if (byLine.length >= 2) {
        return { lines: byLine.map((l) => l.trim()) };
      }

      // Last resort: return the whole text as one line
      if (text.trim().length > 20) {
        return { lines: [text.trim()] };
      }
    }
  }

  // Strategy 4: Find any long string in the result that looks like content
  const longStrings = [...resultText.matchAll(/"((?:[^"\\]|\\.){80,})"/g)];
  for (const ls of longStrings) {
    const text = ls[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");

    // Skip URLs and technical strings
    if (text.startsWith("http") || text.includes("function ")) continue;

    const lines = text.split(/\n/).filter((l) => l.trim().length > 10);
    if (lines.length >= 2) {
      return { lines: lines.map((l) => l.trim()).slice(0, 10) };
    }
  }

  return null;
}

/* ================================================================
   OBSERVATION EXTRACTOR — pulls TinyFish research from result
   ================================================================ */

function extractObservations(resultText: string): string | null {
  // Try parsing as JSON with "observations" field
  try {
    const parsed = JSON.parse(resultText);
    if (typeof parsed === "object" && parsed !== null) {
      // Direct observations field
      if (typeof parsed.observations === "string") return parsed.observations;
      // Nested in result field
      if (typeof parsed.result === "string") {
        try {
          const inner = JSON.parse(parsed.result);
          if (typeof inner.observations === "string") return inner.observations;
        } catch { /* not JSON */ }
        return parsed.result;
      }
      // Look in resultJson
      if (parsed.resultJson) {
        const rj = typeof parsed.resultJson === "string"
          ? parsed.resultJson
          : JSON.stringify(parsed.resultJson);
        try {
          const inner = JSON.parse(rj);
          if (typeof inner.observations === "string") return inner.observations;
          if (typeof inner.result === "string") {
            try {
              const deep = JSON.parse(inner.result);
              if (typeof deep.observations === "string") return deep.observations;
            } catch { /* not JSON */ }
            return inner.result;
          }
        } catch { /* not JSON */ }
        // Look for observations pattern in stringified resultJson
        const obsMatch = rj.match(/"observations"\s*:\s*"((?:[^"\\]|\\.)*)"/);
        if (obsMatch) {
          return obsMatch[1]
            .replace(/\\n/g, "\n")
            .replace(/\\"/g, '"')
            .replace(/\\\\/g, "\\");
        }
      }
    }
  } catch { /* not JSON */ }

  // Regex fallback — find observations field anywhere in the text
  const obsMatch = resultText.match(/"observations"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (obsMatch) {
    return obsMatch[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
  }

  // Last resort — grab any long string that looks like notes
  const longStrings = [...resultText.matchAll(/"((?:[^"\\]|\\.){60,})"/g)];
  for (const ls of longStrings) {
    const text = ls[1]
      .replace(/\\n/g, "\n")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");
    if (!text.startsWith("http") && !text.includes("function ")) {
      return text;
    }
  }

  return null;
}

/* ================================================================
   SSE HELPERS
   ================================================================ */

function sseData(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

function mapEventToProgress(
  event: TinyFishEvent,
  stepCount: number,
  outputType: OutputType,
): { message: string; percent: number } | null {
  if (event.type !== "PROGRESS") return null;

  const purpose = ((event.purpose as string) || "").toLowerCase();

  if (outputType === "meme") {
    // Meme-specific progress messages
    if (
      purpose.includes("imgflip") ||
      purpose.includes("template") ||
      purpose.includes("gallery") ||
      purpose.includes("meme template")
    ) {
      return {
        message: "Finding the perfect template...",
        percent: Math.min(55, 30 + stepCount * 2),
      };
    }
    if (
      purpose.includes("caption") ||
      purpose.includes("text") ||
      purpose.includes("type") ||
      purpose.includes("fill") ||
      purpose.includes("input")
    ) {
      return {
        message: "Crafting your meme...",
        percent: Math.min(80, 55 + stepCount * 2),
      };
    }
    if (
      purpose.includes("generate meme") ||
      (purpose.includes("click") && purpose.includes("generate"))
    ) {
      return {
        message: "Almost there...",
        percent: Math.min(92, 80 + stepCount),
      };
    }
    // Meme fallback — also handle browsing the target page
    if (
      purpose.includes("read") ||
      purpose.includes("brows") ||
      purpose.includes("visit") ||
      purpose.includes("hacker news") ||
      purpose.includes("article")
    ) {
      return {
        message: "Reading the page...",
        percent: Math.min(30, 8 + stepCount * 3),
      };
    }
  } else {
    // Text mode progress messages
    if (purpose.includes("search") || purpose.includes("google")) {
      return {
        message: "Researching...",
        percent: Math.min(40, 15 + stepCount * 3),
      };
    }
    if (
      purpose.includes("read") ||
      purpose.includes("article") ||
      purpose.includes("page") ||
      purpose.includes("brows") ||
      purpose.includes("visit")
    ) {
      return {
        message: "Reading and analyzing...",
        percent: Math.min(60, 30 + stepCount * 3),
      };
    }
    if (
      purpose.includes("writ") ||
      purpose.includes("generat") ||
      purpose.includes("craft")
    ) {
      return {
        message: "Writing content...",
        percent: Math.min(85, 55 + stepCount * 2),
      };
    }
  }

  // Step-count based fallback
  return {
    message:
      stepCount < 5
        ? "Starting up..."
        : stepCount < 12
          ? outputType === "meme"
            ? "Finding the perfect template..."
            : "Researching..."
          : stepCount < 20
            ? outputType === "meme"
              ? "Crafting your meme..."
              : "Writing content..."
            : "Almost there...",
    percent: Math.min(92, 8 + stepCount * 3),
  };
}

/* ================================================================
   POST HANDLER
   ================================================================ */

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { ok, remaining } = rateLimit(ip);
  if (!ok) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a minute and try again." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  let url: string | undefined;
  let text: string | undefined;
  let mode: ContentMode;

  try {
    const body = await request.json();
    url = body.url;
    text = body.text;

    // Determine mode — support legacy requests without mode field
    if (body.mode && VALID_MODES.includes(body.mode)) {
      mode = body.mode;
    } else if (text && typeof text === "string" && text.trim()) {
      mode = "chaos_mode"; // Legacy text mode maps to chaos
    } else if (url && typeof url === "string" && url.trim()) {
      mode = "site_roast"; // Legacy URL mode maps to site roast
    } else {
      return new Response(
        JSON.stringify({ error: "Mode and input are required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Get prompt config for the selected mode
  let config;
  try {
    config = getPromptConfig(mode, {
      url: url?.trim(),
      text: text?.trim(),
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Invalid input for mode",
      }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const send = async (data: object) => {
    try {
      await writer.write(encoder.encode(sseData(data)));
    } catch {
      /* stream closed by client — ignore */
    }
  };

  // Run automation in background, forwarding events to client
  const automationPromise = (async () => {
    let stepCount = 0;
    let sentFinal = false;

    try {
      await send({
        type: "progress",
        message: "Starting the agent...",
        percent: 3,
      });

      await runAutomation(config.startUrl, config.prompt, async (event) => {
        if (sentFinal) return;
        stepCount++;

        const progress = mapEventToProgress(
          event,
          stepCount,
          config.outputType,
        );
        if (progress) {
          await send({ type: "progress", ...progress });
        }

        // Check for completion — TinyFish sends { type: "COMPLETE", resultJson: {...} }
        if (event.type === "COMPLETE" || event.status === "COMPLETED") {
          const resultText = JSON.stringify(event.resultJson ?? event);

          // Detect LLM guard rejection — give a specific, helpful error
          if (resultText.includes("Blocked by LLM guard") || resultText.includes("Run rejected")) {
            sentFinal = true;
            console.error("[FishPosts] LLM guard blocked the prompt. Result:", resultText.slice(0, 300));
            await send({
              type: "error",
              error: "Our meme bot's safety filter blocked this topic. This usually happens with country names, political figures, or controversial subjects. Try rephrasing without those — e.g. 'pop culture' instead of 'american pop culture'.",
            });
            return;
          }

          if (config.outputType === "meme") {
            // Meme mode — extract imgflip URL
            const meme = extractMemeUrls(resultText);
            if (meme) {
              sentFinal = true;
              await send({
                type: "done",
                memeUrl: meme.imageUrl,
                pageUrl: meme.pageUrl,
                percent: 100,
              });
              return;
            }
          } else if (config.groqSystemPrompt) {
            // Text mode with Groq — extract observations, then call Groq
            const observations = extractObservations(resultText);
            if (observations) {
              sentFinal = true;
              await send({
                type: "progress",
                message: "Writing content with AI...",
                percent: 90,
              });
              try {
                const groqResult = await generateWithGroq(
                  config.groqSystemPrompt,
                  `Here are the research observations:\n\n${observations}`,
                );
                await send({
                  type: "done",
                  textContent: groqResult.lines,
                  textTitle: groqResult.title,
                  mode,
                  percent: 100,
                });
              } catch (groqErr) {
                console.error("[FishPosts] Groq error:", groqErr);
                await send({
                  type: "error",
                  error: "AI writing step failed. Try again!",
                });
              }
              return;
            }
            // Fallback: if no observations found, try direct text extraction
            const textContent = extractTextContent(resultText);
            if (textContent && textContent.lines.length > 0) {
              sentFinal = true;
              await send({
                type: "done",
                textContent: textContent.lines,
                textTitle: textContent.title,
                mode,
                percent: 100,
              });
              return;
            }
          } else {
            // Text mode without Groq — extract structured text content directly
            const textContent = extractTextContent(resultText);
            if (textContent && textContent.lines.length > 0) {
              sentFinal = true;
              await send({
                type: "done",
                textContent: textContent.lines,
                textTitle: textContent.title,
                mode,
                percent: 100,
              });
              return;
            }
          }

          // Completed but couldn't extract result
          sentFinal = true;
          // Log for debugging
          console.error(
            `[FishPosts] ${config.outputType} extraction failed. Result preview:`,
            resultText.slice(0, 500),
          );
          await send({
            type: "error",
            error:
              config.outputType === "meme"
                ? "Agent finished but couldn't generate a meme. Try again!"
                : "Agent finished but couldn't generate content. Try again!",
          });
          return;
        }

        // Check for errors
        if (event.type === "ERROR" || event.status === "FAILED") {
          sentFinal = true;
          const errMsg = String(event.message ?? "");
          // Detect LLM guard block in error events too
          if (errMsg.includes("Blocked by LLM guard") || errMsg.includes("Run rejected") || errMsg.includes("LLM guard")) {
            await send({
              type: "error",
              error: "Our meme bot's safety filter blocked this topic. This usually happens with country names, political figures, or controversial subjects. Try rephrasing without those — e.g. 'pop culture' instead of 'american pop culture'.",
            });
          } else {
            await send({
              type: "error",
              error: errMsg || "Agent ran into an issue. Try again!",
            });
          }
        }
      });

      // Stream ended without any completion event
      if (!sentFinal) {
        await send({
          type: "error",
          error: "Agent stream ended unexpectedly. Try again!",
        });
      }
    } catch (err) {
      await send({
        type: "error",
        error: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      try {
        await writer.close();
      } catch {
        /* stream already closed — ignore */
      }
    }
  })();

  void automationPromise;

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
