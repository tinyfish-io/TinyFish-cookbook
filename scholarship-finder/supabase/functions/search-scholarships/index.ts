const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SearchParams {
  scholarshipType: string;
  university?: string;
  region?: string;
}

interface ScholarshipUrl {
  name: string;
  url: string;
  description: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const encoder = new TextEncoder();

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const { scholarshipType, university, region }: SearchParams = await req.json();
        const MINO_API_KEY = Deno.env.get("MINO_API_KEY");
        const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

        if (!MINO_API_KEY) {
          throw new Error("MINO_API_KEY not configured");
        }
        if (!LOVABLE_API_KEY) {
          throw new Error("LOVABLE_API_KEY not configured");
        }

        const today = new Date();
        const currentDate = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const currentYear = today.getFullYear();

        const locationContext = [
          university ? `at ${university}` : "",
          region ? `in ${region}` : "",
        ].filter(Boolean).join(" ");

        // STEP 1: Use Lovable AI to get scholarship URLs
        sendEvent({ 
          type: "STEP", 
          step: 1, 
          message: "Finding scholarship websites..." 
        });

        const aiPrompt = `Find 5-8 official scholarship provider websites for ${scholarshipType} scholarships ${locationContext}.

Return a JSON array of scholarship websites to search. Focus on:
- Official university financial aid pages
- Well-known scholarship foundations (Fulbright, Gates, Rhodes, etc.)
- Government scholarship programs
- Reputable scholarship aggregators

Return ONLY a JSON array like this:
[
  {
    "name": "MIT Financial Aid",
    "url": "https://sfs.mit.edu/undergraduate-students/",
    "description": "MIT's official financial aid office"
  }
]

Include diverse sources: university-specific, national programs, and international opportunities if applicable.
Make sure all URLs are real, official websites.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            messages: [
              { role: "system", content: "You are a scholarship research assistant. Return only valid JSON arrays." },
              { role: "user", content: aiPrompt },
            ],
            temperature: 0.7,
            max_tokens: 2000,
          }),
        });

        if (!aiResponse.ok) {
          throw new Error(`AI Gateway error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error("No content from AI");
        }

        // Parse the URLs from AI response
        let scholarshipUrls: ScholarshipUrl[];
        try {
          const cleanedContent = content.replace(/```json\n?|\n?```/g, "").trim();
          scholarshipUrls = JSON.parse(cleanedContent);
        } catch {
          throw new Error("Failed to parse scholarship URLs");
        }

        sendEvent({ 
          type: "URLS_FOUND", 
          urls: scholarshipUrls,
          message: `Found ${scholarshipUrls.length} scholarship sources to search`
        });

        // STEP 2: Run Mino agents in parallel
        sendEvent({ 
          type: "STEP", 
          step: 2, 
          message: `Launching ${scholarshipUrls.length} browser agents...` 
        });

        const goal = `You are searching for ${scholarshipType} scholarships ${locationContext}.

CURRENT DATE: ${currentDate}

For this scholarship provider, extract:
1. Scholarship name(s)
2. Award amounts
3. Application deadlines (MUST be after ${currentDate})
4. Eligibility requirements
5. How to apply / application link

Return a JSON object:
{
  "scholarships": [
    {
      "id": "unique-id",
      "name": "Scholarship Name",
      "provider": "Organization",
      "amount": "$X,XXX",
      "deadline": "Month Day, Year",
      "eligibility": ["Requirement 1", "Requirement 2"],
      "description": "Brief description",
      "applicationRequirements": ["Document 1", "Document 2"],
      "applicationLink": "https://...",
      "region": "${region || 'International'}",
      "university": "${university || 'Various'}",
      "type": "${scholarshipType}"
    }
  ]
}

Only include scholarships with deadlines AFTER ${currentDate}.`;

        // Start all Mino agents in parallel
        const agentPromises = scholarshipUrls.map(async (site, index) => {
          const agentId = `agent-${index}`;
          
          sendEvent({
            type: "AGENT_STARTED",
            agentId,
            siteName: site.name,
            siteUrl: site.url,
            description: site.description,
          });

          try {
            const minoResponse = await fetch("https://mino.ai/v1/automation/run-sse", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "X-API-Key": MINO_API_KEY,
              },
              body: JSON.stringify({
                url: site.url,
                goal: goal,
              }),
            });

            if (!minoResponse.ok) {
              throw new Error(`Mino error: ${minoResponse.status}`);
            }

            // Process SSE stream from Mino
            const reader = minoResponse.body?.getReader();
            if (!reader) throw new Error("No response body");

            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split("\n");
              buffer = lines.pop() || "";

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  const jsonStr = line.slice(6).trim();
                  if (!jsonStr || jsonStr === "[DONE]") continue;

                  try {
                    const data = JSON.parse(jsonStr);

                    // Forward streaming URL
                    if (data.type === "STREAMING_URL" && data.streamingUrl) {
                      sendEvent({
                        type: "AGENT_STREAMING",
                        agentId,
                        siteName: site.name,
                        streamingUrl: data.streamingUrl,
                      });
                    }

                    // Forward progress updates
                    if (data.type === "PROGRESS" && data.purpose) {
                      sendEvent({
                        type: "AGENT_PROGRESS",
                        agentId,
                        siteName: site.name,
                        message: data.purpose,
                      });
                    }

                    // Handle completion
                    if (data.type === "COMPLETE" && data.resultJson) {
                      const result = typeof data.resultJson === "string" 
                        ? JSON.parse(data.resultJson.replace(/```json\n?|\n?```/g, "").trim())
                        : data.resultJson;

                      sendEvent({
                        type: "AGENT_COMPLETE",
                        agentId,
                        siteName: site.name,
                        scholarships: result.scholarships || [],
                      });

                      return { agentId, site, scholarships: result.scholarships || [] };
                    }
                  } catch {
                    // Continue on parse error
                  }
                }
              }
            }

            return { agentId, site, scholarships: [] };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Agent failed";
            sendEvent({
              type: "AGENT_ERROR",
              agentId,
              siteName: site.name,
              error: errorMessage,
            });
            return { agentId, site, scholarships: [], error: errorMessage };
          }
        });

        // Wait for all agents to complete
        const results = await Promise.all(agentPromises);

        // Combine all scholarships
        const allScholarships = results.flatMap(r => r.scholarships || []);

        sendEvent({
          type: "ALL_COMPLETE",
          totalScholarships: allScholarships.length,
          scholarships: allScholarships,
          searchSummary: `Found ${allScholarships.length} scholarships from ${scholarshipUrls.length} sources.`,
        });

        controller.close();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Search failed";
        console.error("Error:", error);
        sendEvent({ type: "ERROR", error: errorMessage });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
});
