interface CreditCard {
  name: string;
  issuer?: string;
  annualFee?: string;
  rewards?: string;
  signUpBonus?: string;
  apr?: string;
  highlights?: string[];
  source?: string;
}

// Singapore-specific credit card comparison sites
const SINGAPORE_SITES = [
  { url: "https://www.singsaver.com.sg/credit-cards", name: "SingSaver" },
  { url: "https://www.moneysmart.sg/credit-cards", name: "MoneySmart" },
  { url: "https://seedly.sg/reviews/credit-cards", name: "Seedly" },
  { url: "https://milelion.com/credit-cards/", name: "MileLion" },
  { url: "https://www.suitesmile.com/credit-cards/", name: "SuiteSmile" },
  { url: "https://mainlymiles.com/credit-cards/", name: "MainlyMiles" },
];

export async function POST(request: Request) {
  const encoder = new TextEncoder();

  // Create a TransformStream for SSE
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  let isClosed = false;

  const sendEvent = async (data: object) => {
    if (isClosed) return;
    try {
      await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
    } catch {
      // Stream closed, client disconnected
      isClosed = true;
    }
  };

  const closeWriter = async () => {
    if (isClosed) return;
    try {
      isClosed = true;
      await writer.close();
    } catch {
      // Already closed, ignore
    }
  };

  // Start processing in the background
  (async () => {
    try {
      const { requirements } = await request.json();

      if (!requirements) {
        await sendEvent({ type: "error", error: "Requirements are required" });
        await closeWriter();
        return;
      }

      const apiKey = process.env.MINO_API_KEY;
      if (!apiKey) {
        await sendEvent({ type: "error", error: "API key not configured" });
        await closeWriter();
        return;
      }

      await sendEvent({ type: "step", step: "Initializing Mino AI...", timestamp: Date.now() });
      await sendEvent({ 
        type: "step", 
        step: `Launching concurrent searches across ${SINGAPORE_SITES.length} Singapore credit card sites...`, 
        timestamp: Date.now() 
      });

      // Launch ALL sites in parallel - no timeout, let each complete naturally
      // Like 6 friends each searching one website, then consolidating results
      const results = await Promise.allSettled(
        SINGAPORE_SITES.map((site) => fetchFromSite(site, requirements, apiKey, sendEvent))
      );

      await sendEvent({ 
        type: "step", 
        step: "All site searches completed, aggregating results...", 
        timestamp: Date.now() 
      });

      // Collect all successful results
      const allCards: CreditCard[] = [];
      let successCount = 0;

      results.forEach((result, index) => {
        if (result.status === "fulfilled" && result.value.length > 0) {
          successCount++;
          allCards.push(...result.value);
        } else if (result.status === "rejected") {
          console.error(`Failed to fetch from ${SINGAPORE_SITES[index].name}:`, result.reason);
        }
      });

      await sendEvent({ 
        type: "step", 
        step: `Successfully gathered data from ${successCount}/${SINGAPORE_SITES.length} sites`, 
        timestamp: Date.now() 
      });

      // Deduplicate and rank cards
      const uniqueCards = deduplicateCards(allCards);

      await sendEvent({
        type: "step",
        step: `Analysis complete - found ${uniqueCards.length} matching credit cards`,
        timestamp: Date.now(),
      });

      // Send final results
      await sendEvent({
        type: "complete",
        cards: uniqueCards.slice(0, 10), // Return top 10 cards
      });

    } catch (error) {
      console.error("Error in compare-cards API:", error);
      await sendEvent({
        type: "error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    } finally {
      await closeWriter();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}

async function fetchFromSite(
  site: { url: string; name: string },
  requirements: string,
  apiKey: string,
  sendEvent: (data: object) => Promise<void>
): Promise<CreditCard[]> {
  try {
    await sendEvent({
      type: "site_start",
      site: site.name,
      timestamp: Date.now(),
    });

    const minoResponse = await fetch("https://mino.ai/v1/automation/run-sse", {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: site.url,
        goal: `User wants: "${requirements}"

TASK: Extract top 3-5 credit cards from THIS PAGE ONLY that match the user's needs.

RULES:
1. Stay on this page - do NOT click into individual card pages
2. Extract info visible on the listing/comparison page
3. Be quick - just get the key details shown

Return JSON:
{
  "cards": [
    {
      "name": "Card Name",
      "issuer": "Bank",
      "annualFee": "S$XXX or No fee",
      "rewards": "Brief rewards summary",
      "signUpBonus": "Bonus or null",
      "apr": "XX% or null",
      "highlights": ["key benefit 1", "key benefit 2"]
    }
  ]
}

Return valid JSON only.`,
        browser_profile: "lite",
      }),
    });

    if (!minoResponse.ok) {
      throw new Error(`Mino API returned ${minoResponse.status}`);
    }

    const reader = minoResponse.body?.getReader();
    if (!reader) {
      throw new Error("No response body");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult: unknown = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          try {
            const event = JSON.parse(line.slice(6));

            // Handle completion first
            if (event.type === "COMPLETE" && event.status === "COMPLETED") {
              finalResult = event.resultJson;
              // Parse and send cards with site_complete so frontend can show partial results
              const siteCards = parseMinoResult(finalResult).map((card) => ({ ...card, source: site.name }));
              await sendEvent({
                type: "site_complete",
                site: site.name,
                cards: siteCards,
                timestamp: Date.now(),
              });
              break;
            }

            // Handle errors
            if (event.type === "ERROR" || event.status === "FAILED") {
              const errorMsg = event.message || event.error || "Site may have bot protection";
              throw new Error(errorMsg);
            }

            // Forward detailed step info for the popup
            // Filter out internal/system events
            const stepMessage = 
              event.purpose || 
              event.action || 
              event.message || 
              event.step || 
              event.description ||
              event.text ||
              event.content;
            
            // Skip internal system events
            const systemEvents = ["STARTED", "STREAMING_URL", "HEARTBEAT", "PING", "CONNECTED", "INIT"];
            const isSystemEvent = systemEvents.some(se => 
              stepMessage?.toUpperCase?.()?.includes(se) || 
              event.type?.toUpperCase?.()?.includes(se)
            );
            
            if (stepMessage && !isSystemEvent) {
              await sendEvent({
                type: "site_step",
                site: site.name,
                detail: stepMessage,
                timestamp: Date.now(),
              });
            }
          } catch (parseError) {
            if (!(parseError instanceof SyntaxError)) {
              throw parseError;
            }
          }
        }
      }

      if (finalResult) break;
    }

    // Parse and tag results with source
    const cards = parseMinoResult(finalResult);
    return cards.map((card) => ({ ...card, source: site.name }));

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error(`Error fetching from ${site.name}:`, errorMessage);
    
    // Notify frontend that this site failed
    await sendEvent({
      type: "site_error",
      site: site.name,
      error: errorMessage,
      timestamp: Date.now(),
    });
    
    return []; // Return empty array on failure, don't break other requests
  }
}

function parseMinoResult(result: unknown): CreditCard[] {
  if (!result) return [];

  try {
    // Try to find an array of cards in various formats
    // The Mino API returns different keys depending on the site
    const possibleArrayKeys = [
      'parsed_data',
      'top_cards', 
      'credit_cards',
      'cards',
      'results',
      'data',
    ];

    // Type guard: check if result is an object
    if (typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;
      
      for (const key of possibleArrayKeys) {
        if (resultObj[key] && Array.isArray(resultObj[key])) {
          return (resultObj[key] as unknown[]).map(parseCard);
        }
      }
    }

    // If result is already an array of cards
    if (Array.isArray(result)) {
      return result.map(parseCard);
    }

    // If result is a single card object (check common card name fields)
    if (typeof result === 'object' && result !== null) {
      const resultObj = result as Record<string, unknown>;
      if (resultObj.name || resultObj.cardName || resultObj.card_name) {
        return [parseCard(result)];
      }

      // Last resort: check if any key contains an array of objects with card-like properties
      for (const key of Object.keys(resultObj)) {
        const value = resultObj[key];
        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object') {
          const firstItem = value[0] as Record<string, unknown>;
          // Check if it looks like a card object
          if (firstItem.card_name || firstItem.name || firstItem.issuer || firstItem.annual_fee) {
            return value.map(parseCard);
          }
        }
      }
    }

    // Try to extract from text if result is a string
    if (typeof result === "string") {
      return parseTextResult(result);
    }

    console.log("Unexpected result format:", result);
    return [];
  } catch (error) {
    console.error("Error parsing Mino result:", error);
    return [];
  }
}

function parseCard(cardData: unknown): CreditCard {
  // Type guard to ensure cardData is an object
  if (!cardData || typeof cardData !== 'object') {
    return { name: 'Unknown Card' };
  }
  const card = cardData as Record<string, unknown>;
  // Ensure highlights is always an array
  // Handle various field names for highlights/benefits
  let highlights =
    card.key_highlights_benefits ||  // e.g., "2 complimentary lounge visits..."
    card.key_highlights ||
    card.highlights ||
    card.benefits ||
    card.features;

  if (typeof highlights === "string") {
    // Split by semicolons or periods for multi-sentence highlights
    highlights = highlights.split(/[;.]/).map((s: string) => s.trim()).filter(Boolean);
  } else if (!Array.isArray(highlights)) {
    highlights = [];
  }

  // Handle annual fee - could be number (SGD) or string
  let annualFee = card.annual_fee_sgd || card.annual_fee || card.annualFee || card.fee;
  if (typeof annualFee === "number") {
    annualFee = annualFee === 0 ? "No annual fee" : `S$${annualFee.toFixed(0)}`;
  } else if (typeof annualFee === "string") {
    // Format string annual fees nicely
    const numMatch = annualFee.match(/^[\d.]+$/);
    if (numMatch) {
      const num = parseFloat(annualFee);
      annualFee = num === 0 ? "No annual fee" : `S$${num.toFixed(2)}`;
    }
  }

  return {
    name: (card.card_name || card.name || card.cardName || "Unknown Card") as string,
    issuer: card.issuer || card.issuer_bank || card.bank,
    annualFee,
    rewards:
      card.rewards_cashback_structure ||  // e.g., "1.2 Citi Miles per S$1..."
      card.rewards_structure ||
      card.rewards ||
      card.rewardsStructure ||
      card.cashBack ||
      card.cash_back,
    signUpBonus: card.sign_up_bonus || card.signUpBonus || card.signup_bonus || card.bonus,
    apr:
      card.interest_rate_apr ||  // e.g., "26.90%"
      card.apr_range ||
      card.apr ||
      card.APR ||
      card.interestRate ||
      card.interest_rate,
    highlights,
  } as CreditCard;
}

function parseTextResult(text: string): CreditCard[] {
  const cards: CreditCard[] = [];
  const sections = text.split(/\n\n+/);

  for (const section of sections) {
    if (section.trim()) {
      const card: CreditCard = {
        name: "Credit Card",
        highlights: section.split("\n").filter((line) => line.trim()),
      };
      cards.push(card);
    }
  }

  return cards.length > 0 ? cards : [];
}

function deduplicateCards(cards: CreditCard[]): CreditCard[] {
  const seen = new Map<string, CreditCard>();

  for (const card of cards) {
    // Normalize card name for deduplication
    const normalizedName = card.name.toLowerCase().replace(/[^a-z0-9]/g, "");

    if (!seen.has(normalizedName)) {
      seen.set(normalizedName, card);
    } else {
      // Merge data if we have more info
      const existing = seen.get(normalizedName)!;
      seen.set(normalizedName, {
        ...existing,
        issuer: existing.issuer || card.issuer,
        annualFee: existing.annualFee || card.annualFee,
        rewards: existing.rewards || card.rewards,
        signUpBonus: existing.signUpBonus || card.signUpBonus,
        apr: existing.apr || card.apr,
        highlights: [...new Set([...(existing.highlights || []), ...(card.highlights || [])])],
        source: existing.source ? `${existing.source}, ${card.source}` : card.source,
      });
    }
  }

  return Array.from(seen.values());
}
