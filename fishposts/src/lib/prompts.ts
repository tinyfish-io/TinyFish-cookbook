// Mode-specific prompt builders for FishPosts content modes

export type ContentMode =
  | "site_roast"
  | "trend_roast"
  | "quote_dunks"
  | "fish_dispatches"
  | "unhinged_threads"
  | "chaos_mode"
  | "corporate_bs"
  | "plot_twist"
  | "excuse_gen";

export type OutputType = "meme" | "text";

export interface PromptConfig {
  startUrl: string;
  prompt: string;
  outputType: OutputType;
  /** If set, Groq refines TinyFish observations into final text */
  groqSystemPrompt?: string;
}

/** UI metadata for each mode */
export const MODE_INFO: Record<
  ContentMode,
  { label: string; icon: string; exe: string }
> = {
  site_roast: { label: "Site Roast", icon: "\uD83D\uDC80", exe: "site_roast.exe" },
  trend_roast: { label: "Trend Roast", icon: "\uD83D\uDD25", exe: "trend_roast.exe" },
  quote_dunks: { label: "Quote Dunks", icon: "\u26A1", exe: "quote_dunks.exe" },
  fish_dispatches: { label: "Fish Dispatches", icon: "\uD83D\uDC1F", exe: "fish_dispatches.exe" },
  unhinged_threads: { label: "Unhinged Threads", icon: "\uD83E\uDDF5", exe: "unhinged_threads.exe" },
  chaos_mode: { label: "Chaos Mode", icon: "\uD83C\uDFB0", exe: "chaos_mode.exe" },
  corporate_bs: { label: "BS Translator", icon: "\uD83D\uDCBC", exe: "corporate_bs.exe" },
  plot_twist: { label: "Plot Twist", icon: "\uD83D\uDD04", exe: "plot_twist.exe" },
  excuse_gen: { label: "Excuse Gen", icon: "\uD83E\uDD25", exe: "excuse_gen.exe" },
};

/** All valid mode keys (for validation) */
export const VALID_MODES = Object.keys(MODE_INFO) as ContentMode[];

/* ================================================================
   SHARED — Fill-text protocol for meme modes (imgflip interaction)
   ================================================================ */

const FILL_TEXT_PROTOCOL = `## FILL TEXT (HARDENED PROTOCOL)

### STEP A — INITIALIZE
1. Click once directly on the preview image.
2. Wait 800ms.

### STEP B — COUNT BOXES AND PLAN TEXT
1. Re-query the DOM for visible editable text input fields.
2. Count them → BOX_COUNT.
3. NOW write your meme text — EXACTLY BOX_COUNT lines:
   - Each line UNDER 10 words.
   - If BOX_COUNT is 2: classic setup (top) / punchline (bottom).
   - If BOX_COUNT is 3: setup → build → punchline.
   - If BOX_COUNT is 4: tell a mini story across all 4 panels.
   - The humor should come from specific details you gathered earlier.
4. Store as LINE_1, LINE_2, ... LINE_BOX_COUNT.

### STEP C — ENTER TEXT (for each box i from 1 to BOX_COUNT)
1. Re-query DOM for text inputs (fresh references).
2. Select the i-th visible input field.
3. Scroll it into view.
4. Click inside the input.
5. Wait 700ms.
6. Select all existing text.
7. Delete it completely.
8. Type your LINE_i slowly.
9. Press ENTER.
10. Wait 1000ms.
11. Click directly on the preview image.
12. Wait 700ms.
13. Visually confirm the text appears on the preview.

If text is NOT visible:
* Click the input again, retype, press ENTER, click preview, wait,
  verify again.
* Do NOT proceed until text is visibly rendered.

### STEP D — FINAL CHECK
1. Confirm ALL BOX_COUNT text lines are visible on the meme preview.
2. If ANY box is blank, go back and fill it.
3. Do NOT generate until every panel has text.

### STEP E — GENERATE
1. Do NOT check Private.
2. Click "Generate Meme".
3. Wait for result popup.
4. Return the URL starting with https://imgflip.com/i/`;

/* ================================================================
   SHARED — TinyFish "return observations" instruction for text modes
   TinyFish only researches; Groq writes the comedy.
   ================================================================ */

const RETURN_OBSERVATIONS = `## RETURN YOUR OBSERVATIONS

Return ONLY a JSON object with your research findings:
{"observations": "your detailed notes about what you found, specific facts, quotes, details"}

Include ALL relevant details — the more specific, the better.
Do NOT write jokes or comedy. Just return raw observations.`;

/* ================================================================
   MEME MODE 1 — Site Roast (existing URL mode)
   ================================================================ */

function buildSiteRoastPrompt(
  targetUrl: string,
  randomPage: number,
): PromptConfig {
  let normalizedUrl = targetUrl;
  if (
    !normalizedUrl.startsWith("http://") &&
    !normalizedUrl.startsWith("https://")
  ) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  const prompt = `You are a careful autonomous web agent. You must reason independently,
choose the best meme template, and verify all UI state changes visually
before proceeding. Never assume success without confirmation.

---

## TASK 1 — ANALYZE TARGET PAGE

1. Read visible content on this page.
2. Extract:
   * Company name
   * One-sentence summary of its core product/mission
   * Notable marketing claims or buzzwords
   * What users actually experience vs what the site promises
3. Store everything.

---

## TASK 2 — BROWSE AND PICK A MEME TEMPLATE

1. Go to: https://imgflip.com/memetemplates?sort=top-30-days&page=${randomPage}
2. Look at ALL the meme templates visible on this page.
3. Pick the ONE template that best fits a funny observation about the company.
4. Click "Add Caption" on your chosen template.
5. Wait for the meme editor to fully load.

---

${FILL_TEXT_PROTOCOL}`;

  return { startUrl: normalizedUrl, prompt, outputType: "meme" };
}

/* ================================================================
   MEME MODE 2 — Trend Roast (browse trending news, make meme)
   ================================================================ */

function buildTrendRoastPrompt(randomPage: number): PromptConfig {
  const prompt = `You are a careful autonomous web agent. You must reason independently,
choose the best meme template, and verify all UI state changes visually
before proceeding. Never assume success without confirmation.

---

## TASK 1 — FIND A TRENDING STORY

1. Read the front page of Hacker News.
2. Look at the top stories visible on the page.
3. Pick ONE story that has the best comedy potential — something ironic,
   overhyped, or perfectly memeable.
4. Click through to read the actual article/page.
5. Extract the key details, notable claims, and anything funny or ironic.
6. Store everything.

---

## TASK 2 — BROWSE AND PICK A MEME TEMPLATE

1. Go to: https://imgflip.com/memetemplates?sort=top-30-days&page=${randomPage}
2. Look at ALL the meme templates visible on this page.
3. Pick the ONE template that best fits a funny observation about the
   trending story you read.
4. Click "Add Caption" on your chosen template.
5. Wait for the meme editor to fully load.

---

${FILL_TEXT_PROTOCOL}`;

  return {
    startUrl: "https://news.ycombinator.com",
    prompt,
    outputType: "meme",
  };
}

/* ================================================================
   TEXT MODE 3 — Quote Dunks (paste a tweet/take, get responses)
   TinyFish researches → Groq writes the dunks
   ================================================================ */

function buildQuoteDunksPrompt(userText: string): PromptConfig {
  const safeText = sanitizeForGuard(userText);

  const prompt = `You are a careful web agent. Research this hot take and gather context.

---

## TASK 1 — RESEARCH THE TAKE

Someone posted this online:

"""
${safeText}
"""

1. You're starting on a Google search page for context.
2. If the take references a specific person, company, or event, click
   through to 1-2 results and gather context.
3. If the take is self-explanatory, just note what makes it interesting.
4. Store your findings briefly.

---

${RETURN_OBSERVATIONS}`;

  const groqSystemPrompt = `You are the king of quote tweets. Your replies get more likes than the original post.

Given the original take and research context, write 3 quote-tweet responses that DESTROY the take.

RULES:
- MAXIMUM 10 words each. One SHORT sentence.
- Each response must be a PUNCHLINE. Not a comment. A punchline.
- 3 different vibes: deadpan, sarcastic, absurd.
- Reference something specific from the take to make it personal.

GOOD responses (these get 10k likes):
- "My fridge magnet just filed for an IPO."
- "Congrats on disrupting writing things down."
- "That take aged like milk in a sauna."

BAD (too long, too boring, or just agreeing/disagreeing):
- "I think this is an interesting perspective but..." (BORING)
- "This is wrong because..." (NOT FUNNY)

Output ONLY valid JSON: {"lines": ["response1", "response2", "response3"]}`;

  return {
    startUrl: `https://www.google.com/search?q=${encodeURIComponent(userText.slice(0, 80))}`,
    prompt,
    outputType: "text",
    groqSystemPrompt,
  };
}

/* ================================================================
   TEXT MODE 4 — Fish Dispatches (visit URL, narrate in 1st person)
   TinyFish browses site UX → Groq writes fish reactions
   ================================================================ */

function buildFishDispatchesPrompt(targetUrl: string): PromptConfig {
  let normalizedUrl = targetUrl;
  if (
    !normalizedUrl.startsWith("http://") &&
    !normalizedUrl.startsWith("https://")
  ) {
    normalizedUrl = "https://" + normalizedUrl;
  }

  let domain = normalizedUrl;
  try {
    domain = new URL(normalizedUrl).hostname.replace("www.", "");
  } catch {
    /* use raw URL */
  }

  const prompt = `You are a careful web agent. Browse this website and take notes about the EXPERIENCE of using it.

---

## TASK 1 — BROWSE THE WEBSITE (focus on EXPERIENCE, not content)

You are a fish USING this website. Pay attention to the BROWSING EXPERIENCE:
1. How does the site LOOK? Layout, colors, fonts, animations, dark mode?
2. What pops up? Cookie banners, login walls, signup prompts, chatbots?
3. How does navigation FEEL? Confusing menus, too many clicks, broken links?
4. What DESIGN CHOICES stand out? Pricing pages, signup flows, loading speed?
5. Click around — visit 2-3 sections. Note the UX, not the articles/posts.
6. DO NOT summarize what articles or posts say. Note the WEBSITE ITSELF.
7. Store observations about the site experience briefly.

---

${RETURN_OBSERVATIONS}`;

  // Sanitize domain for safe prompt interpolation
  const safeDomain = domain.replace(/[^a-zA-Z0-9.\-]/g, "").slice(0, 60);

  const groqSystemPrompt = `You are a fish who just browsed ${safeDomain}. Write reactions to the WEBSITE EXPERIENCE — the design, UX, popups, layout, navigation — NOT the content/articles.

RULES:
- Write 5 one-liner reactions.
- MAXIMUM 10 words per line. One SHORT sentence.
- First person fish voice. Sassy one-liners.
- React to the WEBSITE EXPERIENCE: design, UX, popups, layout, navigation, pricing.
- Do NOT summarize articles or posts. React to HOW the site feels to use.
- Escalate: mildly confused → fully bewildered.

Output ONLY valid JSON: {"title": "DISPATCH: ${safeDomain}", "lines": ["line1", "line2", "line3", "line4", "line5"]}`;

  return {
    startUrl: normalizedUrl,
    prompt,
    outputType: "text",
    groqSystemPrompt,
  };
}

/* ================================================================
   TEXT MODE 5 — Unhinged Threads (research topic, write escalating thread)
   TinyFish researches → Groq writes the thread
   ================================================================ */

function buildUnhingedThreadsPrompt(topic: string): PromptConfig {
  const safeTopic = sanitizeForGuard(topic);

  const prompt = `You are a careful web agent. Research this topic and gather interesting facts.

---

## TASK 1 — RESEARCH THE TOPIC

1. You're starting on a Google search for: "${safeTopic}"
2. Click through to 2-3 results.
3. Find surprising, ironic, or absurd facts.
4. Store the best findings briefly.

---

${RETURN_OBSERVATIONS}`;

  const groqSystemPrompt = `You are the funniest person on Twitter. You write threads that go viral because every line is a PUNCHLINE.

Given research about "${topic}", write a 5-tweet thread that makes people screenshot and share.

RULES:
- MAXIMUM 12 words per tweet. One sentence MAX.
- Every tweet must be FUNNY. Not informative. FUNNY.
- Start with number (1/, 2/, etc.)
- Arc: 1/ shocking fact → 2/ sarcastic take → 3/ absurd comparison → 4/ conspiracy-level take → 5/ unhinged mic drop
- Use specific facts but make them HILARIOUS.
- NO hashtags. NO emojis. NO boring factual statements.

GOOD thread example (about tomatoes):
1/ Tomatoes had 13 flavor genes. We deleted 12. For aesthetics.
2/ We genetically bullied a fruit into being pretty but tasteless.
3/ Your grocery store tomato has the personality of a LinkedIn post.
4/ They gas them to fake-ripen. Your salad is a crime scene.
5/ In 50 years tomato will mean round red water. We did this.

BAD (boring, just facts, no comedy):
1/ 40% of farms grow tomatoes. (WHO CARES. Not funny.)
2/ Tomato production has increased by 20%. (BORING. Delete.)

Output ONLY valid JSON: {"title": ${JSON.stringify(topic.slice(0, 50).toUpperCase())}, "lines": ["1/ ...", "2/ ...", "3/ ...", "4/ ...", "5/ ..."]}`;

  return {
    startUrl: `https://www.google.com/search?q=${encodeURIComponent(topic)}`,
    prompt,
    outputType: "text",
    groqSystemPrompt,
  };
}

/* ================================================================
   MEME MODE 6 — Chaos Mode (random tone + text = WTF meme)
   ================================================================ */

const CHAOS_TONES = [
  "extremely polite corporate email with subtext",
  "overly wholesome grandma energy",
  "someone who overthinks everything at 3am",
  "gen-z intern who just discovered the topic",
  "nature documentary narrator",
  "medieval knight discovering modern technology",
  "confused parent energy",
  "tech bro who pivots everything to AI",
  "soap opera character who gasps at everything",
  "alien trying to understand humans",
  "motivational speaker who lost the script",
  "a fish who just learned to read",
];

/** Strip words the TinyFish LLM guard blocks from user-supplied text */
function sanitizeForGuard(text: string): string {
  const blocked =
    /\b(brutal|roast|roasting|satirical|annoying|hostile|angry|unhinged|chaos|chaotic|hilarious|conspiracy|wild|disappointed|devastating|passive.aggressive|attack|destroy|hate|kill|violent|abuse|offensive|toxic|harass|threat|mock|ridicule|insult|bully|cruel|vicious|nasty|savage|ruthless|merciless|wrath|fury|rage|obscene|vulgar|profane|slaughter|murder|assault)\b/gi;
  return text.replace(blocked, (match) => {
    // Replace with a tame synonym so the prompt still makes sense
    const lower = match.toLowerCase();
    if (lower === "roast" || lower === "roasting") return "review";
    if (lower === "brutal") return "honest";
    if (lower === "hilarious") return "funny";
    if (lower === "chaos" || lower === "chaotic") return "creative";
    if (lower === "unhinged") return "offbeat";
    if (lower === "wild") return "bold";
    if (lower === "savage") return "witty";
    if (lower === "toxic") return "tricky";
    if (lower === "destroy") return "outdo";
    if (lower === "attack") return "challenge";
    if (lower === "hate") return "dislike";
    if (lower === "kill") return "end";
    if (lower === "conspiracy") return "theory";
    if (lower === "hostile") return "tense";
    if (lower === "angry") return "frustrated";
    return "intense"; // generic fallback
  });
}

function buildChaosModePrompt(
  userText: string,
  randomPage: number,
): PromptConfig {
  const randomTone =
    CHAOS_TONES[Math.floor(Math.random() * CHAOS_TONES.length)];
  const safeText = sanitizeForGuard(userText);

  const prompt = `You are a careful autonomous web agent. You must reason independently,
choose the best meme template, and verify all UI state changes visually
before proceeding. Never assume success without confirmation.

---

## CONTEXT — CREATIVE REMIX MODE

The user typed:

"""
${safeText}
"""

Your tone modifier: "${randomTone}"

Your job: make a meme about the user's text, but filter everything through
the tone of "${randomTone}". The result should be unexpected and funny.

---

## TASK 1 — BROWSE AND PICK A MEME TEMPLATE

1. Look at ALL the meme templates visible on this page.
2. Think about which template best fits a "${randomTone}" take on the user's text.
3. Pick the ONE template with the best comedic potential for this creative combo.
4. Click "Add Caption" on your chosen template.
5. Wait for the meme editor to fully load.
6. Remember: the tone is "${randomTone}" — your text should sound like that.

---

${FILL_TEXT_PROTOCOL}`;

  return {
    startUrl: `https://imgflip.com/memetemplates?sort=top-30-days&page=${randomPage}`,
    prompt,
    outputType: "meme",
  };
}

/* ================================================================
   TEXT MODE 8 — Corporate BS Translator
   TinyFish researches → Groq translates
   ================================================================ */

function buildCorporateBsPrompt(userText: string): PromptConfig {
  const safeText = sanitizeForGuard(userText);

  const prompt = `You are a careful web agent. Research this corporate text for context.

---

## TASK 1 — RESEARCH THE CORPORATE TEXT

Someone pasted this corporate speak:

"""
${safeText}
"""

1. You're starting on a Google search page.
2. If the text references a specific company, product, or event, click
   through to 1-2 results and gather context.
3. If it's generic corporate fluff, just note the key buzzwords.
4. Store your findings briefly.

---

${RETURN_OBSERVATIONS}`;

  const groqSystemPrompt = `You are a corporate translator with zero patience. You expose what corporate speak ACTUALLY means.

Given the corporate text and research context, translate each phrase into brutal honesty.

RULES:
- MAXIMUM 10 words per translation. Blunt. No mercy.
- Format: "What they said → What they mean"
- 3-5 translations. Each one should make someone screenshot it.
- The translations should be FUNNY, not just accurate.

GOOD translations (these go viral):
- "We're restructuring → Half of you are fired Friday."
- "Let's circle back → I'm never thinking about this again."
- "We value your feedback → The decision was made in January."
- "Exciting new direction → The CEO watched a TED talk."

BAD (not funny, just boring):
- "We're restructuring → The company is reorganizing." (DUH)

Output ONLY valid JSON: {"title": "BS TRANSLATOR", "lines": ["translation1", "translation2", ...]}`;

  return {
    startUrl: `https://www.google.com/search?q=${encodeURIComponent(userText.slice(0, 60))}`,
    prompt,
    outputType: "text",
    groqSystemPrompt,
  };
}

/* ================================================================
   MEME MODE 9 — Plot Twist Machine (statement → meme with plot twist)
   ================================================================ */

function buildPlotTwistPrompt(
  userText: string,
  randomPage: number,
): PromptConfig {
  const safeText = sanitizeForGuard(userText);

  const prompt = `You are a careful autonomous web agent. You must reason independently,
choose the best meme template, and verify all UI state changes visually
before proceeding. Never assume success without confirmation.

---

## CONTEXT — PLOT TWIST MACHINE

The user typed this statement:

"""
${safeText}
"""

Your job: make a meme where this statement is the SETUP, and you add
a surprising, unexpected PLOT TWIST as the punchline.

The twist should SUBVERT what the statement implies. Be creative,
unexpected, and funny. Under 10 words for each panel.

---

## TASK 1 — BROWSE AND PICK A MEME TEMPLATE

1. Look at ALL the meme templates visible on this page.
2. Pick the ONE template that best fits a "setup → plot twist" format.
   Good choices: templates with two panels, reaction reveals, or
   unexpected turn formats.
3. Click "Add Caption" on your chosen template.
4. Wait for the meme editor to fully load.

---

${FILL_TEXT_PROTOCOL}`;

  return {
    startUrl: `https://imgflip.com/memetemplates?sort=top-30-days&page=${randomPage}`,
    prompt,
    outputType: "meme",
  };
}

/* ================================================================
   TEXT MODE 10 — Excuse Generator (situation → Win98 error dialog)
   TinyFish researches → Groq writes the excuse
   ================================================================ */

function buildExcuseGenPrompt(userText: string): PromptConfig {
  const safeText = sanitizeForGuard(userText);

  const prompt = `You are a careful web agent. Research this situation for context.

---

## TASK 1 — RESEARCH THE SITUATION

The user described this situation:

"""
${safeText}
"""

1. You're starting on a Google search page.
2. Quickly scan 1-2 results for context about this situation.
3. Note what people typically say or do about it.
4. Store your findings briefly.

---

${RETURN_OBSERVATIONS}`;

  const groqSystemPrompt = `You are a comedy writer for FishPosts. The user needs a funny REASON for why they can't do something.

Write ONE creative, absurd explanation formatted as a fake Windows error message.

RULES:
- MAXIMUM 15 words. One sentence. Punchy and absurd.
- It MUST be a reason for not doing the thing. Something you'd tell your boss or friend.
- Format it like a system error: "[thing].exe has [funny reason why it failed]"
- It should be SO specific and weird that it's instantly shareable.

Examples:
- Situation "don't want to go to gym" → "legs.exe crashed. Your body has entered sleep mode until further notice."
- Situation "late to work" → "alarm_clock.exe was eaten by a pelican. Arrival time recalculating..."
- Situation "skip the meeting" → "calendar.exe found 0 reasons to attend. Process terminated by fish."

Output ONLY valid JSON: {"title": ${JSON.stringify(userText.slice(0, 40).toUpperCase())}, "lines": ["your single explanation here"]}`;

  return {
    startUrl: `https://www.google.com/search?q=${encodeURIComponent(userText.slice(0, 60))}`,
    prompt,
    outputType: "text",
    groqSystemPrompt,
  };
}

/* ================================================================
   DISPATCHER — returns the right prompt config for any mode
   ================================================================ */

export function getPromptConfig(
  mode: ContentMode,
  input: { url?: string; text?: string },
): PromptConfig {
  const randomPage = Math.floor(Math.random() * 10) + 1;

  switch (mode) {
    case "site_roast": {
      if (!input.url) throw new Error("URL is required for Site Roast");
      return buildSiteRoastPrompt(input.url, randomPage);
    }
    case "trend_roast":
      return buildTrendRoastPrompt(randomPage);

    case "quote_dunks": {
      if (!input.text) throw new Error("Text is required for Quote Dunks");
      return buildQuoteDunksPrompt(input.text);
    }
    case "fish_dispatches": {
      if (!input.url) throw new Error("URL is required for Fish Dispatches");
      return buildFishDispatchesPrompt(input.url);
    }
    case "unhinged_threads": {
      if (!input.text)
        throw new Error("Topic is required for Unhinged Threads");
      return buildUnhingedThreadsPrompt(input.text);
    }
    case "chaos_mode": {
      if (!input.text) throw new Error("Text is required for Chaos Mode");
      return buildChaosModePrompt(input.text, randomPage);
    }
    case "corporate_bs": {
      if (!input.text)
        throw new Error("Text is required for BS Translator");
      return buildCorporateBsPrompt(input.text);
    }
    case "plot_twist": {
      if (!input.text)
        throw new Error("Text is required for Plot Twist");
      return buildPlotTwistPrompt(input.text, randomPage);
    }
    case "excuse_gen": {
      if (!input.text)
        throw new Error("Text is required for Excuse Generator");
      return buildExcuseGenPrompt(input.text);
    }
    default:
      throw new Error(`Unknown mode: ${mode}`);
  }
}
