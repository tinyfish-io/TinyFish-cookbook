/**
 * Imgflip API client — generate memes via REST API.
 * No browser automation needed.
 */

export interface MemeTemplate {
  id: string;
  name: string;
  box_count: number;
  url: string;
}

interface ImgflipResponse {
  success: boolean;
  data?: { url: string; page_url: string };
  error_message?: string;
}

interface GetMemesResponse {
  success: boolean;
  data?: { memes: Array<{ id: string; name: string; url: string; width: number; height: number; box_count: number }> };
}

let cachedTemplates: MemeTemplate[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get popular 2-box meme templates (cached for 1 hour).
 */
export async function getTemplates(): Promise<MemeTemplate[]> {
  if (cachedTemplates && Date.now() - cacheTime < CACHE_TTL) {
    return cachedTemplates;
  }

  const res = await fetch("https://api.imgflip.com/get_memes");
  const data: GetMemesResponse = await res.json();

  if (!data.success || !data.data) {
    throw new Error("Failed to fetch Imgflip templates");
  }

  // All templates — Groq writes the correct number of texts per box_count
  cachedTemplates = data.data.memes
    .map((m) => ({ id: m.id, name: m.name, box_count: m.box_count, url: m.url }));

  cacheTime = Date.now();
  return cachedTemplates;
}

/**
 * Generate a meme image via Imgflip API.
 * Supports any number of text boxes (2, 3, 4, 5+).
 * Returns { imageUrl, pageUrl } on success.
 */
/**
 * Validate that a template ID exists in the Imgflip database.
 * Returns the valid ID, or a fallback (Drake) if invalid.
 */
async function validateTemplateId(templateId: string): Promise<{ id: string; box_count: number }> {
  const templates = await getTemplates();
  const match = templates.find((t) => t.id === templateId);
  if (match) return { id: match.id, box_count: match.box_count };

  // Groq hallucinated an ID — fall back to Drake (always valid, 2 boxes)
  console.warn(`[FishPosts] Invalid template_id "${templateId}" — falling back to Drake`);
  const drake = templates.find((t) => t.name.toLowerCase().includes("drake"));
  if (drake) return { id: drake.id, box_count: drake.box_count };

  // Last resort: first available template
  return { id: templates[0].id, box_count: templates[0].box_count };
}

export async function generateMeme(
  templateId: string,
  texts: string[],
): Promise<{ imageUrl: string; pageUrl: string }> {
  const username = process.env.IMGFLIP_USERNAME;
  const password = process.env.IMGFLIP_PASSWORD;

  if (!username || !password) {
    throw new Error("IMGFLIP_USERNAME and IMGFLIP_PASSWORD are required");
  }

  // Validate template ID — Groq sometimes hallucinates non-existent IDs
  const validated = await validateTemplateId(templateId);

  // Trim or pad texts to match the template's box count
  const finalTexts = texts.slice(0, validated.box_count);
  while (finalTexts.length < validated.box_count) {
    finalTexts.push(""); // pad with empty if Groq sent too few
  }

  const params = new URLSearchParams({
    template_id: validated.id,
    username,
    password,
  });

  // Use boxes[] parameter for proper multi-box support
  finalTexts.forEach((text, i) => {
    params.append(`boxes[${i}][text]`, text);
  });

  const res = await fetch("https://api.imgflip.com/caption_image", {
    method: "POST",
    body: params,
  });

  const data: ImgflipResponse = await res.json();

  if (!data.success || !data.data) {
    throw new Error(data.error_message || "Imgflip API failed");
  }

  return {
    imageUrl: data.data.url,
    pageUrl: data.data.page_url,
  };
}

/**
 * Template usage guides — tells Groq HOW each popular template works.
 * Without this, Groq writes generic text that doesn't match the template's format.
 */
const TEMPLATE_GUIDES: Record<string, string> = {
  "Drake Hotline Bling": "Top = thing you REJECT/dislike. Bottom = thing you PREFER/endorse. Drake disapproves top, approves bottom.",
  "Two Buttons": "Top-left button = option A. Top-right button = option B. The person is sweating because both are bad or the choice is impossible.",
  "Distracted Boyfriend": "Top = the new shiny thing (girlfriend being looked at). Bottom = the loyal/boring thing being ignored (current girlfriend).",
  "Change My Mind": "Top = a bold/controversial statement. Bottom = 'Change my mind'. The person sits confidently daring anyone to disagree.",
  "Left Exit 12 Off Ramp": "Straight = the reasonable/expected choice. Exit = the chaotic/stupid choice the driver swerves toward.",
  "Surprised Pikachu": "Top = someone does an obviously predictable thing. Bottom = acts shocked when the obvious consequence happens.",
  "Expanding Brain": "Box 1 = basic/normie take. Box 2 = slightly smarter take. Box 3 = galaxy brain take. Box 4 = transcendent/absurd take. Escalation from normal to unhinged genius.",
  "Buff Doge vs. Cheems": "Left (buff doge) = the strong/chad version. Right (cheems) = the weak/pathetic version. Comparison format.",
  "Batman Slapping Robin": "Top (Robin) = says something stupid/wrong. Bottom (Batman slaps) = the correction/shutdown.",
  "One Does Not Simply": "Top = 'One does not simply...' Bottom = the thing that's actually very hard to do.",
  "Waiting Skeleton": "Top = waiting for something. Bottom = still waiting (implying it will never happen).",
  "Disaster Girl": "Top = something bad happening in background. Bottom = the sinister cause or commentary. Girl smiles mischievously.",
  "Hide the Pain Harold": "Top = pretending everything is fine. Bottom = the painful reality underneath the smile.",
  "Ancient Aliens": "Top = any unexplained phenomenon. Bottom = 'Aliens' (or similar absurd explanation).",
  "Roll Safe Think About It": "Top = a flawed premise presented as clever. Bottom = the 'smart' but actually dumb conclusion. Taps forehead.",
  "UNO Draw 25": "Left card = the reasonable thing to do. Right = 'or draw 25'. Person chooses to draw 25 rather than do the thing.",
  "Mocking Spongebob": "Top = the original statement. Bottom = the mocking version in aLtErNaTiNg CaSe.",
  "Running Away Balloon": "Person running = someone avoiding something. Balloon floating away = the thing they should be doing.",
  "Clown Applying Makeup": "Box 1 = first naive decision. Box 2 = doubling down. Box 3 = tripling down. Box 4 = full clown. Escalating self-delusion.",
  "Panik Kalm Panik": "Box 1 = panic about something. Box 2 = calming rationalization. Box 3 = realizing it's actually worse. Escalating dread.",
  "Tuxedo Winnie The Pooh": "Top = the basic/crude version. Bottom = the fancy/sophisticated version of the same thing.",
  "Is This A Pigeon?": "Person = someone confused. Butterfly = the thing being misidentified. Caption = the wrong label they give it.",
  "Epic Handshake": "Left arm = group A. Right arm = group B. Handshake = the unexpected thing they agree on.",
  "Gru's Plan": "Box 1 = step 1 of genius plan. Box 2 = step 2 of genius plan. Box 3 = the unexpected bad outcome you didn't foresee. Gru is horrified.",
  "They're The Same Picture": "Top = two things presented as different. Bottom = 'They're the same picture.' Corporate can't tell them apart.",
  "Trade Offer": "Top = 'I receive:' something valuable. Bottom = 'You receive:' something worthless. Unfair deal.",
  "Megamind peeking": "Top = 'No [thing]?' Bottom = confused/disappointed face peeking. The thing you expected is missing.",
  "Bike Fall": "Box 1 = person riding bike happily. Box 2 = person puts stick in own wheel (self-sabotage). Box 3 = person on ground blaming someone else.",
  "Always Has Been": "Left astronaut = discovers something shocking. Right astronaut = 'Always has been.' with gun. The truth was always there.",
  "Flex Tape": "Top = a serious problem/damage. Bottom = the hilariously inadequate fix applied.",

  // === 4-BOX TEMPLATES (not already listed above) ===
  "Boardroom Meeting Suggestion": "Box 1 = boss asks question. Box 2 = bad suggestion. Box 3 = bad suggestion. Box 4 = the GOOD/honest answer that gets person thrown out window.",
  "Inhaling Seagull": "Box 1 = calm setup. Box 2 = building tension. Box 3 = deep breath. Box 4 = SCREAMING the punchline. Escalating intensity.",

  // === 5-BOX TEMPLATES ===
  "American Chopper Argument": "Box 1 = person A makes a claim. Box 2 = person B disagrees angrily. Box 3 = person A yells back. Box 4 = person B throws chair. Box 5 = person A's final devastating point. Escalating argument.",
};

/**
 * Get a formatted template list string for Groq to pick from.
 * Includes usage guides so Groq knows HOW each template works.
 */
export async function getTemplateListForLLM(): Promise<string> {
  const templates = await getTemplates();
  // Include all 2-box templates — guided ones first (better picks), then the rest
  const guided: string[] = [];
  const unguided: string[] = [];

  for (const t of templates) {
    const guide = TEMPLATE_GUIDES[t.name];
    if (guide) {
      guided.push(`${t.id}: ${t.name} [${t.box_count} boxes] — ${guide}`);
    } else {
      unguided.push(`${t.id}: ${t.name} [${t.box_count} boxes]`);
    }
  }

  // Put guided templates first so Groq sees them first and prefers them
  return [...guided, ...unguided].join("\n");
}
