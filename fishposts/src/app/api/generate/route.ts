import { NextRequest } from "next/server";
import {
  VALID_MODES,
  type ContentMode,
  MODE_INFO,
} from "@/lib/prompts";
import { generateWithGroq, generateMemeText } from "@/lib/groq";
import { generateMeme, getTemplateListForLLM } from "@/lib/imgflip";
import { fetchPageContent } from "@/lib/tinyfish-fetch";
import { rateLimit } from "@/lib/rate-limit";

export const maxDuration = 120; // reduced from 300 — pipeline is much faster now

/* ================================================================
   SSE HELPERS
   ================================================================ */

function sseData(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`;
}

/* ================================================================
   MEME SYSTEM PROMPT — used by Groq to pick template + write text
   ================================================================ */

function buildMemeSystemPrompt(templateList: string, modeContext: string): string {
  return `You are a viral meme creator. Your memes get 50K likes because they make people LAUGH OUT LOUD — not just nod.

## AVAILABLE TEMPLATES (id: name — how it works)
${templateList}

## YOUR TASK
${modeContext}

## THE #1 RULE: MAKE PEOPLE LAUGH
A meme is NOT an observation. A meme is NOT an opinion. A meme is a JOKE.
- BAD: "Investing in FSD" / "Investing in SpaceX" ← this is just stating a preference, not funny
- BAD: "Google kills products" / "Google kills more products" ← just repeating the same thing, not a joke
- GOOD: A meme has IRONY, ABSURDITY, or an UNEXPECTED twist that makes you exhale through your nose.
- The punchline should make someone LAUGH and send it to a friend. If it just makes them think "yeah true" — it's not a meme, it's a LinkedIn post.

## TEMPLATE RULES
- Each template shows [N boxes] — write EXACTLY that many texts.
- Follow the template guide after "—" if present.
- NEVER pick Drake unless it's genuinely the best fit. Drake is overused. Prefer templates like Distracted Boyfriend, Disaster Girl, Left Exit 12, Surprised Pikachu, Hide the Pain Harold, Boardroom Meeting, Expanding Brain, or others that create a VISUAL JOKE.
- For 2-box: setup → punchline (the punchline must be FUNNY, not just a contrasting statement)
- For 3-box: setup → escalation → absurd twist
- For 4-box: each panel escalates the absurdity until the final panel is unhinged
- UNDER 8 WORDS per box. Shorter = funnier.

## WHAT MAKES IT FUNNY
- IRONY: saying one thing, meaning another. The gap between expectation and reality.
- EXAGGERATION: taking a real thing to an absurd extreme.
- SELF-AWARENESS: acknowledging the thing everyone thinks but nobody says.
- SPECIFICITY: "Sam Altman announcing GPT-7 while GPT-4 still can't count" is funnier than "AI companies overpromise."
- RELATABILITY: the audience goes "that's literally me" or "I know someone exactly like this."

## OUTPUT
Return ONLY valid JSON:
{"template_id": "the id number", "template_name": "template name", "texts": ["text for box 1", "text for box 2", ...]}`;
}

/* ================================================================
   TEXT MODE SYSTEM PROMPTS — used by Groq for text content
   ================================================================ */

const TEXT_PROMPTS: Partial<Record<ContentMode, (input: string) => string>> = {
  quote_dunks: () => `You are the king of quote tweets. Your replies get more likes than the original post.

Write 3 quote-tweet responses that DESTROY the take.

RULES:
- MAXIMUM 10 words each. One SHORT sentence.
- Each response must be a PUNCHLINE. Not a comment. A punchline.
- 3 different vibes: deadpan, sarcastic, absurd.
- Reference something specific from the take.

Output ONLY valid JSON: {"lines": ["response1", "response2", "response3"]}`,

  fish_dispatches: (domain: string) => `You are a fish who just browsed ${domain}. Write reactions to the WEBSITE EXPERIENCE — the design, UX, popups, layout, navigation — NOT the content/articles.

RULES:
- Write 5 one-liner reactions.
- MAXIMUM 10 words per line. One SHORT sentence.
- First person fish voice. Sassy one-liners.
- React to the WEBSITE EXPERIENCE: design, UX, popups, layout, navigation, pricing.
- Escalate: mildly confused → fully bewildered.

Output ONLY valid JSON: {"title": "DISPATCH: ${domain}", "lines": ["line1", "line2", "line3", "line4", "line5"]}`,

  unhinged_threads: (topic: string) => `You are the funniest person on Twitter. You write threads that go viral because every line is a PUNCHLINE.

Write a 5-tweet thread about "${topic}" that makes people screenshot and share.

RULES:
- MAXIMUM 12 words per tweet. One sentence MAX.
- Every tweet must be FUNNY. Not informative. FUNNY.
- Start with number (1/, 2/, etc.)
- Arc: 1/ shocking fact → 2/ sarcastic take → 3/ absurd comparison → 4/ conspiracy-level take → 5/ unhinged mic drop
- NO hashtags. NO emojis. NO boring factual statements.

Output ONLY valid JSON: {"title": "${topic.slice(0, 50).toUpperCase()}", "lines": ["1/ ...", "2/ ...", "3/ ...", "4/ ...", "5/ ..."]}`,

  corporate_bs: () => `You are a corporate translator with zero patience. You expose what corporate speak ACTUALLY means.

Translate each phrase into brutal honesty.

RULES:
- MAXIMUM 10 words per translation. Blunt. No mercy.
- Format: "What they said → What they mean"
- 3-5 translations. Each one should make someone screenshot it.

Output ONLY valid JSON: {"title": "BS TRANSLATOR", "lines": ["translation1", "translation2", ...]}`,

  excuse_gen: (situation: string) => `You are a comedy writer. The user needs a funny REASON for why they can't do something.

Write ONE creative, absurd explanation formatted as a fake Windows error message.

RULES:
- MAXIMUM 15 words. One sentence. Punchy and absurd.
- Format it like a system error: "[thing].exe has [funny reason]"
- It should be SO specific and weird that it's instantly shareable.

Output ONLY valid JSON: {"title": "${situation.slice(0, 40).toUpperCase()}", "lines": ["your single explanation here"]}`,
};

/* ================================================================
   MODE CONTEXT — what Groq should know for each meme mode
   ================================================================ */

function getMemeContext(mode: ContentMode, observations: string, input?: string): string {
  switch (mode) {
    case "site_roast":
      return `Make a meme roasting this website based on these observations:\n\n${observations}\n\nBe savage. Reference specific details from the site — actual product names, taglines, pricing, UI quirks.`;
    case "trend_roast":
      return `Make a meme about one of these trending stories:\n\n${observations}\n\nPick the most memeable one. Be savage and specific.`;
    case "chaos_mode":
      return `Make a HILARIOUS meme about: "${input}"

Find the FUNNIEST angle — the irony, the hypocrisy, the absurdity, the thing everyone knows but nobody says out loud.

DO NOT just state facts or opinions about the topic. Find the JOKE. Examples of what a joke looks like:
- The gap between what someone SAYS vs what they DO
- The thing that's obviously true but nobody admits
- Taking a real behavior to its absurd logical extreme
- A specific embarrassing moment or decision everyone remembers

Use the research context below to find specific, real details that make the meme land harder.`;
    case "plot_twist":
      return `Make a meme where this statement is the SETUP, and you add a devastating PLOT TWIST as the punchline:\n\n"${input}"\n\nThe twist must be SPECIFIC, UNEXPECTED, and ORIGINAL. Not a generic reversal like "plot twist: it's hard". The punchline should subvert the setup in a way that's painfully accurate or absurdly specific.`;
    default:
      return `Make a meme based on: ${observations}`;
  }
}

/* ================================================================
   OUTPUT TYPE PER MODE
   ================================================================ */

type OutputType = "meme" | "text";

const MODE_OUTPUT: Record<ContentMode, OutputType> = {
  site_roast: "meme",
  trend_roast: "meme",
  chaos_mode: "meme",
  plot_twist: "meme",
  quote_dunks: "text",
  fish_dispatches: "text",
  unhinged_threads: "text",
  corporate_bs: "text",
  excuse_gen: "text",
};

/** Modes that need a URL fetched */
const URL_MODES: ContentMode[] = ["site_roast", "fish_dispatches"];
/** Modes that browse HN for trends */
const TREND_MODES: ContentMode[] = ["trend_roast"];
/** Modes that need user text as input */
const INPUT_MODES: ContentMode[] = [
  "quote_dunks", "unhinged_threads", "chaos_mode",
  "corporate_bs", "plot_twist", "excuse_gen",
];

/* ================================================================
   POST HANDLER — New pipeline: Fetch → Groq → Imgflip
   ================================================================ */

export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const { ok } = rateLimit(ip);
  if (!ok) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please wait a minute and try again." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": "60",
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

    if (body.mode && VALID_MODES.includes(body.mode)) {
      mode = body.mode;
    } else if (text && typeof text === "string" && text.trim()) {
      mode = "chaos_mode";
    } else if (url && typeof url === "string" && url.trim()) {
      mode = "site_roast";
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

  const outputType = MODE_OUTPUT[mode];
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const send = async (data: object) => {
    try {
      await writer.write(encoder.encode(sseData(data)));
    } catch { /* stream closed */ }
  };

  // Run pipeline in background
  const pipeline = (async () => {
    try {
      /* ---- STEP 1: Gather observations ---- */
      let observations = "";
      let domain = "";

      if (URL_MODES.includes(mode) && url) {
        await send({ type: "progress", message: "Reading the page...", percent: 10 });
        const page = await fetchPageContent(url, (msg) => {
          send({ type: "progress", message: msg, percent: 15 });
        });
        observations = page.text.slice(0, 3000);
        try {
          domain = new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace("www.", "");
        } catch { domain = url; }
        await send({ type: "progress", message: page.method === "fetch_api" ? "Page loaded!" : "Fish finished reading!", percent: 35 });

      } else if (TREND_MODES.includes(mode)) {
        await send({ type: "progress", message: "Checking trending stories...", percent: 10 });
        try {
          const hn = await fetchPageContent("https://news.ycombinator.com");
          observations = hn.text.slice(0, 3000);
        } catch {
          observations = "Trending tech stories from Hacker News";
        }
        await send({ type: "progress", message: "Found some gems...", percent: 35 });

      } else if (INPUT_MODES.includes(mode) && text) {
        const userInput = text.trim();
        observations = userInput;

        // Enrich with TinyFish Fetch — grab real-time web context about the topic
        // This makes memes more current, specific, and grounded in reality
        await send({ type: "progress", message: "Researching the topic...", percent: 10 });
        try {
          // Build a search-like URL to fetch context about the topic
          const searchQuery = encodeURIComponent(userInput.slice(0, 100));
          const enrichUrl = `https://en.wikipedia.org/wiki/${searchQuery.replace(/%20/g, "_")}`;

          const enrichment = await fetchPageContent(enrichUrl);
          if (enrichment.text && enrichment.text.length > 100) {
            observations = `USER INPUT: "${userInput}"\n\nRESEARCH CONTEXT (from the web — use specific details from this):\n${enrichment.text.slice(0, 2000)}`;
            await send({ type: "progress", message: "Found fresh context!", percent: 30 });
          } else {
            // Wikipedia didn't have it — try a Google search page
            const googleUrl = `https://www.google.com/search?q=${searchQuery}`;
            const googleResult = await fetchPageContent(googleUrl);
            if (googleResult.text && googleResult.text.length > 100) {
              observations = `USER INPUT: "${userInput}"\n\nRESEARCH CONTEXT (from the web):\n${googleResult.text.slice(0, 2000)}`;
              await send({ type: "progress", message: "Got some context!", percent: 30 });
            }
          }
        } catch (enrichErr) {
          // Enrichment failed — continue with just the user input, Groq still works
          console.log(`[FishPosts] Enrichment failed for "${userInput}": ${enrichErr instanceof Error ? enrichErr.message : enrichErr}`);
          await send({ type: "progress", message: "Processing your input...", percent: 25 });
        }
      }

      if (!observations) {
        await send({ type: "error", error: "No input to work with. Try again!" });
        return;
      }

      /* ---- STEP 2: Generate content via Groq ---- */
      if (outputType === "meme") {
        await send({ type: "progress", message: "Picking the perfect template...", percent: 50 });

        // Get template list for Groq to choose from
        const templateList = await getTemplateListForLLM();
        const memeContext = getMemeContext(mode, observations, text);
        const systemPrompt = buildMemeSystemPrompt(templateList, memeContext);

        const memeText = await generateMemeText(
          systemPrompt,
          `Observations:\n${observations.slice(0, 2000)}`,
        );

        await send({
          type: "progress",
          message: `Using "${memeText.template_name}" template...`,
          percent: 75,
        });

        /* ---- STEP 3: Generate meme image via Imgflip API ---- */
        const meme = await generateMeme(
          memeText.template_id,
          memeText.texts,
        );

        await send({
          type: "done",
          memeUrl: meme.imageUrl,
          pageUrl: meme.pageUrl,
          percent: 100,
        });

      } else {
        // Text mode — Groq generates text content
        await send({ type: "progress", message: "Writing content with AI...", percent: 55 });

        const promptBuilder = TEXT_PROMPTS[mode];
        if (!promptBuilder) {
          await send({ type: "error", error: `Mode ${mode} not supported` });
          return;
        }

        const systemPrompt = promptBuilder(
          mode === "fish_dispatches" ? domain : observations.slice(0, 200),
        );

        const userMessage = mode === "fish_dispatches"
          ? `Here are observations about the ${domain} website:\n\n${observations}`
          : `Here is the input:\n\n${observations}`;

        const result = await generateWithGroq(systemPrompt, userMessage);

        await send({
          type: "done",
          textContent: result.lines,
          textTitle: result.title,
          mode,
          percent: 100,
        });
      }

    } catch (err) {
      console.error("[FishPosts] Pipeline error:", err);
      await send({
        type: "error",
        error: err instanceof Error ? err.message : "Something went wrong. Try again!",
      });
    } finally {
      try { await writer.close(); } catch { /* already closed */ }
    }
  })();

  void pipeline;

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
