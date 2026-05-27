import { NextRequest } from "next/server";

const MINO_API_URL = "https://mino.ai/v1/automation/run-sse";
const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent";

export const maxDuration = 300; // 5 minutes max for this complex flow

interface SearchParams {
  town: string;
  flatType: string;
  discountThreshold: number;
}

// Helper to call Gemini API
async function callGemini(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Helper to scrape a URL with Mino
async function scrapeWithMino(
  url: string,
  goal: string,
  agentId: number,
  sendEvent: (data: object) => void
): Promise<unknown> {
  const apiKey = process.env.MINO_API_KEY;
  if (!apiKey) throw new Error("MINO_API_KEY not configured");

  sendEvent({ type: "AGENT_STATUS", agentId, status: "navigating" });

  try {
    const response = await fetch(MINO_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        goal,
        browser_profile: "stealth", // Property sites often have bot protection
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Mino API error: ${response.status} ${error}`);
    }

    if (!response.body) throw new Error("No response body");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let result = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        try {
          const event = JSON.parse(line.slice(6));

          // Handle STREAMING_URL event type (from Mino docs)
          if (event.type === "STREAMING_URL") {
            const streamUrl = event.streamingUrl || event.url || event.liveUrl;
            if (streamUrl) {
              sendEvent({ 
                type: "AGENT_STATUS", 
                agentId, 
                status: "navigating",
                streamingUrl: streamUrl 
              });
            }
          }
          
          // Also check for streamingUrl in any event (backward compatibility)
          if (event.streamingUrl && event.type !== "STREAMING_URL") {
            sendEvent({ 
              type: "AGENT_STATUS", 
              agentId, 
              status: "navigating",
              streamingUrl: event.streamingUrl 
            });
          }

          // Handle PROGRESS events (from Mino docs)
          if (event.type === "PROGRESS" && event.purpose) {
            sendEvent({ type: "AGENT_STEP", agentId, step: event.purpose });
            
            // Update status based on action
            if (event.purpose.toLowerCase().includes("extract") || event.purpose.toLowerCase().includes("collect")) {
              sendEvent({ type: "AGENT_STATUS", agentId, status: "extracting" });
            }
          }

          // Forward other step info
          const stepMessage = event.purpose || event.action || event.message || event.step;
          if (stepMessage && event.type !== "COMPLETE" && event.type !== "PROGRESS" && event.type !== "STREAMING_URL" && event.type !== "STARTED" && event.type !== "HEARTBEAT") {
            sendEvent({ type: "AGENT_STEP", agentId, step: stepMessage });
            
            // Update status based on action
            if (stepMessage.toLowerCase().includes("extract") || stepMessage.toLowerCase().includes("collect")) {
              sendEvent({ type: "AGENT_STATUS", agentId, status: "extracting" });
            }
          }

          // Handle completion
          if (event.type === "COMPLETE" && event.status === "COMPLETED") {
            result = event.resultJson;
            sendEvent({ type: "AGENT_COMPLETE", agentId, result });
            return result;
          }

          // Handle errors
          if (event.type === "ERROR" || event.status === "FAILED") {
            throw new Error(event.message || "Scraping failed");
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    sendEvent({ type: "AGENT_ERROR", agentId, error: message });
    return null;
  }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const { town, flatType, discountThreshold }: SearchParams = await request.json();

        if (!town || !flatType) {
          sendEvent({ type: "ERROR", message: "Town and flat type are required" });
          controller.close();
          return;
        }

        // Phase 1: Generate URLs with Gemini
        sendEvent({ type: "PHASE", phase: "generating_urls", message: "Asking Gemini to find property listing URLs..." });

        // Map flat type to bedroom count for better URL generation
        const bedroomMap: Record<string, { min: number; max: number }> = {
          "2-room": { min: 1, max: 1 },
          "3-room": { min: 2, max: 2 },
          "4-room": { min: 3, max: 3 },
          "5-room": { min: 4, max: 4 },
          "executive": { min: 4, max: 5 },
        };
        const bedrooms = bedroomMap[flatType] || { min: 3, max: 3 };

        const urlPrompt = `You are a Singapore property search expert. I need to find ${flatType} HDB resale flats in ${town}, Singapore.

Generate exactly 10 search URLs from these Singapore property listing websites. Use the EXACT URL patterns below:

**PropertyGuru (generate 4 URLs with different filters):**
- Base: https://www.propertyguru.com.sg/property-for-sale
- Parameters: ?market=residential&property_type=H&listing_type=sale&freetext=TOWN&minbed=${bedrooms.min}&maxbed=${bedrooms.max}&sort=date&order=desc
- Variations: different sort orders, add "hdb" to freetext, use property_type_code[]=HDB

**99.co (generate 3 URLs with different filters):**
- Pattern: https://www.99.co/singapore/sale/hdb?query=TOWN&property_segments=hdb&listing_type=resale&room_type=${flatType}
- Variations: different room_type filters, add sort_field=updated_at

**SRX (generate 3 URLs with different filters):**
- Pattern: https://www.srx.com.sg/search/sale/hdb?search=TOWN&propertyType=HDB
- Variations: add bedrooms, sort by date

Replace TOWN with "${town}" (URL encoded if needed).

IMPORTANT: Return ONLY a valid JSON array of 10 complete, working URLs. No markdown, no explanation:
["https://...", "https://...", ...]`;

        let urls: string[] = [];

        // Helper to generate fallback URLs from top 10 Singapore property sites
        // Note: URLs are general (no room filter) - agents extract ALL listings with flatType field
        // Client-side filtering happens in the UI based on user's flat type selection
        const generateFallbackUrls = (searchTown: string): string[] => {
          const townEncoded = encodeURIComponent(searchTown);
          const townSlug = searchTown.toLowerCase().replace(/ /g, '-');
          
          return [
            // 1. PropertyGuru - Market leader with highest volume
            `https://www.propertyguru.com.sg/property-for-sale?market=residential&property_type=H&listing_type=sale&freetext=${townEncoded}&sort=date&order=desc`,
            
            // 2. 99.co - Clean interface, map-based search
            `https://www.99.co/singapore/sale/hdb?query=${townEncoded}&property_segments=hdb&listing_type=resale`,
            
            // 3. SRX - Known for X-Value pricing tools
            `https://www.srx.com.sg/search/sale/hdb?search=${townEncoded}&propertyType=HDB`,
            
            // 4. HDB Flat Portal - Official government source
            `https://homes.hdb.gov.sg/home/finding-a-flat/resale`,
            
            // 5. Ohmyhome - DIY/lower fee platform
            `https://ohmyhome.com/en-sg/buy?propertyType=hdb&location=${townEncoded}`,
            
            // 6. Carousell Property - Direct from owners
            `https://www.carousell.sg/property-for-sale/hdb/?search=${townEncoded}`,
            
            // 7. Mogul.sg - Smart location/geospatial search
            `https://mogul.sg/hdb-for-sale?location=${townEncoded}`,
            
            // 8. EdgeProp - Data and investment analysis
            `https://www.edgeprop.sg/property-for-sale?property_type=hdb&district=${townSlug}`,
            
            // 9. PropNex - Largest agency in Singapore
            `https://www.propnex.com/hdb-for-sale?location=${townEncoded}`,
            
            // 10. ERA Singapore - Second largest agency
            `https://www.era.com.sg/property-search/?type=hdb&location=${townEncoded}&listing_type=sale`,
          ];
        };
        
        try {
          sendEvent({ type: "GEMINI_THINKING", message: "Gemini is researching property sites..." });
          
          const urlResponse = await callGemini(urlPrompt);
          
          // Extract JSON array from response (handle markdown code blocks too)
          let jsonStr = urlResponse;
          
          // Remove markdown code blocks if present
          const codeBlockMatch = urlResponse.match(/```(?:json)?\s*([\s\S]*?)```/);
          if (codeBlockMatch) {
            jsonStr = codeBlockMatch[1];
          }
          
          // Find JSON array
          const jsonMatch = jsonStr.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed) && parsed.length > 0) {
              // Validate URLs - only keep valid ones
              urls = parsed.filter((url: string) => {
                try {
                  new URL(url);
                  return true;
                } catch {
                  return false;
                }
              });
            }
          }
          
          if (urls.length === 0) {
            throw new Error("Gemini did not return valid property URLs");
          }
          
          sendEvent({ 
            type: "GEMINI_SUCCESS", 
            message: `Gemini found ${urls.length} property listing URLs`,
            source: "gemini"
          });
          
        } catch (e) {
          // Fallback to hardcoded URLs from top 10 Singapore property sites
          const errorMessage = e instanceof Error ? e.message : "Unknown error";
          sendEvent({ 
            type: "GEMINI_FALLBACK", 
            message: `Gemini unavailable (${errorMessage.slice(0, 50)}...), using top 10 Singapore property sites`,
          });

          urls = generateFallbackUrls(town);

          sendEvent({ 
            type: "FALLBACK_URLS", 
            message: `Using ${urls.length} URLs from popular Singapore property sites`,
            source: "fallback"
          });
        }

        // Limit to 10 URLs
        urls = urls.slice(0, 10);
        sendEvent({ type: "URLS_GENERATED", urls });

        // Phase 2: Scrape URLs with Mino in parallel
        sendEvent({ type: "PHASE", phase: "scraping", message: `Deploying ${urls.length} browser agents...` });

        const scrapeGoal = `Navigate to this HDB listing page, extract all visible properties including: exact address, block number, street name, town, flat type (2-room, 3-room, 4-room, 5-room, executive), floor level, square footage, asking price in SGD, listing timestamp or date posted, agent name, agent phone, listing URL. Return as structured JSON array of listings. If the page shows multiple listings, extract all of them (up to 10). Return JSON format:
{
  "listings": [
    {
      "address": "Block 123 Street Name",
      "block": "123",
      "street": "Street Name", 
      "town": "Town Name",
      "flatType": "4-room",
      "floorLevel": "10-12",
      "sqft": "1000",
      "askingPrice": 500000,
      "timePosted": "2 days ago",
      "agentName": "Agent Name",
      "agentPhone": "9123 4567",
      "listingUrl": "https://..."
    }
  ]
}`;

        // Run all scraping tasks in parallel
        const scrapePromises = urls.map((url, i) => 
          scrapeWithMino(url, scrapeGoal, i, sendEvent)
        );

        const scrapeResults = await Promise.all(scrapePromises);

        // Collect all listings from all agents
        const allListings: Array<Record<string, unknown>> = [];
        for (const result of scrapeResults) {
          if (result) {
            if (Array.isArray(result)) {
              allListings.push(...result);
            } else if (typeof result === "object" && result !== null) {
              const resultObj = result as Record<string, unknown>;
              if (resultObj.listings && Array.isArray(resultObj.listings)) {
                allListings.push(...resultObj.listings);
              } else {
                // Try to find array in result
                for (const key of Object.keys(resultObj)) {
                  if (Array.isArray(resultObj[key])) {
                    allListings.push(...(resultObj[key] as Array<Record<string, unknown>>));
                    break;
                  }
                }
              }
            }
          }
        }

        sendEvent({ 
          type: "PHASE", 
          phase: "analyzing", 
          message: `Analyzing ${allListings.length} listings with Gemini...` 
        });

        // Phase 3: Analyze with Gemini to find deals
        if (allListings.length > 0) {
          const analyzePrompt = `Analyze these HDB listings: ${JSON.stringify(allListings.slice(0, 50))}

Based on typical market prices for ${town} ${flatType} flats in Singapore, identify which listings are underpriced by ${discountThreshold}% or more. 

For reference, typical ${flatType} HDB prices in ${town}:
- 3-room: $280,000 - $400,000
- 4-room: $400,000 - $600,000  
- 5-room: $550,000 - $800,000
- Executive: $650,000 - $950,000

For each potentially underpriced unit, calculate:
1. Estimated market value based on location, size, floor
2. Discount percentage from market value

Return ONLY a JSON array of underpriced listings:
[
  {
    "address": "Full address",
    "block": "Block number",
    "street": "Street name",
    "town": "${town}",
    "flatType": "${flatType}",
    "floorLevel": "Floor range",
    "sqft": "Size in sqft",
    "askingPrice": 450000,
    "marketValue": 550000,
    "discountPercent": 18.2,
    "timePosted": "When posted",
    "agentName": "Agent name",
    "agentPhone": "Phone number",
    "listingUrl": "URL",
    "reasoning": "Brief reason why this is underpriced"
  }
]

If no listings meet the ${discountThreshold}% discount threshold, return an empty array [].`;

          try {
            const analysisResponse = await callGemini(analyzePrompt);
            const jsonMatch = analysisResponse.match(/\[[\s\S]*\]/);
            
            if (jsonMatch) {
              const deals = JSON.parse(jsonMatch[0]);
              sendEvent({ type: "DEALS_FOUND", deals });
              sendEvent({ type: "COMPLETE", dealCount: deals.length });
            } else {
              sendEvent({ type: "DEALS_FOUND", deals: [] });
              sendEvent({ type: "COMPLETE", dealCount: 0 });
            }
          } catch {
            // If Gemini analysis fails, return raw listings as potential deals
            const rawDeals = allListings.slice(0, 10).map(l => ({
              address: l.address || "Unknown",
              town: l.town || town,
              flatType: l.flatType || flatType,
              askingPrice: parseInt(String(l.askingPrice || l.price || "0").replace(/[^0-9]/g, "")) || 0,
              timePosted: l.timePosted || l.posted || "-",
              agentName: l.agentName || l.agent || "",
              agentPhone: l.agentPhone || l.phone || "",
            }));
            sendEvent({ type: "DEALS_FOUND", deals: rawDeals });
            sendEvent({ type: "COMPLETE", dealCount: rawDeals.length });
          }
        } else {
          sendEvent({ type: "DEALS_FOUND", deals: [] });
          sendEvent({ type: "COMPLETE", dealCount: 0 });
        }

        controller.close();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "ERROR", message })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
