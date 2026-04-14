/**
 * TinyFish browser automation — create memes on Imgflip.com via headless browser.
 * Slower (~30-60s) but creates memes through the actual Imgflip UI.
 * Falls back to Imgflip API on failure.
 */

import { runAutomation } from "./tinyfish";
import { generateMeme } from "./imgflip";

/**
 * Convert a template name to an Imgflip URL slug.
 * "Drake Hotline Bling" -> "Drake-Hotline-Bling"
 */
function toSlug(templateName: string): string {
  return templateName
    .replace(/[^a-zA-Z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Extract the Imgflip image URL from a page URL.
 * Page: https://imgflip.com/i/abc123 -> Image: https://i.imgflip.com/abc123.jpg
 */
function pageUrlToImageUrl(pageUrl: string): string {
  const match = pageUrl.match(/imgflip\.com\/i\/([a-z0-9]+)/);
  if (match) {
    return `https://i.imgflip.com/${match[1]}.jpg`;
  }
  return pageUrl;
}

/**
 * Build the TinyFish goal prompt for creating a meme on Imgflip.
 * Uses neutral language to avoid LLM guard triggers.
 */
function buildGoal(texts: string[]): string {
  const textInstructions = texts
    .map((t, i) => `   - Text box ${i + 1}: "${t}"`)
    .join("\n");

  return `You are on the Imgflip meme generator page. Create a meme by filling in the text boxes.

## STEPS

1. Look at the page. You should see the meme editor with text input fields.
2. Make sure the "Private" checkbox is NOT checked. If it is checked, uncheck it.
3. Fill in the text boxes with these exact texts:
${textInstructions}
4. For each text box:
   a. Click on the text input field.
   b. Clear any existing text.
   c. Type the text exactly as shown above.
   d. Click somewhere else to confirm.
5. After all text boxes are filled, click the "Generate Meme" button.
6. Wait for the result page to load.
7. Look for the generated meme URL on the result page. It will look like "https://imgflip.com/i/..."
8. Return the meme page URL as JSON: {"memePageUrl": "https://imgflip.com/i/..."}

IMPORTANT:
- Do NOT check the Private checkbox.
- Fill ALL text boxes before clicking Generate.
- Return the URL of the generated meme page.`;
}

/**
 * Create a meme on Imgflip.com using TinyFish browser automation.
 * Falls back to Imgflip API if automation fails.
 */
export async function generateMemeViaBrowser(
  templateName: string,
  templateId: string,
  texts: string[],
  onProgress?: (msg: string, percent: number) => void,
): Promise<{ imageUrl: string; pageUrl: string }> {
  const slug = toSlug(templateName);
  const startUrl = `https://imgflip.com/memegenerator/${slug}`;
  const goal = buildGoal(texts);

  onProgress?.("Fish is opening Imgflip...", 55);

  try {
    let memePageUrl = "";

    await runAutomation(startUrl, goal, (event) => {
      // Look for progress-like events
      if (event.message) {
        const msg = String(event.message);
        if (msg.toLowerCase().includes("text") || msg.toLowerCase().includes("fill")) {
          onProgress?.("Filling in the meme text...", 65);
        } else if (msg.toLowerCase().includes("generate") || msg.toLowerCase().includes("click")) {
          onProgress?.("Generating the meme...", 75);
        }
      }

      // Look for completion with result
      if (event.type === "COMPLETE" || event.status === "COMPLETED" || event.status === "completed") {
        const resultStr = JSON.stringify(event.resultJson ?? event);
        // Try to find an imgflip.com/i/ URL in the result
        const urlMatch = resultStr.match(/https?:\/\/imgflip\.com\/i\/[a-z0-9]+/);
        if (urlMatch) {
          memePageUrl = urlMatch[0];
        }
      }
    });

    if (memePageUrl) {
      onProgress?.("Meme created by the fish!", 95);
      return {
        imageUrl: pageUrlToImageUrl(memePageUrl),
        pageUrl: memePageUrl,
      };
    }

    // No URL found in result — fall back to API
    console.warn("[FishPosts] TinyFish automation completed but no meme URL found — falling back to API");
    onProgress?.("Fish got lost, using API instead...", 80);
    return generateMeme(templateId, texts);

  } catch (err) {
    console.error("[FishPosts] TinyFish meme automation failed:", err);
    onProgress?.("Fish got lost, using API instead...", 80);
    return generateMeme(templateId, texts);
  }
}
